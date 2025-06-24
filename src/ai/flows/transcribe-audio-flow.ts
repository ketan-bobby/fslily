
'use server';
/**
 * @fileOverview A flow for transcribing audio.
 *
 * - transcribeAudio - A function that transcribes an audio data URI.
 * - TranscribeAudioInput - The input type for the function.
 * - TranscribeAudioOutput - The return type for the function.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TranscribeAudioInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "The audio as a data URI that must include a MIME type and use Base64 encoding."
    ),
});
export type TranscribeAudioInput = z.infer<typeof TranscribeAudioInputSchema>;

const TranscribeAudioOutputSchema = z.object({
  text: z.string().describe('The transcribed text.'),
});
export type TranscribeAudioOutput = z.infer<typeof TranscribeAudioOutputSchema>;

export async function transcribeAudio(input: TranscribeAudioInput): Promise<TranscribeAudioOutput> {
    const { text } = await ai.generate({
        model: 'googleai/gemini-1.5-flash-latest',
        prompt: [{text: 'Transcribe the following audio recording accurately and verbatim:'}, {media: {url: input.audioDataUri}}]
    });
    return { text };
}
