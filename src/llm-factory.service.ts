import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';

@Injectable()
export class LLMFactoryService {
  constructor(private configService: ConfigService) {}

  createFastLLM(): ChatOpenAI {
    return new ChatOpenAI({
      temperature: 0,
      model: 'gpt-35-turbo',
      //openAIApiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  createLongContextLLM(): ChatOpenAI {
    return new ChatOpenAI({
      temperature: 0,
      model: 'gpt-4o',
      //openAIApiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }
}