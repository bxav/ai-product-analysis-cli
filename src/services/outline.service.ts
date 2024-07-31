import { Injectable } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';

import { LLMFactoryService } from '../services/llm-factory.service';
import { delay } from '../utils';
import { ProductAnalysisState, productOutlineSchema } from '../types';
import { LoggingService } from './logging.service';

@Injectable()
export class OutlineService {
  private readonly fastLLM: ChatOpenAI;
  private readonly longContextLLM: ChatOpenAI;

  constructor(
    private readonly llmFactoryService: LLMFactoryService,
    private readonly loggingService: LoggingService,
  ) {
    this.fastLLM = this.llmFactoryService.createFastLLM();
    this.longContextLLM = this.llmFactoryService.createLongContextLLM();
  }

  async generateOutline(
    state: ProductAnalysisState,
  ): Promise<Partial<ProductAnalysisState>> {
    const outlinePrompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        'You are an AI product analyst. Write an outline for a detailed analysis of an AI product. Be comprehensive and specific.',
      ],
      ['user', '{product}'],
    ]);

    this.loggingService.startSpinner('Generating initial outline');
    const outlineChain = outlinePrompt.pipe(
      this.fastLLM.withStructuredOutput(productOutlineSchema),
    );
    const outline = await outlineChain.invoke({ product: state.product });
    this.loggingService.stopSpinner('Initial outline generated successfully');
    return { outline };
  }

  async refineOutline(
    state: ProductAnalysisState,
  ): Promise<Partial<ProductAnalysisState>> {
    const refinePrompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        'You are refining the outline of an AI product analysis based on expert interviews. Make the outline comprehensive and specific.',
      ],
      [
        'user',
        'Original outline: {original_outline}\n\nExpert interviews: {interviews}\n\nRefine the outline:',
      ],
    ]);
    const refineChain = refinePrompt.pipe(
      this.longContextLLM.withStructuredOutput(productOutlineSchema),
    );
    this.loggingService.startSpinner(
      'Refining outline based on expert interviews',
    );
    await delay(1000);
    const refinedOutline = await refineChain.invoke({
      original_outline: JSON.stringify(state.outline),
      interviews: JSON.stringify(state.interview_results),
    });
    this.loggingService.stopSpinner('Outline refined successfully');
    return { outline: refinedOutline };
  }
}
