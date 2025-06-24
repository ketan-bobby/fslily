// Analyze sentiment of candidate communications.

'use server';

/**
 * @fileOverview A flow for analyzing the sentiment of candidate email communication.
 *
 * - analyzeCandidateSentiment - A function that analyzes candidate sentiment.
 * - AnalyzeCandidateSentimentInput - The input type for the analyzeCandidateSentiment function.
 * - AnalyzeCandidateSentimentOutput - The return type for the analyzeCandidateSentiment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeCandidateSentimentInputSchema = z.object({
  emailCommunications: z
    .string()
    .describe('The email communications with the candidate.'),
});
export type AnalyzeCandidateSentimentInput = z.infer<
  typeof AnalyzeCandidateSentimentInputSchema
>;

const AnalyzeCandidateSentimentOutputSchema = z.object({
  sentimentSummary: z
    .string()
    .describe('A summary of the sentiment of the candidate.'),
});
export type AnalyzeCandidateSentimentOutput = z.infer<
  typeof AnalyzeCandidateSentimentOutputSchema
>;

export async function analyzeCandidateSentiment(
  input: AnalyzeCandidateSentimentInput
): Promise<AnalyzeCandidateSentimentOutput> {
  return analyzeCandidateSentimentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeCandidateSentimentPrompt',
  input: {schema: AnalyzeCandidateSentimentInputSchema},
  output: {schema: AnalyzeCandidateSentimentOutputSchema},
  prompt: `You are an expert recruiter specializing in analyzing candidate sentiment based on email communications.

You will use the following email communications to summarize the sentiment of the candidate.

Email Communications: {{{emailCommunications}}}

Summarize the sentiment of the candidate in a short paragraph.`,
});

const analyzeCandidateSentimentFlow = ai.defineFlow(
  {
    name: 'analyzeCandidateSentimentFlow',
    inputSchema: AnalyzeCandidateSentimentInputSchema,
    outputSchema: AnalyzeCandidateSentimentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
