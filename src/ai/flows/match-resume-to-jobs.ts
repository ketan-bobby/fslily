
'use server';
/**
 * @fileOverview Matches a candidate's resume to open job requisitions.
 *
 * - matchResumeToJobs - A function that finds suitable jobs for a candidate based on their resume.
 * - MatchResumeToJobsInput - The input type for the matchResumeToJobs function.
 * - MatchResumeToJobsOutput - The return type for the matchResumeToJobs function.
 * - JobRequisitionInput - A type for the job requisitions to be passed to the flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const JobRequisitionInputSchema = z.object({
  id: z.string().describe('The unique identifier for the job requisition.'),
  title: z.string().describe('The title of the job.'),
  description: z.string().describe('The description of the job.'),
  skillsRequired: z.array(z.string()).describe('A list of skills required for the job.'),
});
export type JobRequisitionInput = z.infer<typeof JobRequisitionInputSchema>;

const MatchResumeToJobsInputSchema = z.object({
  resumeDataUri: z
    .string()
    .describe(
      "The resume as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  openJobRequisitions: z
    .array(JobRequisitionInputSchema)
    .describe('A list of open job requisitions with their details.'),
});
export type MatchResumeToJobsInput = z.infer<typeof MatchResumeToJobsInputSchema>;

const JobMatchSchema = z.object({
  jobId: z.string().describe('The ID of the matched job requisition.'),
  jobTitle: z.string().describe('The title of the matched job requisition.'),
  matchScore: z
    .number()
    .min(0)
    .max(100)
    .describe('A score from 0 to 100 indicating the strength of the match.'),
  matchReasoning: z
    .string()
    .describe('A brief explanation (1-2 sentences) for the match.'),
});
export type JobMatch = z.infer<typeof JobMatchSchema>;

const MatchResumeToJobsOutputSchema = z.object({
  matches: z.array(JobMatchSchema).describe('A list of job requisitions that are a potential match for the candidate, along with scores and reasoning. Prioritize strong matches (score >= 60).'),
});
export type MatchResumeToJobsOutput = z.infer<typeof MatchResumeToJobsOutputSchema>;


export async function matchResumeToJobs(
  input: MatchResumeToJobsInput
): Promise<MatchResumeToJobsOutput> {
  if (input.openJobRequisitions.length === 0) {
    return { matches: [] };
  }
  return matchResumeToJobsFlow(input);
}

const matchResumeToJobsPrompt = ai.definePrompt({
  name: 'matchResumeToJobsPrompt',
  input: {schema: MatchResumeToJobsInputSchema},
  output: {schema: MatchResumeToJobsOutputSchema},
  prompt: `You are an expert HR assistant responsible for matching candidates to open job requisitions based on their resumes.
Analyze the provided resume against the list of open job requisitions. For each job, determine if the candidate is a potential fit.

Resume:
{{media url=resumeDataUri}}

Open Job Requisitions:
{{#if openJobRequisitions}}
{{#each openJobRequisitions}}
Job ID: {{this.id}}
Job Title: {{this.title}}
Description: {{{this.description}}}
Required Skills: {{#if this.skillsRequired}}{{#each this.skillsRequired}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}Not specified{{/if}}
---
{{/each}}
{{else}}
No open job requisitions provided.
{{/if}}

Based on the resume and the job requisitions, identify potential job matches. For each job you identify as a strong potential match (match score of 60 or higher out of 100), provide the following in the 'matches' array:
- jobId: The ID of the matched job requisition.
- jobTitle: The title of the matched job requisition.
- matchScore: A numerical match score from 0 to 100, where 100 is a perfect match. Be realistic and critical in your scoring.
- matchReasoning: A brief (1-2 sentences) explanation of why the candidate is a good fit for that specific job, considering their skills and experience in relation to the job's requirements.

If the candidate is not a good fit for any of the provided jobs or if no job requisitions were provided, return an empty 'matches' array.
Only include matches with a score of 60 or higher.
`,
});

const matchResumeToJobsFlow = ai.defineFlow(
  {
    name: 'matchResumeToJobsFlow',
    inputSchema: MatchResumeToJobsInputSchema,
    outputSchema: MatchResumeToJobsOutputSchema,
  },
  async (input) => {
    if (input.openJobRequisitions.length === 0) {
      return { matches: [] };
    }
    const {output} = await matchResumeToJobsPrompt(input);
    return output || { matches: [] };
  }
);
