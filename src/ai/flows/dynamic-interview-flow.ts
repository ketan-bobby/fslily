
'use server';
/**
 * @fileOverview Conducts a dynamic, conversational interview by generating questions on the fly.
 * - dynamicInterviewFlow - The main function for this conversational agent.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ConversationTurnSchema = z.object({
    role: z.enum(['Interviewer', 'Candidate', 'System']),
    text: z.string(),
});

const DynamicInterviewInputSchema = z.object({
  jobDescriptionDataUri: z.string().describe("The job description as a data URI."),
  resumeDataUri: z.string().describe("The candidate's resume as a data URI."),
  conversationHistory: z.array(ConversationTurnSchema).describe("The history of the conversation so far, as text."),
});
export type DynamicInterviewInput = z.infer<typeof DynamicInterviewInputSchema>;

const DynamicInterviewOutputSchema = z.object({
  nextQuestion: z.string().describe("The next question to ask the candidate, based on the conversation so far."),
});
export type DynamicInterviewOutput = z.infer<typeof DynamicInterviewOutputSchema>;


const prompt = ai.definePrompt({
    name: 'dynamicInterviewPrompt',
    input: {schema: DynamicInterviewInputSchema},
    output: {schema: DynamicInterviewOutputSchema},
    model: 'googleai/gemini-1.5-flash-latest',
    prompt: `You are a friendly and professional AI interviewer named 'Intelli'.
Your goal is to conduct a conversational and insightful interview for the role described below, based on the provided candidate resume.

**Job Description:**
{{media url=jobDescriptionDataUri}}

**Candidate's Resume:**
{{media url=resumeDataUri}}

**Conversation History (User is the 'Candidate'):**
{{#each conversationHistory}}
**{{role}}:** {{{text}}}
{{/each}}

**Your Task:**
Based on all the information above (JD, resume, and the full conversation history), determine the **single best next question** to ask the candidate.

- **If the conversation history is empty or contains only a system message:** Ask your first engaging, open-ended question based on the resume and job description. Do NOT give any introduction or welcome message. Just the question.
- **If the history is NOT empty:** Analyze the candidate's last answer. Ask a relevant follow-up question, or transition to a new topic smoothly. Do not be repetitive.

Output only the next question in the valid JSON format.
`
});


const definedFlow = ai.defineFlow(
  {
    name: 'dynamicInterviewFlow',
    inputSchema: DynamicInterviewInputSchema,
    outputSchema: DynamicInterviewOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("The AI model did not generate a next question.");
    }
    return output;
  }
);

export async function dynamicInterviewFlow(
  input: DynamicInterviewInput
): Promise<DynamicInterviewOutput> {
    return definedFlow(input);
}
