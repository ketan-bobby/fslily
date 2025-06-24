
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import type { ScheduledInterview } from '@/lib/types';
import { getInterviewByIdFromDB } from '@/lib/db';
import { Loader2, AlertTriangle, User, Briefcase, Calendar, MessageSquare, BrainCircuit, ThumbsUp, ThumbsDown, Star, ChevronLeft, Video } from "lucide-react";
import Link from 'next/link';

const getScoreColor = (score: number): string => {
    if (score >= 75) return "bg-green-500";
    if (score >= 50) return "bg-yellow-500";
    return "bg-red-500";
};

export default function InterviewResultsPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const interviewId = params.interviewId as string;

    const [interview, setInterview] = useState<ScheduledInterview | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchInterviewData = useCallback(async () => {
        if (!interviewId) {
            toast({ variant: "destructive", title: "Error", description: "No interview ID provided." });
            router.push('/interview-system');
            return;
        }
        setIsLoading(true);
        try {
            const data = await getInterviewByIdFromDB(interviewId);
            if (!data) {
                toast({ variant: "destructive", title: "Not Found", description: "The requested interview could not be found." });
                setInterview(null);
            } else if (!data.analysis) {
                 toast({ variant: "destructive", title: "Analysis Missing", description: "This interview has not been analyzed yet." });
                 setInterview(data); // Set data so user can see basic info
            }
            else {
                setInterview(data);
            }
        } catch (error) {
            console.error("Error fetching interview data:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not load interview details due to a server error." });
        } finally {
            setIsLoading(false);
        }
    }, [interviewId, router, toast]);

    useEffect(() => {
        fetchInterviewData();
    }, [fetchInterviewData]);
    
    if (isLoading) {
        return (
            <AppLayout>
                <div className="flex justify-center items-center h-full">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="ml-3 text-lg">Loading Interview Analysis...</p>
                </div>
            </AppLayout>
        );
    }

    if (!interview) {
        return (
            <AppLayout>
                <div className="text-center py-10">
                    <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
                    <h2 className="text-2xl font-semibold mb-2">Interview Not Found</h2>
                    <p className="text-muted-foreground mb-4">The interview you are looking for does not exist or could not be loaded.</p>
                    <Button asChild>
                        <Link href="/interview-system"><ChevronLeft className="mr-2 h-4 w-4"/>Back to Interview System</Link>
                    </Button>
                </div>
            </AppLayout>
        );
    }
    
     if (!interview.analysis) {
        return (
            <AppLayout>
                <div className="text-center py-10">
                    <BrainCircuit className="mx-auto h-12 w-12 text-blue-500 mb-4" />
                    <h2 className="text-2xl font-semibold mb-2">Analysis Not Available</h2>
                    <p className="text-muted-foreground mb-4">The analysis for this interview has not been generated yet.</p>
                    <div className="flex gap-2 justify-center">
                        <Button asChild>
                            <Link href="/interview-system"><ChevronLeft className="mr-2 h-4 w-4"/>Back to Calendar</Link>
                        </Button>
                        <Button asChild variant="secondary">
                            <Link href={`/live-interview/${interview.id}`}><Video className="mr-2 h-4 w-4"/>Go to Interview Page</Link>
                        </Button>
                    </div>
                </div>
            </AppLayout>
        );
    }

    const { analysis } = interview;

    return (
        <AppLayout>
            <div className="space-y-6">
                <Button variant="outline" asChild>
                    <Link href="/interview-system"><ChevronLeft className="mr-2 h-4 w-4"/>Back to Interview System</Link>
                </Button>

                <header>
                    <h1 className="text-3xl font-bold tracking-tight font-headline">AI Interview Analysis</h1>
                    <p className="text-muted-foreground">Detailed breakdown of the candidate's performance.</p>
                </header>

                <Card className="shadow-lg">
                    <CardHeader>
                        <div className="grid md:grid-cols-3 gap-4">
                            <div className="flex items-center gap-3">
                                <User className="h-6 w-6 text-primary" />
                                <div><CardTitle className="text-lg">{interview.candidateName}</CardTitle><CardDescription>Candidate</CardDescription></div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Briefcase className="h-6 w-6 text-primary" />
                                <div><CardTitle className="text-lg">{interview.jobTitle}</CardTitle><CardDescription>Job Title</CardDescription></div>
                            </div>
                             <div className="flex items-center gap-3">
                                <Calendar className="h-6 w-6 text-primary" />
                                <div><CardTitle className="text-lg">{new Date(interview.interviewDate).toLocaleDateString()}</CardTitle><CardDescription>Interview Date</CardDescription></div>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle>Overall Assessment</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                            <h3 className="text-lg font-semibold">Overall Score</h3>
                            <Badge className="text-3xl px-4 py-2" style={{ backgroundColor: getScoreColor(analysis.overallScore).replace('bg-','') }}>{analysis.overallScore}%</Badge>
                        </div>
                        <div>
                            <h4 className="font-semibold text-md mb-1">AI Summary:</h4>
                            <p className="text-sm text-muted-foreground">{analysis.summary}</p>
                        </div>
                         <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <h4 className="font-semibold text-md mb-2 flex items-center gap-2"><ThumbsUp className="text-green-500"/>Strengths</h4>
                                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                    {analysis.strengths.map((s,i) => <li key={`s-${i}`}>{s}</li>)}
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-md mb-2 flex items-center gap-2"><ThumbsDown className="text-red-500"/>Areas for Improvement</h4>
                                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                    {analysis.weaknesses.map((w,i) => <li key={`w-${i}`}>{w}</li>)}
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Question-by-Question Breakdown</CardTitle></CardHeader>
                    <CardContent>
                        <Accordion type="single" collapsible className="w-full">
                            {analysis.questionScores.map((item, index) => (
                                <AccordionItem key={index} value={`item-${index}`}>
                                    <AccordionTrigger>
                                        <div className="flex justify-between items-center w-full pr-4">
                                            <span className="text-left flex-1">{item.question}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-lg">{item.score}</span>
                                                <Star className={`h-5 w-5 ${item.score >= 50 ? 'text-yellow-400 fill-current' : 'text-muted-foreground'}`}/>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <p className="text-sm text-muted-foreground">{item.reasoning}</p>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Full Interview Transcript</CardTitle></CardHeader>
                    <CardContent>
                        <ScrollArea className="h-60 w-full rounded-md border p-4 bg-muted/50">
                            <p className="text-sm whitespace-pre-wrap">{analysis.transcript}</p>
                        </ScrollArea>
                    </CardContent>
                </Card>
                
                 <Card>
                    <CardHeader><CardTitle>Interview Recording & Logs</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                         {interview.videoStoragePath ? (
                            <Button asChild>
                                <a href={interview.videoStoragePath} target="_blank" rel="noopener noreferrer"><Video className="mr-2 h-4 w-4"/> Watch Recording</a>
                            </Button>
                         ): (
                            <p className="text-sm text-muted-foreground">No video recording was uploaded for this interview.</p>
                         )}

                         {interview.cheatingDetections && interview.cheatingDetections.length > 0 && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Integrity Alerts Logged</AlertTitle>
                                <AlertDescription>
                                    <ul className="list-disc list-inside">
                                        {interview.cheatingDetections.map((alert, i) => (
                                            <li key={i}>{alert.type} at {new Date(alert.timestamp).toLocaleTimeString()}</li>
                                        ))}
                                    </ul>
                                </AlertDescription>
                            </Alert>
                         )}
                    </CardContent>
                </Card>

            </div>
        </AppLayout>
    );
}
