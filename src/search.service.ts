import { TavilySearchResults } from '@langchain/community/tools/tavily_search';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SearchService {
  constructor(private readonly tavilySearch: TavilySearchResults) {}

  public async performSearch(query: string): Promise<any[]> {
    try {
      return JSON.parse(await this.tavilySearch.invoke(query));
    } catch (error) {
      console.error('Error searching for results:', error);
      return [];
    }
  }
}
