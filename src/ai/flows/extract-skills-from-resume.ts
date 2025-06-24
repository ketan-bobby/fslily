
// src/ai/flows/extract-skills-from-resume.ts
'use server';
/**
 * @fileOverview Extracts skills from a resume using Genkit and Gemini.
 *
 * - extractSkillsFromResume - A function that extracts skills from a resume.
 * - ExtractSkillsFromResumeInput - The input type for the extractSkillsFromResume function.
 * - ExtractSkillsFromResumeOutput - The return type for the extractSkillsFromResume function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractSkillsFromResumeInputSchema = z.object({
  resumeDataUri: z
    .string()
    .describe(
      "The resume as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractSkillsFromResumeInput = z.infer<typeof ExtractSkillsFromResumeInputSchema>;

const ExtractSkillsFromResumeOutputSchema = z.object({
  skills: z
    .array(z.string())
    .describe('A list of skills extracted from the resume.'),
});
export type ExtractSkillsFromResumeOutput = z.infer<typeof ExtractSkillsFromResumeOutputSchema>;

export async function extractSkillsFromResume(
  input: ExtractSkillsFromResumeInput
): Promise<ExtractSkillsFromResumeOutput> {
  return extractSkillsFromResumeFlow(input);
}

const extractSkillsFromResumePrompt = ai.definePrompt({
  name: 'extractSkillsFromResumePrompt',
  input: {schema: ExtractSkillsFromResumeInputSchema},
  output: {schema: ExtractSkillsFromResumeOutputSchema},
  prompt: `You are a resume parsing expert. Please extract the skills from the resume.

Resume:
{{media url=resumeDataUri}}`,
});

const extractSkillsFromResumeFlow = ai.defineFlow(
  {
    name: 'extractSkillsFromResumeFlow',
    inputSchema: ExtractSkillsFromResumeInputSchema,
    outputSchema: ExtractSkillsFromResumeOutputSchema,
  },
  async input => {
    const {output} = await extractSkillsFromResumePrompt(input);
    return output!;
  }
);
