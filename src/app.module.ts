import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TavilySearchResults } from '@langchain/community/tools/tavily_search';

import { AIProductAnalysisService } from './services/ai-product-analysis.service';
import { AnalyzeProductCommand } from './commands/analyze-product.command';
import { SearchService } from './services/search.service';
import { ExpertService } from './services/expert.service';
import { LLMFactoryService } from './services/llm-factory.service';
import { AnalysisWritingService } from './services/analysis-writing.service';
import { OutlineService } from './services/outline.service';
import { LoggingService } from './services/logging.service';

@Module({
  imports: [ConfigModule.forRoot()],
  providers: [
    LLMFactoryService,
    {
      provide: TavilySearchResults,
      useFactory: (configService: ConfigService) => {
        return new TavilySearchResults({
          apiKey: configService.get<string>('TAVILY_API_KEY'),
          maxResults: 3,
        });
      },
      inject: [ConfigService],
    },
    ExpertService,
    OutlineService,
    AnalysisWritingService,
    AIProductAnalysisService,
    SearchService,
    AnalyzeProductCommand,
    LoggingService,
  ],
})
export class AppModule {}
