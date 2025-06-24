
'use server';
/**
 * @fileOverview Parses a job description text to extract structured information.
 *
 * - parseJobDescription - A function that extracts details from a job description string.
 * - ParseJobDescriptionInput - The input type for the function.
 * - ParseJobDescriptionOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ParseJobDescriptionInputSchema = z.object({
  jobDescriptionDataUri: z
    .string()
    .describe(
      "The job description document as a data URI. Must include MIME type and Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'. Supported types: PDF, DOCX, TXT, MD."
    ),
});
export type ParseJobDescriptionInput = z.infer<typeof ParseJobDescriptionInputSchema>;

const ParseJobDescriptionOutputSchema = z.object({
  title: z.string().optional().describe('The extracted job title. If multiple titles seem present, pick the most prominent or primary one.'),
  description: z.string().optional().describe('The main body of the job description, often including responsibilities, qualifications, and company information. This should be the most comprehensive textual part of the JD.'),
  skillsRequired: z.array(z.string()).optional().describe('A list of key skills, technologies, tools, or qualifications mentioned. Extract as many relevant skills as possible.'),
  location: z.string().optional().describe('The primary work location mentioned (e.g., "Remote", "New York, NY", "London, UK"). If multiple locations are options, pick the most prominent or list them if very brief.'),
  department: z.string().optional().describe('The department this role likely belongs to (e.g., "Engineering", "Marketing", "Sales", "Product").'),
  // Potentially add experienceLevel, educationRequirements in future if consistently extractable
});
export type ParseJobDescriptionOutput = z.infer<typeof ParseJobDescriptionOutputSchema>;

export async function parseJobDescription(
  input: ParseJobDescriptionInput
): Promise<ParseJobDescriptionOutput> {
  return parseJobDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'parseJobDescriptionPrompt',
  input: {schema: ParseJobDescriptionInputSchema},
  output: {schema: ParseJobDescriptionOutputSchema},
  prompt: `You are an expert HR assistant and job description analyst.
Your task is to carefully analyze the following job description document and extract the specified pieces of information.
Return the information in the structured JSON format defined by the output schema.

Job Description Document:
{{media url=jobDescriptionDataUri}}

Extraction Guidelines:
- \`title\`: Identify the primary job title.
- \`description\`: Extract the main descriptive part of the job posting, including responsibilities, qualifications, etc. This might be a large block of text.
- \`skillsRequired\`: List all distinct technical skills, soft skills, tools, programming languages, frameworks, and other qualifications mentioned. Be comprehensive.
- \`location\`: Identify the work location. If remote options are mentioned, note that.
- \`department\`: Infer the most likely department for this role (e.g., Engineering, Sales, Marketing, Product, HR).

If a field is not clearly present in the job description, you may omit it or provide a best guess if reasonable.
Ensure the output is valid JSON.
`,
});

const parseJobDescriptionFlow = ai.defineFlow(
  {
    name: 'parseJobDescriptionFlow',
    inputSchema: ParseJobDescriptionInputSchema,
    outputSchema: ParseJobDescriptionOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
        throw new Error("AI did not produce an output for job description parsing.");
    }
    return output;
  }
);


    
