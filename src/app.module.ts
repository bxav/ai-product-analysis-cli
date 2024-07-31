import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AIProductAnalysisService } from './ai-product-analysis.service';
import { AnalyzeProductCommand } from './analyze-product.command';
import { TavilySearchResults } from '@langchain/community/tools/tavily_search';
import { SearchService } from './search.service';
import { ExpertService } from './expert.service';
import { LLMFactoryService } from './llm-factory.service';
import { AnalysisWritingService } from './analysis-writing.service';
import { OutlineService } from './outline.service';
import { LoggingService } from './logging.service';

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
