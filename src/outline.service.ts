import { Injectable } from '@nestjs/common';
import { LLMFactoryService } from './llm-factory.service';
import { ChatOpenAI } from '@langchain/openai';
import { delay } from './utils';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ProductAnalysisState, productOutlineSchema } from './types';

@Injectable()
export class OutlineService {
  private readonly fastLLM: ChatOpenAI;
  private readonly longContextLLM: ChatOpenAI;

  constructor(private readonly llmFactoryService: LLMFactoryService) {
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

    const outlineChain = outlinePrompt.pipe(
      this.fastLLM.withStructuredOutput(productOutlineSchema),
    );
    const outline = await outlineChain.invoke({ product: state.product });
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
    await delay(1000);
    const refinedOutline = await refineChain.invoke({
      original_outline: JSON.stringify(state.outline),
      interviews: JSON.stringify(state.interview_results),
    });
    return { outline: refinedOutline };
  }
}
