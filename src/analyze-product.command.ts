import { Command, CommandRunner, Option } from 'nest-commander';
import { AIProductAnalysisService } from './ai-product-analysis.service';
import chalk from 'chalk';

@Command({ name: 'analyze', description: 'Analyze an AI product' })
export class AnalyzeProductCommand extends CommandRunner {
  constructor(private readonly analysisService: AIProductAnalysisService) {
    super();
  }

  async run(
    passedParams: string[],
    options?: Record<string, any>,
  ): Promise<void> {
    if (passedParams.length === 0) {
      console.error(chalk.red('Error: Please provide a product name to analyze.'));
      return;
    }

    const product = passedParams[0];
    const outputFile = options?.output;

    try {
      console.log(chalk.cyan(`Starting analysis for: ${product}`));
      const analysis = await this.analysisService.executeProductAnalysis(product, 'thread-id', outputFile);
      
      if (!outputFile) {
        console.log('\n' + chalk.bold.green('Full Analysis:'));
        console.log(analysis);
      }
    } catch (error) {
      console.error(chalk.red('Error during analysis:'), error.message);
    }
  }

  @Option({
    flags: '-o, --output <outputFile>',
    description: 'Specify an output file for the full analysis',
  })
  parseOutput(val: string) {
    return val;
  }
}