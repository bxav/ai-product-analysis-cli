import { Injectable } from '@nestjs/common';
import {
  StateGraph,
  MemorySaver,
  START,
  StateGraphArgs,
  END,
} from '@langchain/langgraph';
import { ExpertService } from './expert.service';
import { ProductAnalysisState } from './types';
import { AnalysisWritingService } from './analysis-writing.service';
import { OutlineService } from './outline.service';
import { Spinner } from 'cli-spinner';
import chalk from 'chalk';
import * as fs from 'fs';

@Injectable()
export class AIProductAnalysisService {
  constructor(
    private readonly expertService: ExpertService,
    private readonly analysisWritingService: AnalysisWritingService,
    private readonly outlineService: OutlineService,
  ) {}

  async executeProductAnalysis(
    product: string,
    threadId: string,
    outputFile?: string,
  ): Promise<string> {
    const spinner = new Spinner('Initializing analysis... %s');
    spinner.setSpinnerString('|/-\\');
    spinner.start();

    try {
      const workflow = this.createWorkflow();
      const app = workflow.compile({ checkpointer: new MemorySaver() });

      spinner.setSpinnerTitle('Generating outline... %s');
      const finalState = await app.invoke(
        { product },
        { configurable: { thread_id: threadId } },
      );

      spinner.stop(true);
      console.log(chalk.green('Analysis complete!'));

      const summary = this.generateSummary(finalState);
      const fullAnalysis = finalState.analysis;

      console.log('\n' + chalk.bold.green('Analysis Summary:'));
      console.log(summary);

      if (outputFile) {
        fs.writeFileSync(outputFile, fullAnalysis);
        console.log(chalk.cyan(`\nFull analysis saved to ${outputFile}`));
      }

      return fullAnalysis;
    } catch (error) {
      spinner.stop(true);
      console.error(chalk.red('Analysis failed'));
      console.error(chalk.red('Error during analysis:'), error.message);
      throw error;
    }
  }

  private generateSummary(state: ProductAnalysisState): string {
    const keyPoints = state.sections
      .map((section) => `- ${section.section_title}`)
      .join('\n');

    return `
${chalk.bold('Product:')} ${state.product}
${chalk.bold('Number of sections:')} ${state.sections.length}
${chalk.bold('Key points covered:')}
${keyPoints}
    `;
  }

  private createWorkflow() {
    return new StateGraph<ProductAnalysisState>({
      channels: this.createGraphState(),
    })
      .addNode('generate_outline', (state) =>
        this.outlineService.generateOutline(state),
      )
      .addNode('generate_experts', (state) =>
        this.expertService.generateExperts(state),
      )
      .addNode('conduct_interviews', (state) =>
        this.expertService.conductInterviews(state),
      )
      .addNode('refine_outline', (state) =>
        this.outlineService.refineOutline(state),
      )
      .addNode('write_sections', (state) =>
        this.analysisWritingService.writeSections(state),
      )
      .addNode('write_analysis', (state) =>
        this.analysisWritingService.writeAnalysis(state),
      )
      .addEdge(START, 'generate_outline')
      .addEdge('generate_outline', 'generate_experts')
      .addEdge('generate_experts', 'conduct_interviews')
      .addEdge('conduct_interviews', 'refine_outline')
      .addEdge('refine_outline', 'write_sections')
      .addEdge('write_sections', 'write_analysis')
      .addEdge('write_analysis', END);
  }

  private createGraphState(): StateGraphArgs<ProductAnalysisState>['channels'] {
    return {
      product: { value: (x, y) => y ?? x, default: () => '' },
      outline: {
        value: (x, y) => y ?? x,
        default: () => ({ product_name: '', sections: [] }),
      },
      experts: { value: (x, y) => y ?? x, default: () => [] },
      interview_results: { value: (x, y) => [...x, ...y], default: () => [] },
      sections: { value: (x, y) => [...x, ...y], default: () => [] },
      analysis: { value: (x, y) => y ?? x, default: () => '' },
    };
  }
}
