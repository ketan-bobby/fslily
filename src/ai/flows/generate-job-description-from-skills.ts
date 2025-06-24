'use server';
/**
 * @fileOverview Generates a job description from a list of skills.
 *
 * - generateJobDescriptionFromSkills - A function that generates a job description.
 * - GenerateJobDescriptionFromSkillsInput - The input type for the generateJobDescriptionFromSkills function.
 * - GenerateJobDescriptionFromSkillsOutput - The return type for the generateJobDescriptionFromSkills function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateJobDescriptionFromSkillsInputSchema = z.object({
  skills: z
    .array(z.string())
    .describe('A list of required skills for the job description.'),
  jobTitle: z.string().describe('The title of the job.'),
  companyName: z.string().describe('The name of the company.'),
  tone: z
    .enum(['formal', 'informal'])
    .default('informal')
    .describe('The tone of the job description.'),
});
export type GenerateJobDescriptionFromSkillsInput = z.infer<
  typeof GenerateJobDescriptionFromSkillsInputSchema
>;

const GenerateJobDescriptionFromSkillsOutputSchema = z.object({
  jobDescription: z.string().describe('The generated job description.'),
});
export type GenerateJobDescriptionFromSkillsOutput = z.infer<
  typeof GenerateJobDescriptionFromSkillsOutputSchema
>;

export async function generateJobDescriptionFromSkills(
  input: GenerateJobDescriptionFromSkillsInput
): Promise<GenerateJobDescriptionFromSkillsOutput> {
  return generateJobDescriptionFromSkillsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateJobDescriptionFromSkillsPrompt',
  input: {schema: GenerateJobDescriptionFromSkillsInputSchema},
  output: {schema: GenerateJobDescriptionFromSkillsOutputSchema},
  prompt: `You are an expert HR assistant who is good at writing job descriptions based on skills and other information provided.

  Based on the provided skills, job title, company name and tone, generate a job description.

  Skills: {{skills}}
  Job Title: {{jobTitle}}
  Company Name: {{companyName}}
  Tone: {{tone}}
  `,
});

const generateJobDescriptionFromSkillsFlow = ai.defineFlow(
  {
    name: 'generateJobDescriptionFromSkillsFlow',
    inputSchema: GenerateJobDescriptionFromSkillsInputSchema,
    outputSchema: GenerateJobDescriptionFromSkillsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
