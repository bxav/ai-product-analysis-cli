import { Injectable } from '@nestjs/common';
import { LLMFactoryService } from './llm-factory.service';
import { ChatOpenAI } from '@langchain/openai';
import { delay } from './utils';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ProductAnalysisState } from './types';
import { LoggingService } from './logging.service';

@Injectable()
export class AnalysisWritingService {
  private readonly longContextLLM: ChatOpenAI;

  constructor(
    private readonly llmFactoryService: LLMFactoryService,
    private readonly loggingService: LoggingService,
  ) {
    this.longContextLLM = this.llmFactoryService.createLongContextLLM();
  }

  async writeSections(
    state: ProductAnalysisState,
  ): Promise<Partial<ProductAnalysisState>> {
    const sectionPrompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        'Write a section for an AI product analysis based on the provided outline and expert interviews.',
      ],
      [
        'user',
        'Product: {product}\nSection: {section}\nExpert interviews: {interviews}\n\nWrite the section content:',
      ],
    ]);
    const sectionChain = sectionPrompt.pipe(this.longContextLLM);

    this.loggingService.startSpinner('Writing analysis sections');
    const sections = await Promise.all(
      state.outline.sections.map(async (section) => {
        await delay(1000);
        this.loggingService.updateSpinner(
          `Writing section: ${section.section_title}`,
        );
        const content = await sectionChain.invoke({
          product: state.product,
          section: JSON.stringify(section),
          interviews: JSON.stringify(state.interview_results),
        });
        return {
          section_title: section.section_title,
          content: content.content as string,
        };
      }),
    );
    this.loggingService.stopSpinner('All sections written successfully');

    return { sections };
  }

  async writeAnalysis(
    state: ProductAnalysisState,
  ): Promise<Partial<ProductAnalysisState>> {
    const analysisPrompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        'You are writing a complete AI product analysis based on the provided sections. Follow a professional and detailed format. Use markdown formatting for headings and subheadings. Ensure each section has a unique title and relevant subsections.',
      ],
      [
        'user',
        'Product: {product}\n\nSections: {sections}\n\nWrite the complete analysis using proper markdown formatting:',
      ],
    ]);
    const analysisChain = analysisPrompt.pipe(this.longContextLLM);

    this.loggingService.startSpinner('Writing full analysis');
    await delay(1000);
    let analysis = await analysisChain.invoke({
      product: state.product,
      sections: JSON.stringify(state.sections),
    });

    let fullAnalysis = analysis.content as string;
    let metadata = analysis.response_metadata;

    while (metadata?.finish_reason === 'length') {
      this.loggingService.info(
        'Analysis truncated. Generating continuation...',
      );
      const continuation = await this.generateAnalysisContinuation(
        state.product,
        fullAnalysis,
      );
      fullAnalysis += '\n' + continuation;

      analysis = await this.longContextLLM.invoke(continuation);
      metadata = analysis.response_metadata;
    }

    this.loggingService.stopSpinner('Full analysis written successfully');

    return { analysis: fullAnalysis };
  }

  private async generateAnalysisContinuation(
    product: string,
    previousContent: string,
  ): Promise<string> {
    const continuationPrompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        'You are continuing an AI product analysis that was cut off due to length limitations. Pick up where the previous content left off and continue the analysis.',
      ],
      [
        'user',
        'Product: {product}\n\nPrevious content (ending mid-sentence or mid-paragraph):\n\n{previous_content}\n\nContinue the analysis:',
      ],
    ]);
    const continuationChain = continuationPrompt.pipe(this.longContextLLM);
    await delay(1000);
    const continuation = await continuationChain.invoke({
      product,
      previous_content: previousContent,
    });
    return continuation.content as string;
  }
}
