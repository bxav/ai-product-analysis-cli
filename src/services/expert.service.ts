import { ChatOpenAI } from '@langchain/openai';
import { Injectable } from '@nestjs/common';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { END, START, StateGraph, StateGraphArgs } from '@langchain/langgraph';

import {
  Expert,
  groupExpertSchema,
  InterviewState,
  ProductAnalysisState,
} from '../types';
import { delay } from '../utils';
import { SearchService } from './search.service';
import { LLMFactoryService } from './llm-factory.service';
import { LoggingService } from './logging.service';

@Injectable()
export class ExpertService {
  private readonly fastLLM: ChatOpenAI;
  private readonly longContextLLM: ChatOpenAI;

  constructor(
    private readonly llmFactoryService: LLMFactoryService,
    private readonly search: SearchService,
    private readonly loggingService: LoggingService,
  ) {
    this.fastLLM = this.llmFactoryService.createFastLLM();
    this.longContextLLM = this.llmFactoryService.createLongContextLLM();
  }

  async generateExperts(
    state: ProductAnalysisState,
  ): Promise<Partial<ProductAnalysisState>> {
    const expertPrompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        'Create a diverse group of expert personas to contribute to an AI product analysis. Each persona should have a unique perspective on the product.',
      ],
      [
        'user',
        'Product: {product}\n\nGenerate 4-5 expert personas, each with a name, expertise, role, and brief description of their focus:',
      ],
    ]);

    this.loggingService.startSpinner('Generating expert personas');
    const expertChain = expertPrompt.pipe(
      this.longContextLLM.withStructuredOutput(groupExpertSchema),
    );
    const experts = await expertChain.invoke({ product: state.product });
    this.loggingService.stopSpinner('Expert personas generated successfully');
    return { experts: experts.experts };
  }

  async conductInterviews(
    state: ProductAnalysisState,
  ): Promise<Partial<ProductAnalysisState>> {
    const interviewGraph = this.createInterviewGraph();
    this.loggingService.startSpinner('Conducting expert interviews');
    const interviewResults = await Promise.all(
      state.experts.map((expert) => {
        return this.conductSingleInterview(
          state.product,
          expert,
          interviewGraph,
        );
      }),
    );
    this.loggingService.stopSpinner(
      'All expert interviews completed successfully',
    );
    return { interview_results: interviewResults };
  }

  private async conductSingleInterview(
    product: string,
    expert: Expert,
    interviewGraph: ReturnType<typeof this.createInterviewGraph>,
  ) {
    const initialState: InterviewState = {
      messages: [
        new HumanMessage(
          `Let's discuss the AI product: ${product}. What aspects would you like to analyze?`,
        ),
      ],
      references: {},
      expert,
    };
    const finalState = await interviewGraph.invoke(initialState);
    return {
      messages: finalState.messages,
      references: finalState.references,
    };
  }

  private createInterviewGraph() {
    const interviewGraphState: StateGraphArgs<InterviewState>['channels'] = {
      messages: { value: (x, y) => x.concat(y), default: () => [] },
      references: { value: (x, y) => ({ ...x, ...y }), default: () => ({}) },
      expert: { value: (x, y) => y ?? x, default: () => ({}) as Expert },
    };

    return new StateGraph<InterviewState>({ channels: interviewGraphState })
      .addNode('ask_question', this.generateQuestion.bind(this))
      .addNode('answer_question', this.generateAnswer.bind(this))
      .addEdge(START, 'ask_question')
      .addConditionalEdges('ask_question', this.shouldContinue.bind(this), {
        continue: 'answer_question',
        end: END,
      })
      .addEdge('answer_question', 'ask_question')
      .compile();
  }

  private async generateQuestion(
    state: InterviewState,
  ): Promise<Partial<InterviewState>> {
    const questionPrompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        `You are an AI product analyst with a specific focus. Your persona is:
        Name: {name}
        Role: {role}
        Expertise: {expertise}
        Description: {description}

        Ask a question to gather information for your AI product analysis. Be specific and relevant to your expertise.`,
      ],
      [
        'human',
        'Previous conversation:\n{conversation}\n\nAsk your next question:',
      ],
    ]);

    const questionChain = questionPrompt.pipe(this.fastLLM);
    await delay(1000);
    const response = await questionChain.invoke({
      ...state.expert,
      conversation: state.messages
        .map((m) => `${m._getType()}: ${m.content}`)
        .join('\n'),
    });

    return { messages: [new AIMessage(response.content as string)] };
  }

  private async generateAnswer(
    state: InterviewState,
  ): Promise<Partial<InterviewState>> {
    const lastQuestion = state.messages[state.messages.length - 1]
      .content as string;
    const searchResults = await this.search.performSearch(lastQuestion);
    const formattedResults = this.formatSearchResults(searchResults);

    const answerPrompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        'You are an expert answering questions for an AI product analyst. Use the provided search results to inform your answer. Provide informative and accurate answers, including relevant citations where possible. Use the format [1], [2], etc. for citations, referring to the numbered search results.',
      ],
      [
        'human',
        'Conversation so far:\n{conversation}\n\nSearch results:\n{search_results}\n\nAnswer the last question:',
      ],
    ]);

    const answerChain = answerPrompt.pipe(this.longContextLLM);
    await delay(1000);
    const response = await answerChain.invoke({
      conversation: state.messages
        .map((m) => `${m._getType()}: ${m.content}`)
        .join('\n'),
      search_results: formattedResults,
    });

    const newReferences = this.createReferences(searchResults);

    return {
      messages: [new AIMessage(response.content as string)],
      references: newReferences,
    };
  }

  private createReferences(results: any[]): Record<string, string> {
    return results.reduce((acc, result, index) => {
      acc[result.url] = `[${index + 1}] ${result.title}`;
      return acc;
    }, {});
  }

  private formatSearchResults(results: any[]): string {
    if (results.length === 0) {
      return 'No search results available.';
    }
    return results
      .map(
        (result, index) =>
          `[${index + 1}] ${result.title}\n${result.content}\nURL: ${result.url}`,
      )
      .join('\n\n');
  }

  private shouldContinue(state: InterviewState): 'continue' | 'end' {
    const lastMessage = state.messages[state.messages.length - 1];
    return (lastMessage.content as string)
      .toLowerCase()
      .includes('thank you') || state.messages.length >= 10
      ? 'end'
      : 'continue';
  }
}
