import { Command, CommandRunner, Option } from 'nest-commander';
import { AIProductAnalysisService } from './ai-product-analysis.service';

@Command({ name: 'analyze', description: 'Analyze an AI product' })
export class AnalyzeProductCommand extends CommandRunner {
  constructor(private readonly analysisService: AIProductAnalysisService) {
    super();
  }

  async run(
    passedParams: string[],
    options?: Record<string, any>
  ): Promise<void> {
    const product = passedParams[0];
    const threadId = options?.threadId || Date.now().toString();

    if (!product) {
      console.error('Please provide an AI product name to analyze.');
      return;
    }

    console.log(`Analyzing AI product: ${product}`);
    console.log('This may take a few minutes...');

    try {
      const analysis = await this.analysisService.executeProductAnalysis(product, threadId);
      console.log('\nAnalysis complete:');
      console.log(analysis);
    } catch (error) {
      console.error('An error occurred during analysis:', error.message);
    }
  }

  @Option({
    flags: '-t, --thread-id [threadId]',
    description: 'Specify a thread ID for the analysis',
  })
  parseThreadId(val: string): string {
    return val;
  }
}