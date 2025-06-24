
'use server';
/**
 * @fileOverview Generates a personalized introduction for a dynamic interview.
 * - generatePersonalizedIntro - A function that creates a welcome message.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateIntroInputSchema = z.object({
  resumeDataUri: z.string().describe("The candidate's resume as a data URI."),
  candidateName: z.string().describe("The candidate's name."),
  jobTitle: z.string().describe("The job title they are interviewing for."),
});
export type GenerateIntroInput = z.infer<typeof GenerateIntroInputSchema>;

const GenerateIntroOutputSchema = z.object({
  introduction: z.string().describe("The warm, personalized welcome message for the candidate."),
});
export type GenerateIntroOutput = z.infer<typeof GenerateIntroOutputSchema>;

export async function generatePersonalizedIntro(input: GenerateIntroInput): Promise<GenerateIntroOutput> {
    const promptText = `You are a friendly and professional AI interviewer named 'Intelli'.
Your goal is to create a brief, warm, and personalized welcome message for a candidate named ${input.candidateName} who is interviewing for the ${input.jobTitle} position.

---
**Your Task:**
1.  Review the candidate's resume and find one specific, positive detail to mention (e.g., a project, a specific skill, or an impressive company they worked for).
2.  Craft a short (2-3 sentences) welcome message.
3.  Address the candidate by name.
4.  Mention the specific detail you found in their resume.
5.  State that you're about to begin the interview.

**Example Output:** "Hi, ${input.candidateName}! It's great to connect with you today. I was particularly impressed with your work on the Project Apollo at your previous role. Let's get started with the interview for the ${input.jobTitle} position."

**Generate only the welcome message in the 'introduction' field.**
`;

    const { output } = await ai.generate({
      model: 'googleai/gemini-1.5-flash-latest',
      prompt: [
        { text: promptText },
        { media: { url: input.resumeDataUri } }
      ],
      output: {
        format: "json",
        schema: GenerateIntroOutputSchema
      }
    });

    if (!output) {
      throw new Error("The AI model did not generate an introduction.");
    }
    return output;
}
