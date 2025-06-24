// Summarize sentiment of candidate communications.

'use server';

/**
 * @fileOverview A flow for summarizing the sentiment of candidate email communication.
 *
 * - summarizeCandidateSentiment - A function that summarizes candidate sentiment.
 * - SummarizeCandidateSentimentInput - The input type for the summarizeCandidateSentiment function.
 * - SummarizeCandidateSentimentOutput - The return type for the summarizeCandidateSentiment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeCandidateSentimentInputSchema = z.object({
  emailCommunications: z
    .string()
    .describe('The email communications with the candidate.'),
});
export type SummarizeCandidateSentimentInput = z.infer<
  typeof SummarizeCandidateSentimentInputSchema
>;

const SummarizeCandidateSentimentOutputSchema = z.object({
  sentimentSummary: z
    .string()
    .describe('A summary of the sentiment of the candidate.'),
});
export type SummarizeCandidateSentimentOutput = z.infer<
  typeof SummarizeCandidateSentimentOutputSchema
>;

export async function summarizeCandidateSentiment(
  input: SummarizeCandidateSentimentInput
): Promise<SummarizeCandidateSentimentOutput> {
  return summarizeCandidateSentimentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeCandidateSentimentPrompt',
  input: {schema: SummarizeCandidateSentimentInputSchema},
  output: {schema: SummarizeCandidateSentimentOutputSchema},
  prompt: `You are an expert recruiter specializing in analyzing candidate sentiment based on email communications.

You will use the following email communications to summarize the sentiment of the candidate.

Email Communications: {{{emailCommunications}}}

Summarize the sentiment of the candidate in a short paragraph.`,
});

const summarizeCandidateSentimentFlow = ai.defineFlow(
  {
    name: 'summarizeCandidateSentimentFlow',
    inputSchema: SummarizeCandidateSentimentInputSchema,
    outputSchema: SummarizeCandidateSentimentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
