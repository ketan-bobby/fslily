
'use server';
/**
 * @fileOverview Analyzes a full dynamic interview transcript to provide scores and detailed feedback.
 *
 * - analyzeInterviewPerformance - A function that evaluates an interview transcript.
 * - InterviewAnalysisInput - The input type for the function.
 * - InterviewAnalysis - The structured output of the analysis.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ConversationTurnSchema = z.object({
    role: z.enum(['Interviewer', 'Candidate', 'System']),
    text: z.string(),
});

const InterviewAnalysisInputSchema = z.object({
    conversationHistory: z.array(ConversationTurnSchema).describe("An array of all turns in the conversation, including system messages, interviewer questions, and candidate answers."),
});
export type InterviewAnalysisInput = z.infer<typeof InterviewAnalysisInputSchema>;

const InterviewAnalysisSchema = z.object({
    transcript: z.string().describe("The full, verbatim transcript of the conversation, formatted for readability with roles (e.g., 'Interviewer: ...', 'Candidate: ...')."),
    summary: z.string().describe("A concise 2-3 sentence summary of the candidate's overall performance, highlighting key takeaways."),
    overallScore: z.number().min(0).max(100).describe("A single, overall score from 0 to 100 representing the candidate's performance across all questions."),
    questionScores: z.array(z.object({
        question: z.string().describe("The original interview question."),
        score: z.number().min(0).max(100).describe("A score from 0 to 100 for the candidate's answer to this specific question."),
        reasoning: z.string().describe("A brief, 1-2 sentence explanation for why the score was given, referencing specifics from the candidate's answer.")
    })).describe("A breakdown of scores for each individual question."),
    strengths: z.array(z.string()).describe("A bullet-point list of 3-5 key strengths the candidate demonstrated (e.g., 'Clear communication', 'Deep technical knowledge in React Hooks')."),
    weaknesses: z.array(z.string()).describe("A bullet-point list of 2-3 key weaknesses or areas for improvement (e.g., 'Lacked specific examples for project management', 'Answer on system design was not well-structured')."),
});
export type InterviewAnalysis = z.infer<typeof InterviewAnalysisSchema>;


const prompt = ai.definePrompt({
    name: 'analyzeInterviewPerformancePrompt',
    input: {schema: InterviewAnalysisInputSchema},
    output: {schema: InterviewAnalysisSchema},
    model: 'googleai/gemini-1.5-pro-latest',
    prompt: `You are an expert technical recruiter and interview analyst. Your task is to analyze a candidate's performance based on the full text transcript of their interview.

**Your output MUST be a valid JSON object that strictly adheres to the provided output JSON schema.**

**Analysis Steps:**

1.  **Format Transcript:** Create a single, clean, verbatim transcript of the entire conversation. Format it clearly, like "Interviewer: ...\\nCandidate: ...\\n\\n". Exclude any 'System' role messages from the final transcript.
2.  **Evaluate:** Based on the full transcript, evaluate the candidate's performance. Consider clarity, technical knowledge, problem-solving skills, and communication.
3.  **Score:** Provide an 'overallScore' (0-100) and individual 'questionScores' (0-100) for each question-answer pair.
4.  **Summarize:** Write a brief 'summary' of the performance.
5.  **Detail Strengths & Weaknesses:** Identify specific 'strengths' and 'weaknesses' from the candidate's responses.

**Full Interview Transcript:**
{{#each conversationHistory}}
**{{role}}:** {{{text}}}
{{/each}}

Provide your complete analysis as a JSON object now.
`
});


export async function analyzeInterviewPerformance(
  input: InterviewAnalysisInput
): Promise<InterviewAnalysis> {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("The AI model did not produce an analysis output.");
    }
    return output;
}
