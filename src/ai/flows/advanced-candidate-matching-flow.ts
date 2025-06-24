
'use server';
/**
 * @fileOverview Performs advanced, multi-dimensional AI-powered candidate scoring and analysis.
 *
 * - advancedCandidateMatching - A function that analyzes a candidate against job requirements.
 * - AdvancedMatchingInput - The input type for the advancedCandidateMatching function.
 * - AdvancedMatchingOutput - The return type for the advancedCandidateMatching function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const JobDetailsInputSchema = z.object({
  jobTitle: z.string().describe('The title of the job.'),
  jobDescription: z.string().describe('The detailed description of the job role and responsibilities.'),
  requiredSkills: z.array(z.string()).describe('A list of essential skills for the job.'),
  requiredExperienceYears: z.number().describe('Minimum years of relevant experience required.'),
  requiredEducation: z.string().describe('The minimum educational qualification required (e.g., "Bachelor\'s degree in Computer Science").'),
  preferredIndustry: z.string().optional().describe('The preferred industry background for the candidate (e.g., "SaaS", "Healthcare Tech").'),
  locationPreference: z.string().describe('The location preference for the job (e.g., "Remote", "New York, NY", "Hybrid - London").'),
});

const AdvancedMatchingInputSchema = z.object({
  candidateDataUri: z
    .string()
    .describe(
      "The candidate's resume or profile data as a data URI (e.g., PDF, TXT). Must include MIME type and Base64 encoding. Format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  jobDetails: JobDetailsInputSchema,
});
export type AdvancedMatchingInput = z.infer<typeof AdvancedMatchingInputSchema>;

const AdvancedMatchingOutputSchema = z.object({
  overallMatchPercentage: z
    .number()
    .min(0)
    .max(100)
    .describe('A single percentage (0-100) representing how well the candidate matches the job overall.'),
  dimensionalScores: z.object({
    skillsMatchScore: z.number().min(0).max(100).describe('Score (0-100) for skills alignment.'),
    experienceMatchScore: z.number().min(0).max(100).describe('Score (0-100) for experience relevance and depth.'),
    educationMatchScore: z.number().min(0).max(100).describe('Score (0-100) for educational background match.'),
    industryMatchScore: z.number().min(0).max(100).describe('Score (0-100) for industry experience alignment.'),
    locationMatchScore: z.number().min(0).max(100).describe('Score (0-100) for location preference alignment.'),
  }).describe('Breakdown of scores across key dimensions.'),
  detailedAssessment: z.object({
    strengths: z.array(z.string()).describe('List of 3-5 key strengths of the candidate for this specific role.'),
    areasForImprovement: z.array(z.string()).describe('List of 2-3 areas where the candidate could improve or lacks experience for this role.'),
    careerTrajectoryAnalysis: z.string().describe("Brief analysis of how this role aligns with the candidate's apparent career progression."),
    culturalFitScore: z.number().min(1).max(10).describe('Estimated cultural fit score (1-10), assuming a generic positive tech company culture if not specified.'),
    missingCriticalSkills: z.array(z.string()).describe('Identification of any critical skills from the job requirements that are clearly absent or not sufficiently demonstrated.'),
  }).describe('In-depth AI-generated assessment of the candidate.'),
  matchReasoning: z.string().describe('Concise (2-3 sentences) explanation for the overallMatchPercentage.'),
  highlightedMatchedSkills: z.array(z.string()).describe('Top 3-5 skills the candidate possesses that are most relevant to the job.'),
  highlightedMatchedExperience: z.array(z.string()).describe('Brief descriptions of 1-2 key experiences of the candidate that align well with the job.'),
  generatedInterviewQuestions: z.array(z.string()).describe('3-4 role-specific interview questions to probe deeper into the candidate\'s skills and experience.'),
  fitAssessmentSummary: z.string().describe('A brief overall summary of the candidate\'s fit for the role.'),
  improvementRecommendations: z.array(z.string()).describe('1-2 actionable recommendations for the candidate if they were to pursue this role or similar roles.'),
});
export type AdvancedMatchingOutput = z.infer<typeof AdvancedMatchingOutputSchema>;

export async function advancedCandidateMatching(
  input: AdvancedMatchingInput
): Promise<AdvancedMatchingOutput> {
  return advancedCandidateMatchingFlow(input);
}

const advancedCandidateMatchingPrompt = ai.definePrompt({
  name: 'advancedCandidateMatchingPrompt',
  input: {schema: AdvancedMatchingInputSchema},
  output: {schema: AdvancedMatchingOutputSchema},
  model: 'googleai/gemini-1.5-pro-latest',
  prompt: `You are an expert AI Talent Acquisition Specialist. Your task is to perform an advanced multi-dimensional analysis of a candidate against a specific job role.

**Candidate Information:**
Resume/Profile (as data URI): {{media url=candidateDataUri}}

**Job Details:**
Title: {{jobDetails.jobTitle}}
Description: {{{jobDetails.jobDescription}}}
Required Skills: {{#if jobDetails.requiredSkills}}{{#each jobDetails.requiredSkills}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}Not specified{{/if}}
Required Experience (Years): {{jobDetails.requiredExperienceYears}}
Required Education: {{jobDetails.requiredEducation}}
Preferred Industry: {{#if jobDetails.preferredIndustry}}{{{jobDetails.preferredIndustry}}}{{else}}Not specified{{/if}}
Location Preference: {{jobDetails.locationPreference}}

**Your Analysis Output MUST strictly follow the JSON schema defined in the output.schema section.**

**Analysis Instructions:**

1.  **Overall Match Percentage:** Based on all dimensions, provide a single percentage (0-100) representing how well the candidate matches the job.
2.  **Dimensional Scores (0-100 for each):**
    *   \`skillsMatchScore\`: How well do the candidate's skills align with \`requiredSkills\` and those implied in the \`jobDescription\`?
    *   \`experienceMatchScore\`: Assess the candidate's years of experience and its relevance against \`requiredExperienceYears\` and the job's seniority.
    *   \`educationMatchScore\`: Match candidate's education to \`requiredEducation\`.
    *   \`industryMatchScore\`: If \`preferredIndustry\` is provided, assess alignment. If not, score based on general industry relevance from resume. Score 50 if no specific industry preference is given and candidate's industry isn't clear or highly relevant.
    *   \`locationMatchScore\`: Assess alignment with \`locationPreference\`. Consider remote work if applicable. If job is remote and candidate is open to remote, score high.
3.  **Detailed Assessment:**
    *   \`strengths\`: List 3-5 key strengths of the candidate specifically for this role.
    *   \`areasForImprovement\`: List 2-3 areas where the candidate could improve or lacks experience for this role.
    *   \`careerTrajectoryAnalysis\`: Briefly analyze if this role aligns with the candidate's apparent career progression (1-2 sentences).
    *   \`culturalFitScore\` (1-10): Based on soft skills, project descriptions, or any inferred personality traits from the resume, estimate a cultural fit score. Assume a generic positive tech company culture (e.g., values collaboration, innovation, proactivity) if not specified.
    *   \`missingCriticalSkills\`: Identify any skills from \`requiredSkills\` that are clearly absent or not sufficiently demonstrated in the resume. If all are present, this can be an empty array.
4.  **Match Reasoning:** Provide a concise (2-3 sentences) explanation for the \`overallMatchPercentage\`.
5.  **Highlighted Matched Skills:** List the top 3-5 skills the candidate possesses that are most relevant to the job.
6.  **Highlighted Matched Experience:** Briefly describe 1-2 key experiences of the candidate that align well with the job (e.g., "Led a team of 5 engineers on a similar project").
7.  **Generated Interview Questions:** Generate 3-4 role-specific interview questions to probe deeper into the candidate's skills and experience, especially targeting any potential gaps or key strengths.
8.  **Fit Assessment Summary:** A brief overall summary (1-2 sentences) of the candidate's fit.
9.  **Improvement Recommendations:** Suggest 1-2 actionable recommendations for the candidate if they were to pursue this role or similar roles.

Be thorough and objective. Base your entire analysis SOLELY on the provided candidate resume/profile and job details. Ensure the output is valid JSON matching the schema.
`,
});

const advancedCandidateMatchingFlow = ai.defineFlow(
  {
    name: 'advancedCandidateMatchingFlow',
    inputSchema: AdvancedMatchingInputSchema,
    outputSchema: AdvancedMatchingOutputSchema,
  },
  async (input) => {
    const {output} = await advancedCandidateMatchingPrompt(input);
    if (!output) {
        throw new Error("Advanced matching flow did not produce an output.");
    }
    return output;
  }
);
    
