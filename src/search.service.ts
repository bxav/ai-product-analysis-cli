import { TavilySearchResults } from '@langchain/community/tools/tavily_search';
import { Injectable } from '@nestjs/common';
import { LoggingService } from './logging.service';

@Injectable()
export class SearchService {
  constructor(
    private readonly tavilySearch: TavilySearchResults,
    private readonly loggingService: LoggingService,
  ) {}

  public async performSearch(query: string): Promise<any[]> {
    try {
      return JSON.parse(await this.tavilySearch.invoke(query));
    } catch (error) {
      this.loggingService.warn(
        `Search failed for query: "${query}". Error: ${error.message}`,
      );
      return [];
    }
  }
}
