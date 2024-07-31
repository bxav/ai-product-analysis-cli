import { Command, CommandRunner, Option } from 'nest-commander';

import { AIProductAnalysisService } from '../services/ai-product-analysis.service';
import { LoggingService } from '../services/logging.service';

@Command({ name: 'analyze', description: 'Analyze an AI product' })
export class AnalyzeProductCommand extends CommandRunner {
  constructor(
    private readonly analysisService: AIProductAnalysisService,
    private readonly loggingService: LoggingService,
  ) {
    super();
  }

  async run(
    passedParams: string[],
    options?: Record<string, any>,
  ): Promise<void> {
    if (passedParams.length === 0) {
      this.loggingService.error(
        'Error: Please provide a product name to analyze.',
      );
      return;
    }

    const product = passedParams[0];
    const outputFile = options?.output;

    try {
      this.loggingService.info(`Starting analysis for: ${product}`);
      const analysis = await this.analysisService.executeProductAnalysis(
        product,
        'thread-id',
        outputFile,
      );

      if (!outputFile) {
        this.loggingService.info('\nFull Analysis:');
        this.loggingService.log(analysis);
      }
    } catch (error) {
      this.loggingService.error('Analysis process encountered errors');
      this.loggingService.error(`Error details: ${error.message}`);
      this.loggingService.warn(
        'The analysis may be incomplete or contain errors.',
      );
      if (outputFile) {
        this.loggingService.info(
          `Check ${outputFile} for any partial results.`,
        );
      }
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
