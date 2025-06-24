
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import type { ScheduledInterview } from '@/lib/types';
import { analyzeInterviewPerformance } from '@/ai/flows/analyze-interview-performance';
import { dynamicInterviewFlow } from '@/ai/flows/dynamic-interview-flow';
import { generatePersonalizedIntro } from '@/ai/flows/generate-personalized-intro';
import { textToSpeech } from '@/ai/flows/text-to-speech';
import { transcribeAudio } from '@/ai/flows/transcribe-audio-flow';
import { Loader2, Video, VideoOff, BrainCircuit, AlertTriangle, ShieldCheck, EyeOff, Send, UploadCloud, Mic, Volume2, Sparkles, CheckCircle, ArrowRight, MessageSquare, Mic2 } from "lucide-react";
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

type InterviewStage = "loading" | "permission_denied" | "ready_to_start" | "in_progress" | "finished" | "analyzing" | "error";
type CheatingEvent = { type: 'Tab Switch' | 'Focus Lost' | 'Pasted Content'; timestamp: string };
type ConversationTurn = { role: 'Interviewer' | 'Candidate' | 'System'; text: string };

const SILENCE_THRESHOLD_RMS = 2.5;
const SILENCE_DURATION_MS = 2500;

export default function LiveInterviewPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const interviewId = params.interviewId as string;

  const [stage, setStage] = useState<InterviewStage>("loading");
  const [errorMessage, setErrorMessage] = useState('');
  const [interview, setInterview] = useState<ScheduledInterview | null>(null);
  
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const currentAnswerChunks = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isTtsLoading, setIsTtsLoading] = useState(false);

  const [cheatingAlerts, setCheatingAlerts] = useState<CheatingEvent[]>([]);

  const audioRef = useRef<HTMLAudioElement>(null);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const silenceDetectionTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const stopSilenceDetection = useCallback(() => {
    if (silenceDetectionTimerRef.current) {
        clearTimeout(silenceDetectionTimerRef.current);
        silenceDetectionTimerRef.current = null;
    }
  }, []);
  
  const askQuestion = useCallback(async (questionText: string) => {
    setCurrentQuestion(questionText);
    setConversation(prev => [...prev, { role: 'Interviewer', text: questionText }]);
    
    setIsTtsLoading(true);
    try {
        const { media: audioDataUri } = await textToSpeech(questionText);
        setIsTtsLoading(false);
        if (audioRef.current && audioDataUri) {
            audioRef.current.src = audioDataUri;
        } else {
            throw new Error("Failed to get audio source from TTS.");
        }
    } catch(ttsError) {
        setIsTtsLoading(false);
        console.error("Text-to-speech failed:", ttsError);
        toast({variant: 'destructive', title: 'Audio Error', description: 'Could not play the next question.'});
        setStage('error');
        setErrorMessage('Failed to generate audio for the next question.');
    }
  }, [toast]);
  
  const startRecording = useCallback(() => {
    if (!videoRef.current?.srcObject) {
      toast({ variant: "destructive", title: "Camera Error", description: "Cannot start recording without a camera stream." });
      return;
    }
    currentAnswerChunks.current = [];
    const stream = videoRef.current.srcObject as MediaStream;
    mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'video/webm' });
    
    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) currentAnswerChunks.current.push(event.data);
    };
    mediaRecorderRef.current.start();
    setIsRecording(true);
    
    const analyser = analyserRef.current;
    if (!analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let silenceStart: number | null = null;

    const check = () => {
      if(mediaRecorderRef.current?.state !== 'recording') return;
      analyser.getByteTimeDomainData(dataArray);
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] - 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / bufferLength);

      if (rms < SILENCE_THRESHOLD_RMS) {
        if (silenceStart === null) silenceStart = Date.now();
        else if (Date.now() - silenceStart > SILENCE_DURATION_MS) {
            handleFinishAnswering();
            return;
        }
      } else {
        silenceStart = null;
      }
      silenceDetectionTimerRef.current = setTimeout(check, 100);
    };
    check();
  }, [toast, handleFinishAnswering]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    stopSilenceDetection();
  }, [stopSilenceDetection]);

  const handleFinishAnswering = useCallback(async () => {
    if (!isRecording) return;
    stopRecording();
    setIsAiThinking(true);
    
    const blob = new Blob(currentAnswerChunks.current, { type: 'video/webm' });
    if (blob.size === 0) {
        setIsAiThinking(false);
        if (stage === 'in_progress' && !isAiSpeaking) startRecording();
        return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = async () => {
        const audioDataUri = reader.result as string;
        
        try {
            const { text: transcribedText } = await transcribeAudio({ audioDataUri });

            if (!transcribedText || transcribedText.trim().length === 0) {
                 toast({ variant: 'destructive', title: 'Transcription Failed', description: 'Could not understand audio. Please speak clearly.' });
                 await askQuestion(`Sorry, I didn't catch that. Let me repeat the question: ${currentQuestion}`);
                 setIsAiThinking(false);
                 return;
            }

            const updatedConversation = [...conversation, { role: 'Candidate', text: transcribedText }];
            setConversation(updatedConversation);

            if (!interview?.resumeDataUri || !interview?.jobDescriptionDataUri) {
                 setStage('error');
                 setErrorMessage('Missing resume or job description data needed for the interview.');
                 setIsAiThinking(false);
                 return;
            }
            
            const dynamicResult = await dynamicInterviewFlow({
                resumeDataUri: interview.resumeDataUri,
                jobDescriptionDataUri: interview.jobDescriptionDataUri,
                conversationHistory: updatedConversation,
            });
            
            if (dynamicResult.nextQuestion) {
                 await askQuestion(dynamicResult.nextQuestion);
            } else {
                 await askQuestion("Thank you. That concludes the interview.");
                 setStage('finished');
            }
            
        } catch (flowError: any) {
            console.error("Interview flow failed:", flowError);
            setStage('error');
            setErrorMessage(`AI failed: ${flowError.message}`);
        } finally {
            setIsAiThinking(false);
        }
    };
    reader.onerror = () => {
        toast({variant: "destructive", title: "Recording Error", description: "Failed to process recorded answer."});
        setIsAiThinking(false);
    }
  }, [isRecording, stopRecording, conversation, toast, interview, askQuestion, currentQuestion, stage, isAiSpeaking, startRecording]);
  
  const handleAudioEnded = useCallback(() => {
    setIsAiSpeaking(false);
    if (stage === 'in_progress' && !isRecording) {
      startRecording();
    }
  }, [stage, isRecording, startRecording]);

  useEffect(() => {
    if (!interviewId) { router.push('/interview-system'); return; }
    const initializeInterview = async () => {
      setStage('loading');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (videoRef.current) videoRef.current.srcObject = stream;
        setHasCameraPermission(true);

        const context = new AudioContext();
        const source = context.createMediaStreamSource(stream);
        const analyser = context.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        audioContextRef.current = context;
        analyserRef.current = analyser;
        sourceNodeRef.current = source;
      } catch (error) { setStage("permission_denied"); return; }
      
      let interviewData: ScheduledInterview | null = null;
      try {
        const storedInterviewsRaw = localStorage.getItem('local_interviews');
        if (storedInterviewsRaw) {
            const storedInterviews: ScheduledInterview[] = JSON.parse(storedInterviewsRaw);
            interviewData = storedInterviews.find(i => i.id === interviewId) || null;
        }
        if (!interviewData) throw new Error("The requested interview could not be found in local storage.");
        if (!interviewData.resumeDataUri || !interviewData.jobDescriptionDataUri) throw new Error("Interview data is missing the required resume or job description data.");
        setInterview(interviewData);
        setStage('ready_to_start');
      } catch (error: any) {
          setErrorMessage(error.message || "An unexpected error occurred during setup.");
          setStage('error');
      }
    };
    initializeInterview();
    return () => { stopSilenceDetection(); audioContextRef.current?.close(); }
  }, [interviewId, router, stopSilenceDetection]);
  
  useEffect(() => {
    const addCheatingEvent = (type: CheatingEvent['type']) => {
        setCheatingAlerts(prev => [...prev, { type, timestamp: new Date().toISOString() }]);
        toast({ variant: "destructive", title: `Anti-Cheating Alert: ${type}`, description: "This action has been logged for review." });
    };
    const handleVisibilityChange = () => { if (document.hidden && stage === 'in_progress') addCheatingEvent('Tab Switch'); };
    const handleBlur = () => { if (stage === 'in_progress') addCheatingEvent('Focus Lost'); };
    
    if (stage === 'in_progress') {
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);
    }
    return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('blur', handleBlur);
    };
  }, [stage, toast]);
  
  useEffect(() => {
    if (audioRef.current && audioRef.current.src && audioRef.current.src !== window.location.href) {
        setIsAiSpeaking(true);
        audioRef.current.play().catch(e => {
            console.error("Audio playback failed:", e);
            toast({variant: 'destructive', title: 'Playback Error', description: 'Could not play AI audio. Please check browser permissions.'})
            setIsAiSpeaking(false);
        });
    }
  }, [audioRef.current?.src, toast]);

  const handleStartInterview = useCallback(async () => {
    if (!interview) return;
    setIsAiThinking(true);
    try {
        const introResult = await generatePersonalizedIntro({
            resumeDataUri: interview.resumeDataUri || '',
            candidateName: interview.candidateName,
            jobTitle: interview.jobTitle,
        });

        if(!introResult || !introResult.introduction) {
            throw new Error("Failed to generate personalized introduction.");
        }
        
        setIsAiThinking(false);
        setStage('in_progress');
        setConversation([{ role: 'System', text: 'Interview Started.'}]);
        await askQuestion(introResult.introduction);
    } catch(error: any) {
        setIsAiThinking(false);
        toast({variant: 'destructive', title: 'Interview Start Failed', description: `Could not start interview: ${error.message}`});
        setStage('error');
        setErrorMessage(`Could not start interview: ${error.message}`);
    }
  }, [interview, toast, askQuestion]);

  const handleAnalyze = async () => {
    if (conversation.length === 0) {
      toast({ variant: "destructive", title: "No Answers", description: "No conversation was recorded to analyze." });
      return;
    }
    if (!interview) return;

    setStage('analyzing');
    try {
        const analysisResult = await analyzeInterviewPerformance({ conversationHistory: conversation });
        
        const storedInterviewsRaw = localStorage.getItem('local_interviews');
        if (storedInterviewsRaw) {
            let storedInterviews: ScheduledInterview[] = JSON.parse(storedInterviewsRaw);
            const finalInterviewData = { ...interview, analysis: analysisResult, questions: conversation.filter(t => t.role === 'Interviewer').map(t => t.text) };
            storedInterviews = storedInterviews.map(i => i.id === interview.id ? finalInterviewData : i);
            localStorage.setItem('local_interviews', JSON.stringify(storedInterviews));
        }
        toast({ title: "Analysis Complete!", description: "Storing results and redirecting..." });
        router.push(`/interview-results/${interview.id}`);

    } catch(error) {
        console.error("Failed during analysis or save:", error);
        toast({ variant: "destructive", title: "Analysis Failed", description: "Could not complete the interview analysis." });
        setStage('finished');
    }
  };

  const renderContent = () => {
    switch (stage) {
      case 'loading':
        return <div className="flex flex-col items-center justify-center h-full gap-4"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="text-muted-foreground">Initializing Interview...</p></div>;
      case 'error':
        return <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Interview Setup Error</AlertTitle><AlertDescription>{errorMessage}</AlertDescription></Alert>;
      case 'permission_denied':
        return <Alert variant="destructive" className="max-w-md"><AlertTriangle className="h-4 w-4" /><AlertTitle>Camera & Mic Access Required</AlertTitle><AlertDescription className="space-y-3 mt-2"><p>We need camera/mic access for the interview. Please click the camera icon in your browser's address bar to "Allow" access, then refresh the page.</p></AlertDescription></Alert>;
      case 'ready_to_start':
        return (
            <Card><CardHeader><CardTitle>Interview Ready</CardTitle><CardDescription>Candidate: {interview?.candidateName} for {interview?.jobTitle}</CardDescription></CardHeader><CardContent className="space-y-4"><p>The AI will conduct a dynamic interview based on the resume and job description.</p><Alert><ShieldCheck className="h-4 w-4"/><AlertTitle>Anti-Cheating Enabled</AlertTitle><AlertDescription>Switching tabs or leaving the page will be logged.</AlertDescription></Alert></CardContent><CardFooter><Button onClick={handleStartInterview} className="w-full" disabled={isAiThinking}><Video className="mr-2 h-4 w-4"/>{isAiThinking ? "Preparing Intro..." : "Start Interview"}</Button></CardFooter></Card>
        );
      case 'in_progress':
        return (
            <Card className="flex flex-col h-full w-full">
                <CardHeader><CardTitle>Interview In Progress</CardTitle><CardDescription>Job: {interview?.jobTitle}</CardDescription></CardHeader>
                <CardContent className="flex-grow flex flex-col items-center justify-center text-center p-6 bg-muted rounded-md space-y-6">
                    <p className="text-xl font-semibold">{currentQuestion}</p>
                    {isTtsLoading ? (<div className="flex items-center gap-3 text-lg text-muted-foreground"><Mic2 className="h-6 w-6 text-primary animate-pulse" /><span>Generating audio...</span></div>)
                    : isAiSpeaking ? (<div className="flex items-center gap-3 text-lg text-muted-foreground"><Volume2 className="h-6 w-6 text-primary animate-pulse" /><span>Listening to Intelli...</span></div>) 
                    : isRecording ? (<div className="flex items-center gap-3 text-lg text-destructive"><Mic className="h-6 w-6 animate-pulse" /><span>Your turn. Recording...</span></div>)
                    : isAiThinking ? (<div className="flex items-center gap-3 text-lg text-muted-foreground"><BrainCircuit className="h-6 w-6 animate-spin"/><span>Thinking...</span></div>)
                    : (<div className="flex items-center gap-3 text-lg text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin"/><span>Preparing...</span></div>)}
                </CardContent>
            </Card>
        );
      case 'finished':
        return (
             <Card><CardHeader><CardTitle>Interview Complete!</CardTitle><CardDescription>The recording is ready for processing.</CardDescription></CardHeader><CardContent className="space-y-4"><p>Thank you for completing the interview.</p>{cheatingAlerts.length > 0 && (<Alert variant="destructive"><EyeOff className="h-4 w-4" /><AlertTitle>{cheatingAlerts.length} Potential Integrity Issue(s) Logged</AlertTitle></Alert>)}<Button onClick={handleAnalyze} className="w-full"><BrainCircuit className="mr-2 h-4 w-4"/> Process and Analyze Performance</Button></CardContent></Card>
        );
      case 'analyzing':
        return <Card><CardHeader><CardTitle>Processing Interview...</CardTitle><CardDescription>Please wait while the AI analyzes the full conversation.</CardDescription></CardHeader><CardContent className="space-y-4 text-center"><Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" /><p className="text-sm font-medium">Running AI analysis...</p></CardContent></Card>;
      default: return null;
    }
  };

  return (
    <div className="bg-gray-900 min-h-screen flex flex-col text-white">
        <audio ref={audioRef} onEnded={handleAudioEnded} hidden />
        <header className="p-4 border-b border-gray-700 flex justify-between items-center"><h1 className="text-xl font-bold">AI Interview</h1>{isRecording && <Badge variant="destructive" className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>RECORDING</Badge>}</header>
        <main className="flex-grow grid md:grid-cols-3 gap-6 p-6">
            <div className="md:col-span-2 flex items-center justify-center">{renderContent()}</div>
            <div className="flex flex-col gap-4">
                <Card className="bg-gray-800 border-gray-700"><CardHeader className="p-4"><CardTitle className="text-base flex items-center justify-between">Candidate Camera Feed {hasCameraPermission ? <Video className="h-5 w-5 text-green-500" /> : <VideoOff className="h-5 w-5 text-red-500" />}</CardTitle></CardHeader><CardContent className="p-0"><video ref={videoRef} className="w-full aspect-video bg-black" autoPlay muted playsInline /></CardContent></Card>
                <Card className="bg-gray-800 border-gray-700 flex-grow flex flex-col"><CardHeader className="p-4"><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-5 w-5"/>Conversation Transcript</CardTitle></CardHeader>
                    <CardContent className="p-4 pt-0 flex-grow">
                        <ScrollArea className="h-full max-h-64">
                            <div className="space-y-4 text-sm">
                                {conversation.map((turn, i) => (
                                    <div key={i} className={cn("flex flex-col", turn.role === 'Interviewer' ? 'items-start' : 'items-end', turn.role === 'System' && 'items-center')}>
                                        <div className={cn("rounded-lg px-3 py-2 max-w-[85%]", turn.role === 'Interviewer' ? 'bg-blue-600' : 'bg-gray-600', turn.role === 'System' && 'bg-gray-700 text-xs text-gray-400')}>
                                           {turn.role !== 'System' && <span className="font-bold block text-xs pb-1">{turn.role}</span>}
                                           {turn.text}
                                        </div>
                                    </div>
                                ))}
                                {isAiThinking && (
                                    <div className="flex justify-start items-center gap-2">
                                      <div className={cn("rounded-full p-2 bg-blue-600 animate-pulse")}>
                                         <BrainCircuit className="h-4 w-4 text-white"/>
                                      </div>
                                       <div className="text-sm text-gray-400">Intelli is thinking...</div>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </main>
    </div>
  );
}
