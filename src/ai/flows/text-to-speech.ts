
'use server';
/**
 * @fileOverview A flow for converting text to speech using Google's TTS model.
 *
 * - textToSpeech - A function that takes text and returns an audio data URI.
 * - TextToSpeechInput - The input type for the function (string).
 * - TextToSpeechOutput - The return type for the function (object with media URI).
 */

import {ai} from '@/ai/genkit';
import { googleAI } from '@genkit-ai/googleai';
import {z} from 'genkit';
import wav from 'wav';

const TextToSpeechInputSchema = z.string();
export type TextToSpeechInput = z.infer<typeof TextToSpeechInputSchema>;

const TextToSpeechOutputSchema = z.object({
  media: z.string().describe("The base64 encoded WAV audio data URI."),
});
export type TextToSpeechOutput = z.infer<typeof TextToSpeechOutputSchema>;


export async function textToSpeech(
  input: TextToSpeechInput
): Promise<TextToSpeechOutput> {
    const { media } = await ai.generate({
      model: googleAI.model('gemini-2.5-flash-preview-tts'),
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Algenib' }, // A pleasant, professional voice
          },
        },
      },
      prompt: input,
    });
    if (!media) {
      throw new Error('Text-to-speech model did not return any media.');
    }
    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );
    return {
      media: 'data:audio/wav;base64,' + (await toWav(audioBuffer)),
    };
}


async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    let bufs = [] as any[];
    writer.on('error', reject);
    writer.on('data', function (d) {
      bufs.push(d);
    });
    writer.on('end', function () {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}
