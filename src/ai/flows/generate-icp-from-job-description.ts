'use server';
/**
 * @fileOverview Generates an Ideal Candidate Profile (ICP) from a job description.
 *
 * - generateICPFromJobDescription - A function that generates ICP fields from a job description.
 * - GenerateICPFromJobDescriptionInput - The input type for the function.
 * - GenerateICPFromJobDescriptionOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateICPFromJobDescriptionInputSchema = z.object({
  jobDescription: z.string().describe('The full text of the job description.'),
  jobTitle: z.string().optional().describe('The job title (optional, for better context).'),
});
export type GenerateICPFromJobDescriptionInput = z.infer<typeof GenerateICPFromJobDescriptionInputSchema>;

const GenerateICPFromJobDescriptionOutputSchema = z.object({
  profileName: z.string().describe('A suggested profile name, e.g., "AI-Generated Profile for [Job Title]".'),
  jobTitle: z.string().describe('The job title, extracted or based on input.'),
  keySkills: z.array(z.string()).describe('A list of key skills extracted or inferred from the job description. Aim for 5-10 core skills.'),
  experienceLevel: z.string().describe('The inferred experience level (e.g., "Entry-Level", "Mid-Level (3-5 years)", "Senior (5-7 years)", "Lead/Principal (7+ years)"). Be specific.'),
  educationRequirements: z.string().describe('The inferred or extracted education requirements (e.g., "Bachelor\'s in Computer Science or related field", "Master\'s degree preferred").'),
  locationPreferences: z.string().describe('The inferred or extracted location preferences (e.g., "Remote (US)", "On-site in New York, NY", "Hybrid - London").'),
  companyBackground: z.string().optional().describe('Brief notes on preferred company background if inferable (e.g., "Experience in fast-paced startups", "Background in enterprise software").'),
  culturalFitNotes: z.string().describe('Brief notes on cultural fit aspects inferred from the job description (e.g., "Collaborative team player", "Proactive and results-oriented", "Comfortable with ambiguity").'),
});
export type GenerateICPFromJobDescriptionOutput = z.infer<typeof GenerateICPFromJobDescriptionOutputSchema>;

export async function generateICPFromJobDescription(
  input: GenerateICPFromJobDescriptionInput
): Promise<GenerateICPFromJobDescriptionOutput> {
  return generateICPFromJobDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateICPFromJobDescriptionPrompt',
  input: {schema: GenerateICPFromJobDescriptionInputSchema},
  output: {schema: GenerateICPFromJobDescriptionOutputSchema},
  prompt: `You are an expert HR and Talent Acquisition specialist, skilled in crafting Ideal Candidate Profiles (ICPs) from job descriptions.
Given the following job description{{#if jobTitle}} for the role of "{{jobTitle}}"{{/if}}:

Job Description:
{{{jobDescription}}}

Analyze the job description thoroughly and generate the components for an Ideal Candidate Profile.

Your output MUST strictly follow the JSON schema defined in 'output.schema'.

Instructions for each field:
- \`profileName\`: Create a descriptive profile name. If a job title was provided, use it in the name like "AI-Generated Profile for [Job Title]". Otherwise, use "AI-Generated Profile".
- \`jobTitle\`: Extract the job title. If a job title was provided in the input, use that. Otherwise, infer it from the job description.
- \`keySkills\`: Identify and list 5-10 of the most critical technical and soft skills.
- \`experienceLevel\`: Infer the required years of experience or general level (e.g., "Entry-Level", "Mid-Level (3-5 years)", "Senior (5+ years)"). If specific years are mentioned, use that. If not, make a reasonable inference based on seniority cues in the description.
- \`educationRequirements\`: Extract or infer the minimum or preferred educational qualifications.
- \`locationPreferences\`: Extract or infer location requirements (e.g., "Remote", "On-site in [City, State]", "Hybrid").
- \`companyBackground\`: (Optional) If the job description hints at preferred previous company types or industries (e.g., "startup experience," "enterprise software background"), briefly note it. Otherwise, you can omit this or state "Not specified".
- \`culturalFitNotes\`: Infer 2-3 key cultural attributes or soft skills emphasized in the job description (e.g., "team-oriented," "fast-paced environment," "strong problem-solver").

Be precise and base your output solely on the provided job description.
Ensure the output is valid JSON matching the schema.
`,
});

const generateICPFromJobDescriptionFlow = ai.defineFlow(
  {
    name: 'generateICPFromJobDescriptionFlow',
    inputSchema: GenerateICPFromJobDescriptionInputSchema,
    outputSchema: GenerateICPFromJobDescriptionOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
        throw new Error("AI did not produce an output for ICP generation.");
    }
    return output;
  }
);
