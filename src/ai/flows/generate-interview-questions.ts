
'use server';
/**
 * @fileOverview Generates interview questions based on a resume and job description.
 *
 * - generateInterviewQuestions - Creates a set of targeted interview questions.
 * - GenerateInterviewQuestionsInput - Input schema for the flow.
 * - GenerateInterviewQuestionsOutput - Output schema for the flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateInterviewQuestionsInputSchema = z.object({
  jobDescriptionDataUri: z
    .string()
    .describe(
      "The job description as a data URI. Must include MIME type and Base64 encoding. Format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  resumeDataUri: z
    .string()
    .describe(
      "The candidate's resume data as a data URI. Must include MIME type and Base64 encoding. Format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
type GenerateInterviewQuestionsInput = z.infer<
  typeof GenerateInterviewQuestionsInputSchema
>;

const GenerateInterviewQuestionsOutputSchema = z.object({
  questions: z.array(z.string()).describe('A list of 5-7 targeted interview questions, covering technical, behavioral, and situational aspects.'),
});
type GenerateInterviewQuestionsOutput = z.infer<
  typeof GenerateInterviewQuestionsOutputSchema
>;

export async function generateInterviewQuestions(
  input: GenerateInterviewQuestionsInput
): Promise<GenerateInterviewQuestionsOutput> {
  return generateInterviewQuestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateInterviewQuestionsPrompt',
  input: {schema: GenerateInterviewQuestionsInputSchema},
  output: {schema: GenerateInterviewQuestionsOutputSchema},
  prompt: `You are an expert HR interviewer and talent acquisition specialist.
Your task is to analyze the provided Job Description and Candidate Resume to generate a concise list of 5-7 highly relevant interview questions.

**Instructions:**
1.  Carefully compare the candidate's skills and experience from their resume with the requirements listed in the job description.
2.  Identify key areas to probe deeper. This includes validating their claimed expertise, exploring potential gaps, and assessing cultural fit.
3.  Generate a mix of questions:
    *   **Technical Questions:** To verify specific skills mentioned in both documents.
    *   **Behavioral Questions:** To understand how they've handled past situations (e.g., "Tell me about a time when...").
    *   **Situational Questions:** To see how they would handle future scenarios relevant to the role (e.g., "Imagine you disagree with a product decision. How would you handle it?").
4.  The questions should be open-ended and designed to elicit detailed responses.
5.  Do not generate more than 7 questions.

**Candidate Resume:**
{{media url=resumeDataUri}}

**Job Description:**
{{media url=jobDescriptionDataUri}}

Generate the list of questions now.`,
});

const generateInterviewQuestionsFlow = ai.defineFlow(
  {
    name: 'generateInterviewQuestionsFlow',
    inputSchema: GenerateInterviewQuestionsInputSchema,
    outputSchema: GenerateInterviewQuestionsOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("AI did not generate any interview questions.");
    }
    return output;
  }
);
