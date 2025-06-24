
"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { 
  CalendarCheck2, Video, MessageSquareText, Settings2, Users, FileText,
  ClipboardPlus, Sparkles, LockKeyhole, LogIn, Mic, ScreenShare, BrainCircuit,
  AudioWaveform, GraduationCap, Puzzle, Eye, Timer, ShieldAlert, Zap,
  TrendingUp, GitCompareArrows, Mail, CalendarDays, Share2, BarChartHorizontalBig,
  LayoutGrid, Loader2, Trash2, CheckCircle
} from "lucide-react";
import React, { useState, useEffect, useCallback } from 'react';
import { ScheduleInterviewDialog, type InterviewEventFormData } from '@/components/interview-system/ScheduleInterviewDialog';
import { useToast } from "@/hooks/use-toast";
import type { ScheduledInterview, InterviewLink } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


interface ScheduledInterviewWithDate extends ScheduledInterview {
    dateObj: Date;
}

export default function InterviewSystemPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [interviews, setInterviews] = useState<ScheduledInterviewWithDate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchLocalData = useCallback(() => {
    setIsLoading(true);
    try {
        const storedInterviews = localStorage.getItem('local_interviews');
        if(storedInterviews) {
            const parsedInterviews: ScheduledInterview[] = JSON.parse(storedInterviews);
            const interviewsWithDateObjects = parsedInterviews.map(int => ({
                ...int,
                dateObj: new Date(int.interviewDateTime)
            }));
            setInterviews(interviewsWithDateObjects);
        } else {
            setInterviews([]);
        }
    } catch (error) {
        toast({variant: "destructive", title: "Load Error", description: "Could not load local interview data."});
        setInterviews([]);
    } finally {
        setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchLocalData();
  }, [fetchLocalData]);

  const handleSaveInterview = async (
    newEventData: InterviewEventFormData, 
    id?: string, 
    integrationOptions?: { sendEmail: boolean; }
  ) => {
    setIsLoading(true);
    
    let successTitle = "Success";
    let successDescription = "";

    if (id) {
        // Editing an existing interview
        const updatedInterviews = interviews.map(int => {
            if (int.id === id) {
                // Explicitly merge to ensure resume/JD URIs are preserved
                const updatedInt: ScheduledInterviewWithDate = {
                    ...int, // Start with the old interview data (which has the URIs)
                    ...newEventData, // Overwrite with new data from the form
                    dateObj: new Date(newEventData.interviewDateTime), // Update the date object
                };
                return updatedInt;
            }
            return int;
        });
        setInterviews(updatedInterviews);
        localStorage.setItem('local_interviews', JSON.stringify(updatedInterviews));
        successTitle = "Interview Updated";
        successDescription = "The interview details have been updated locally.";
    } else {
        // Creating a new interview
        const newInterview: ScheduledInterviewWithDate = {
            ...newEventData,
            id: `local-${Date.now()}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            dateObj: new Date(newEventData.interviewDateTime),
            interviewers: newEventData.interviewers || ['AI Interviewer'],
        };
        const updatedInterviews = [...interviews, newInterview];
        setInterviews(updatedInterviews);
        localStorage.setItem('local_interviews', JSON.stringify(updatedInterviews));
        
        // Also create and save the interview link
        const newLink: InterviewLink = {
            id: `link-${newInterview.id}`,
            jobTitle: newInterview.jobTitle,
            candidateName: newInterview.candidateName,
            linkUrl: `/live-interview/${newInterview.id}`,
            type: 'AI Interview Link',
            createdAt: new Date().toISOString(),
        };
        const existingLinks: InterviewLink[] = JSON.parse(localStorage.getItem('local_links') || '[]');
        const updatedLinks = [...existingLinks, newLink];
        localStorage.setItem('local_links', JSON.stringify(updatedLinks));

        successTitle = "Interview Scheduled";
        successDescription = "Interview scheduled and link created.";
    }

    if (integrationOptions?.sendEmail) {
        successDescription += ` An invitation email would be sent to ${newEventData.candidateEmail}.`;
    }
    
    toast({ title: successTitle, description: successDescription, duration: 6000 });

    setIsLoading(false);
  };

  const handleDeleteInterview = async (interviewId: string) => {
    const updatedInterviews = interviews.filter(int => int.id !== interviewId);
    setInterviews(updatedInterviews);
    localStorage.setItem('local_interviews', JSON.stringify(updatedInterviews));
    toast({ title: "Interview Deleted", description: "The scheduled interview has been removed locally." });
  };

  const todaysInterviews = interviews.filter(
    int => selectedDate && int.dateObj.toDateString() === selectedDate.toDateString()
  ).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());


  const FeatureItem: React.FC<{icon: React.ElementType, title: string, description: string, status?: 'Implemented' | 'Planned' }> = ({icon: Icon, title, description, status}) => {
      const statusBadge = status ? (
        <Badge
          variant={
            status === 'Implemented' ? 'default' :
            'outline'
          }
          className={`ml-2 text-xs ${
            status === 'Implemented' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-200 dark:border-green-600' :
            'border-dashed'
          }`}
        >
          {status}
        </Badge>
      ) : null;

      return (
        <div className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg">
          <Icon className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-sm flex items-center">{title}{statusBadge}</h4>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      );
  };


  return (
    <AppLayout>
      <div className="space-y-8">
        <header className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline">Interview System</h1>
            <p className="text-muted-foreground">Schedule, manage, track, and conduct intelligent interviews.</p>
          </div>
          <ScheduleInterviewDialog onSaveInterview={handleSaveInterview} />
        </header>

        <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700">
          <CheckCircle className="h-4 w-4 !text-blue-600" />
          <AlertTitle className="text-blue-700 dark:text-blue-300">Local Data Mode</AlertTitle>
          <AlertDescription className="text-blue-600 dark:text-blue-400">
            Interview data is currently saved in your browser's local storage for demonstration.
          </AlertDescription>
        </Alert>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Interview Calendar</CardTitle>
                 <CardDescription>Select a date to view scheduled interviews.</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border"
                  disabled={isLoading}
                />
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2 space-y-6">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>
                  Scheduled Interviews for {selectedDate ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Today'}
                </CardTitle>
                <CardDescription>
                  {isLoading ? "Loading interviews..." : todaysInterviews.length > 0 ? `You have ${todaysInterviews.length} interview(s) scheduled.` : "No interviews scheduled for this date."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-h-96 overflow-y-auto">
                {isLoading && interviews.length === 0 ? (
                     <div className="flex justify-center items-center h-32">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                     </div>
                ): todaysInterviews.length > 0 ? todaysInterviews.map(interview => (
                  <Card key={interview.id} className="bg-muted/30">
                    <CardHeader className="p-4">
                      <CardTitle className="text-md">{interview.candidateName} - <span className="font-normal">{interview.jobTitle}</span></CardTitle>
                      <CardDescription>{interview.interviewType} with {interview.interviewers?.join(', ') || "AI"}</CardDescription>
                    </CardHeader>
                    <CardFooter className="p-4 pt-0 flex justify-between items-center">
                       <div className="flex gap-1">
                        {interview.analysis ? (
                           <Button variant="secondary" size="sm" asChild>
                              <Link href={`/interview-results/${interview.id}`}>
                                <BarChartHorizontalBig className="mr-2 h-4 w-4"/> View Analysis
                              </Link>
                           </Button>
                        ) : (
                           <Button variant="default" size="sm" asChild>
                              <Link href={`/live-interview/${interview.id}`}>
                                <Video className="mr-2 h-4 w-4" /> Start Interview
                              </Link>
                           </Button>
                        )}
                        <ScheduleInterviewDialog interview={interview} onSaveInterview={handleSaveInterview} />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="icon" className="text-destructive hover:text-destructive h-9 w-9">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will delete the interview for {interview.candidateName} on {interview.dateObj.toLocaleDateString()}.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteInterview(interview.id)} disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                       </div>
                    </CardFooter>
                  </Card>
                )) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Select a date with scheduled interviews or add new ones.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ClipboardPlus className="h-5 w-5 text-primary"/>Interview Creation &amp; Setup</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <FeatureItem icon={Sparkles} title="Smart Interview Generation" description="Create interviews linked to specific jobs and candidates." status="Implemented"/>
                    <FeatureItem icon={BrainCircuit} title="AI Question Generation" description="System automatically generates relevant questions based on job requirements and candidate skills." status="Implemented"/>
                    <FeatureItem icon={LockKeyhole} title="Secure Link Creation" description="Each interview gets a unique token for secure access." status="Implemented"/>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary"/>Candidate Experience</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <FeatureItem icon={LogIn} title="No Login Required" description="Candidates access interviews directly via secure links." status="Implemented"/>
                    <FeatureItem icon={Mic} title="Video &amp; Audio Interface" description="Supports video and audio responses for a comprehensive one-way interview experience." status="Implemented"/>
                    <FeatureItem icon={ScreenShare} title="Real-Time Monitoring" description="Optional camera monitoring with candidate consent." status="Implemented"/>
                    <FeatureItem icon={Zap} title="Progressive Questions" description="Candidates move through questions at their own pace." status="Implemented"/>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-primary"/>AI-Powered Assessment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <FeatureItem icon={BrainCircuit} title="Gemini 1.5 Integration" description="Uses Google's Gemini model for intelligent question generation and response analysis." status="Implemented"/>
                    <FeatureItem icon={AudioWaveform} title="AI Audio Processing" description="Converts voice responses to text for transcription and analysis using Gemini models." status="Implemented"/>
                    <FeatureItem icon={Puzzle} title="Automatic Scoring" description="AI evaluates responses and provides percentage scores." status="Implemented"/>
                    <FeatureItem icon={Sparkles} title="Skill-Based Evaluation" description="Assesses technical competencies, communication skills, and cultural fit." status="Implemented"/>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Timer className="h-5 w-5 text-primary"/>Real-Time Features</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <FeatureItem icon={Eye} title="Live Monitoring" description="Track candidate behavior, tab switches, and focus loss." status="Implemented"/>
                    <FeatureItem icon={Timer} title="Time Management" description="Built-in timers and progress tracking for each question." status="Implemented"/>
                    <FeatureItem icon={ShieldAlert} title="Session Security" description="Prevents cheating through monitoring and session controls." status="Implemented"/>
                    <FeatureItem icon={Zap} title="Instant Feedback" description="Immediate scoring and assessment results after interview completion." status="Implemented"/>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BarChartHorizontalBig className="h-5 w-5 text-primary"/>Results &amp; Analytics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <FeatureItem icon={FileText} title="Comprehensive Scoring" description="Overall interview scores with detailed breakdowns." status="Implemented"/>
                    <FeatureItem icon={MessageSquareText} title="Transcript Generation" description="Full text transcripts of all responses." status="Implemented"/>
                    <FeatureItem icon={TrendingUp} title="Performance Insights" description="Detailed analysis of candidate strengths and weaknesses." status="Implemented"/>
                    <FeatureItem icon={GitCompareArrows} title="Comparison Tools" description="Compare candidates across multiple dimensions." status="Implemented"/>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5 text-primary"/>Integration Features</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <FeatureItem icon={Mail} title="Email Automation" description="Simulated sending of invitation emails upon scheduling." status="Implemented"/>
                    <FeatureItem icon={CalendarDays} title="Calendar Integration" description="Simulated creation of calendar events upon scheduling." status="Planned"/>
                    <FeatureItem icon={Share2} title="ATS Integration" description="Seamlessly connects with your existing hiring workflow." status="Implemented"/>
                    <FeatureItem icon={LayoutGrid} title="Reporting Dashboard" description="Track interview completion rates and candidate performance." status="Implemented"/>
                </CardContent>
            </Card>
        </div>
        
        <Card>
            <CardContent className="pt-6">
                 <p className="text-sm text-muted-foreground text-center">
                    The system essentially automates the entire interview process from creation to final assessment, 
                    providing consistent, bias-free evaluations while saving significant time for hiring teams.
                </p>
            </CardContent>
        </Card>

      </div>
    </AppLayout>
  );
}
