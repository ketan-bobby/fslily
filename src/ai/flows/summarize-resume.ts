
// src/ai/flows/summarize-resume.ts
'use server';

/**
 * @fileOverview Summarizes a resume to quickly assess a candidate's qualifications.
 * 
 * - summarizeResume - A function that summarizes a resume.
 * - SummarizeResumeInput - The input type for the summarizeResume function.
 * - SummarizeResumeOutput - The return type for the summarizeResume function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeResumeInputSchema = z.object({
  resumeDataUri: z
    .string()
    .describe(
      "The resume as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type SummarizeResumeInput = z.infer<typeof SummarizeResumeInputSchema>;

const SummarizeResumeOutputSchema = z.object({
  summary: z.string().describe('A summary of the candidate\'s skills and experience.'),
});
export type SummarizeResumeOutput = z.infer<typeof SummarizeResumeOutputSchema>;

export async function summarizeResume(
  input: SummarizeResumeInput
): Promise<SummarizeResumeOutput> {
  return summarizeResumeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeResumePrompt',
  input: {schema: SummarizeResumeInputSchema},
  output: {schema: SummarizeResumeOutputSchema},
  prompt: `You are an expert resume summarizer. Please provide a concise summary of the candidate's skills and experience based on the resume content.

Resume:
{{media url=resumeDataUri}}`,
});

const summarizeResumeFlow = ai.defineFlow(
  {
    name: 'summarizeResumeFlow',
    inputSchema: SummarizeResumeInputSchema,
    outputSchema: SummarizeResumeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
