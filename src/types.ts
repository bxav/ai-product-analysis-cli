import { z } from 'zod';
import { BaseMessage } from '@langchain/core/messages';

// Schema definitions
export const productOutlineSchema = z.object({
  product_name: z.string().describe('The name of the AI product.'),
  sections: z
    .array(
      z.object({
        section_title: z.string().describe('The title of the section.'),
        description: z.string().describe('The description of the section.'),
      }),
    )
    .describe('Sections of the AI product analysis.'),
});

export const expertSchema = z.object({
  expertise: z.string().describe('The area of expertise.'),
  name: z.string().describe('The name of the expert.'),
  role: z.string().describe('The role of the expert.'),
  description: z.string().describe('The description of the expert.'),
});

export const groupExpertSchema = z.object({
  experts: z.array(expertSchema).describe('List of expert personas.'),
});

// Type definitions
export type ProductOutline = z.infer<typeof productOutlineSchema>;
export type Expert = z.infer<typeof expertSchema>;

export interface InterviewState {
  messages: BaseMessage[];
  references: Record<string, string>;
  expert: Expert;
}

export interface ProductAnalysisState {
  product: string;
  outline: ProductOutline;
  experts: Expert[];
  interview_results: Array<{
    messages: BaseMessage[];
    references: Record<string, string>;
  }>;
  sections: Array<{ section_title: string; content: string }>;
  analysis: string;
}