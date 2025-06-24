

"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { extractSkillsFromResume } from '@/ai/flows/extract-skills-from-resume';
import { summarizeResume } from '@/ai/flows/summarize-resume';
import { matchResumeToJobs, JobMatch } from '@/ai/flows/match-resume-to-jobs';
import { advancedCandidateMatching, type AdvancedMatchingInput, type AdvancedMatchingOutput } from '@/ai/flows/advanced-candidate-matching-flow';
import { getOpenJobRequisitionsForMatching, getJobRequisitionDetailsForAdvancedMatching } from '@/lib/db';
import type { JobRequisitionInput } from '@/ai/flows/match-resume-to-jobs';
import { Loader2, UploadCloud, Tags, ClipboardList, CheckCircle, AlertTriangle, Briefcase, FileText, FileUp, BrainCircuit, Sparkles, PieChart, UserCheck as UserCheckIcon, ThumbsUp, ThumbsDown, Lightbulb, HelpCircle as HelpIcon } from "lucide-react";
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Image from "next/image";

const readFileAsDataURL = (fileToRead: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(fileToRead);
  });
};

export default function ResumeScreeningPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoadingInitialScreen, setIsLoadingInitialScreen] = useState(false);
  const [extractedSkills, setExtractedSkills] = useState<string[]>([]);
  const [resumeSummary, setResumeSummary] = useState<string>('');
  const [basicJobMatches, setBasicJobMatches] = useState<JobMatch[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const { toast } = useToast();

  const [resumeDataUri, setResumeDataUri] = useState<string | null>(null);
  const [openJobsForSelect, setOpenJobsForSelect] = useState<JobRequisitionInput[]>([]);
  const [selectedJobIdForAdvancedMatch, setSelectedJobIdForAdvancedMatch] = useState<string>('');
  const [advancedMatchingResult, setAdvancedMatchingResult] = useState<AdvancedMatchingOutput | null>(null);
  const [isAdvancedMatchingLoading, setIsAdvancedMatchingLoading] = useState(false);
  const [isFetchingJobs, setIsFetchingJobs] = useState(false);


  const resetInitialResults = () => {
    setExtractedSkills([]);
    setResumeSummary('');
    setBasicJobMatches([]);
    setAdvancedMatchingResult(null);
    setResumeDataUri(null);
    setSelectedJobIdForAdvancedMatch('');
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      const allowedMimeTypes = ['application/pdf', 'text/plain', 'text/markdown'];
      if (!allowedMimeTypes.includes(selectedFile.type)) {
          toast({ variant: "destructive", title: "Unsupported File Type", description: "Please upload a PDF, TXT, or MD file." });
          setFile(null);
          setFileName('');
          resetInitialResults();
          return;
      }
      
      if (selectedFile.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Please upload a file smaller than 5MB.",
        });
        setFile(null);
        setFileName('');
        resetInitialResults();
        return;
      }
      setFile(selectedFile);
      setFileName(selectedFile.name);
      resetInitialResults(); 

      try {
        const dataUri = await readFileAsDataURL(selectedFile);
        setResumeDataUri(dataUri);
      } catch (error) {
        console.error("Error reading file:", error);
        toast({ variant: "destructive", title: "File Error", description: "Could not read the selected file." });
        setFile(null);
        setFileName('');
        resetInitialResults();
      }
    }
  };


  const fetchOpenJobs = useCallback(async () => {
    if (!resumeDataUri) return; // Don't fetch if no resume is processed
    setIsFetchingJobs(true);
    setOpenJobsForSelect([]); // Clear previous jobs
    try {
      const jobs = await getOpenJobRequisitionsForMatching();
      setOpenJobsForSelect(jobs);
      if (jobs.length === 0) {
         // Message "No open job requisitions..." is handled in the UI directly
      }
    } catch (e) {
      console.error("Failed to fetch open job requisitions for select:", e);
      toast({
        variant: "destructive",
        title: "Job Fetching Error",
        description: "Could not fetch open job requisitions for matching.",
      });
      setOpenJobsForSelect([]);
    } finally {
      setIsFetchingJobs(false);
    }
  }, [toast, resumeDataUri]);

  const handleInitialSubmit = useCallback(async () => {
    if (!file || !resumeDataUri) {
      toast({
        variant: "destructive",
        title: "No file processed",
        description: "Please select a resume file.",
      });
      return;
    }

    setIsLoadingInitialScreen(true);
    setExtractedSkills([]);
    setResumeSummary('');
    setBasicJobMatches([]);
    setAdvancedMatchingResult(null); 
    setOpenJobsForSelect([]); // Clear jobs before fetching new ones
    setSelectedJobIdForAdvancedMatch('');


    try {
      let openJobsForBasicMatch: JobRequisitionInput[] = [];
      try {
        openJobsForBasicMatch = await getOpenJobRequisitionsForMatching();
      } catch (e) {
        console.error("Failed to fetch open job requisitions for basic matching:", e);
        toast({
          variant: "destructive",
          title: "Job Matching Error",
          description: "Could not fetch open job requisitions for basic matching. Proceeding with summary and skills extraction only.",
        });
      }
      
      const aiPromises = [
        extractSkillsFromResume({ resumeDataUri }),
        summarizeResume({ resumeDataUri }),
      ];

      if (openJobsForBasicMatch.length > 0) {
        aiPromises.push(matchResumeToJobs({ resumeDataUri, openJobRequisitions: openJobsForBasicMatch }) as any);
      } else if (openJobsForBasicMatch.length === 0 && file) { 
         toast({
          title: "No Open Jobs for Basic Match",
          description: "No open job requisitions found to perform basic match against. Showing resume summary and skills.",
        });
      }

      const results = await Promise.allSettled(aiPromises);
      let screeningCompleteMessage = "Resume processed.";
      let allSuccessful = true;

      if (results[0].status === 'fulfilled' && results[0].value) {
        setExtractedSkills((results[0].value as any).skills || []);
      } else { allSuccessful = false; 
        console.error("Skill extraction failed:", results[0].status === 'rejected' ? results[0].reason : "Unknown error");
      }
      if (results[1].status === 'fulfilled' && results[1].value) {
        setResumeSummary((results[1].value as any).summary || '');
      } else { allSuccessful = false; 
        console.error("Resume summarization failed:", results[1].status === 'rejected' ? results[1].reason : "Unknown error");
      }
      if (results.length > 2 && results[2].status === 'fulfilled' && results[2].value) {
         setBasicJobMatches((results[2].value as any).matches || []);
         if (((results[2].value as any).matches || []).length === 0 && openJobsForBasicMatch.length > 0) {
             screeningCompleteMessage += " No strong basic job matches found.";
         }
      } else if (results.length > 2) { allSuccessful = false; 
        console.error("Basic job matching failed:", results[2].status === 'rejected' ? results[2].reason : "Unknown error");
      }
      
      toast({
        title: "Initial Screening Processed",
        description: screeningCompleteMessage,
        action: allSuccessful ? <CheckCircle className="text-green-500" /> : <AlertTriangle className="text-yellow-500" />,
      });
      
      if(allSuccessful){
        // Fetch open jobs for the advanced matching select dropdown
        // This is now triggered by useEffect on resumeDataUri change as well
        await fetchOpenJobs(); 
      }

    } catch (error: any) {
      console.error("Error screening resume:", error);
      toast({ variant: "destructive", title: "Initial Screening Failed", description: error.message || "An unexpected error occurred." });
    } finally {
      setIsLoadingInitialScreen(false);
    }
  }, [file, resumeDataUri, toast, fetchOpenJobs]);
  
  // Fetch jobs when resumeDataUri is set (meaning a file has been processed)
  useEffect(() => {
    if (resumeDataUri) {
      fetchOpenJobs();
    }
  }, [resumeDataUri, fetchOpenJobs]);


  const handleRunAdvancedMatch = async () => {
    if (!resumeDataUri) {
        toast({ variant: "destructive", title: "Error", description: "Resume data not available. Please upload and screen a resume first." });
        return;
    }
    if (!selectedJobIdForAdvancedMatch) {
        toast({ variant: "destructive", title: "Error", description: "Please select a job to match against." });
        return;
    }

    setIsAdvancedMatchingLoading(true);
    setAdvancedMatchingResult(null);
    toast({ title: "Advanced Matching Started...", description: `Processing resume against selected job...` });

    try {
        const jobDetailsForFlow = await getJobRequisitionDetailsForAdvancedMatching(selectedJobIdForAdvancedMatch);
        if (!jobDetailsForFlow) {
            throw new Error("Could not fetch details for the selected job.");
        }

        const input: AdvancedMatchingInput = {
            candidateDataUri: resumeDataUri,
            jobDetails: jobDetailsForFlow
        };

        const result = await advancedCandidateMatching(input);
        setAdvancedMatchingResult(result);
        toast({ title: "Advanced Matching Complete!", description: "Results are displayed below." });

    } catch (error: any) {
        console.error("Advanced Matching Flow Error:", error);
        setAdvancedMatchingResult(null);
        toast({ variant: "destructive", title: "Advanced Matching Failed", description: error.message || "An unexpected error occurred." });
    } finally {
        setIsAdvancedMatchingLoading(false);
    }
  };
  
  const getScoreColor = (score: number): string => {
    if (score >= 75) return "bg-green-500";
    if (score >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };


  return (
    <AppLayout>
      <div className="space-y-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight font-headline">AI Resume Screening</h1>
          <p className="text-muted-foreground">Upload a resume for initial analysis, then perform an advanced match against open jobs.</p>
        </header>

        <Card className="max-w-2xl mx-auto shadow-xl">
          <CardHeader className="text-center">
             <Image 
                src="https://placehold.co/300x200.png" 
                alt="Resume Upload Illustration" 
                width={200} 
                height={133} 
                className="mx-auto mb-4 rounded-lg shadow-md"
                data-ai-hint="resume document upload"
              />
            <CardTitle className="flex items-center justify-center gap-2 text-2xl"><FileUp className="h-7 w-7 text-primary" /> Upload Resume</CardTitle>
            <CardDescription>Select a resume file (PDF, TXT, MD - max 5MB).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="resume-file" className="sr-only">Resume File</Label>
              <Input 
                id="resume-file" 
                type="file" 
                accept="application/pdf,text/plain,text/markdown" 
                onChange={handleFileChange} 
                disabled={isLoadingInitialScreen || isAdvancedMatchingLoading}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              />
              {fileName && <p className="text-sm text-muted-foreground text-center">Selected file: {fileName}</p>}
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleInitialSubmit} disabled={isLoadingInitialScreen || !file || isAdvancedMatchingLoading} className="w-full text-lg py-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md">
              {isLoadingInitialScreen ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-5 w-5" />
              )}
              Screen This Resume
            </Button>
          </CardFooter>
        </Card>

        {isLoadingInitialScreen && (
          <div className="flex flex-col items-center justify-center text-center p-8 space-y-3">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <p className="text-xl font-semibold">AI Initial Screening...</p>
            <p className="text-muted-foreground max-w-md">Extracting skills, generating summary, and performing basic job matching...</p>
          </div>
        )}

        {!isLoadingInitialScreen && (extractedSkills.length > 0 || resumeSummary || (file && basicJobMatches)) && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl"><FileText className="h-6 w-6 text-primary" /> Initial Screening Results for {fileName}</CardTitle>
              <CardDescription>AI-generated insights from the uploaded resume.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {resumeSummary && (
                <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><ClipboardList className="h-5 w-5 text-green-600" />Resume Summary</h3>
                  <ScrollArea className="h-auto max-h-40 rounded-md border p-3 bg-muted/30 shadow-inner">
                    <p className="text-sm text-foreground whitespace-pre-wrap">{resumeSummary}</p>
                  </ScrollArea>
                </div>
              )}
              
              {extractedSkills.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><Tags className="h-5 w-5 text-blue-600"/>Extracted Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {extractedSkills.map((skill, index) => (
                      <Badge key={index} variant="secondary" className="text-sm px-3 py-1 shadow-sm">{skill}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {file && basicJobMatches && basicJobMatches.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><Briefcase className="h-5 w-5 text-purple-600" />Basic Job Matches</h3>
                   <div className="space-y-3">
                    {basicJobMatches.map(match => (
                        <Card key={match.jobId} className="bg-card border shadow-sm hover:shadow-md transition-shadow">
                            <CardHeader className="p-3 pb-2">
                                <div className="flex justify-between items-start">
                                <CardTitle className="text-md font-semibold">{match.jobTitle}</CardTitle>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <Progress value={match.matchScore} className="w-24 h-2 rounded-full" indicatorClassName={getScoreColor(match.matchScore)} />
                                    <span className={`text-xs font-medium ${getScoreColor(match.matchScore).replace('bg-', 'text-')}`}>{match.matchScore}% Match</span>
                                </div>
                            </CardHeader>
                            <CardContent className="p-3 pt-0">
                                <p className="text-xs text-muted-foreground">{match.matchReasoning}</p>
                            </CardContent>
                        </Card>
                    ))}
                   </div>
                </div>
              )}
              {file && basicJobMatches && basicJobMatches.length === 0 && extractedSkills.length > 0 && ( 
                 <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><Briefcase className="h-5 w-5 text-purple-600" />Basic Job Matches</h3>
                    <p className="text-sm text-muted-foreground p-3 border rounded-md bg-muted/30 shadow-inner">No strong basic job matches found.</p>
                 </div>
              )}
            </CardContent>
            {resumeDataUri && ( // Show advanced match section only if resume data is processed
                <CardFooter className="border-t pt-6 mt-4">
                    <div className="w-full space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2"><BrainCircuit className="h-5 w-5 text-primary"/>Perform Advanced Match</h3>
                        {isFetchingJobs && <p className="text-sm text-muted-foreground"><Loader2 className="inline mr-2 h-4 w-4 animate-spin"/>Loading available jobs...</p>}
                        {!isFetchingJobs && openJobsForSelect.length === 0 && <p className="text-sm text-muted-foreground">No open job requisitions available for advanced matching.</p>}
                        {!isFetchingJobs && openJobsForSelect.length > 0 && (
                            <div className="flex flex-col sm:flex-row gap-4 items-end">
                                <div className="flex-grow space-y-1">
                                    <Label htmlFor="select-job-advanced">Select Job Requisition</Label>
                                    <Select 
                                        value={selectedJobIdForAdvancedMatch} 
                                        onValueChange={setSelectedJobIdForAdvancedMatch}
                                        disabled={isAdvancedMatchingLoading || isFetchingJobs}
                                    >
                                        <SelectTrigger id="select-job-advanced">
                                            <SelectValue placeholder="Choose a job..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {openJobsForSelect.map(job => (
                                                <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button 
                                    onClick={handleRunAdvancedMatch} 
                                    disabled={isAdvancedMatchingLoading || !selectedJobIdForAdvancedMatch || isLoadingInitialScreen}
                                    className="w-full sm:w-auto"
                                >
                                    {isAdvancedMatchingLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4 text-yellow-300" />}
                                    Run Advanced Match
                                </Button>
                            </div>
                        )}
                    </div>
                </CardFooter>
            )}
          </Card>
        )}

        {isAdvancedMatchingLoading && (
          <Card className="shadow-lg mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                Running Advanced Candidate Matching...
              </CardTitle>
              <p className="text-sm text-muted-foreground">AI is analyzing the resume against the selected job. This may take a moment.</p>
            </CardHeader>
            <CardContent className="flex justify-center items-center min-h-[200px]">
                <Image src="https://placehold.co/300x200.png" alt="AI Processing" width={300} height={200} data-ai-hint="ai brain network"/>
            </CardContent>
          </Card>
        )}

        {advancedMatchingResult && !isAdvancedMatchingLoading && (
          <div className="space-y-6 mt-8">
            <Card className="shadow-xl border-2 border-primary/50">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-primary flex items-center gap-2">
                  <BrainCircuit className="h-7 w-7" /> Advanced Matching Results
                </CardTitle>
                 <p className="text-sm text-muted-foreground">
                  Candidate: {fileName} <br />
                  Matched Against Job: {openJobsForSelect.find(j => j.id === selectedJobIdForAdvancedMatch)?.title || 'Selected Job'}
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Overall Match Percentage:</h3>
                  <Badge className="text-2xl px-4 py-2" variant={advancedMatchingResult.overallMatchPercentage >= 75 ? "default" : advancedMatchingResult.overallMatchPercentage >=50 ? "secondary" : "destructive"}>
                    {advancedMatchingResult.overallMatchPercentage}%
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{advancedMatchingResult.matchReasoning}</p>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><PieChart className="h-5 w-5 text-accent"/>Dimensional Scores</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(advancedMatchingResult.dimensionalScores).map(([key, value]) => (
                    <div key={key}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').replace('Score', '').trim()}</span>
                        <span className="font-semibold">{value}%</span>
                      </div>
                      <Progress value={value} className="h-2" indicatorClassName={getScoreColor(value)} />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><UserCheckIcon className="h-5 w-5 text-accent"/>Detailed Assessment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div>
                    <h4 className="font-semibold flex items-center gap-1"><ThumbsUp className="h-4 w-4 text-green-500"/>Strengths:</h4>
                    <ul className="list-disc list-inside ml-4 text-muted-foreground">
                      {advancedMatchingResult.detailedAssessment.strengths.map((s, i) => <li key={`strength-${i}`}>{s}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold flex items-center gap-1"><ThumbsDown className="h-4 w-4 text-red-500"/>Areas for Improvement:</h4>
                    <ul className="list-disc list-inside ml-4 text-muted-foreground">
                      {advancedMatchingResult.detailedAssessment.areasForImprovement.map((a, i) => <li key={`improvement-${i}`}>{a}</li>)}
                    </ul>
                  </div>
                  {advancedMatchingResult.detailedAssessment.missingCriticalSkills.length > 0 && (
                     <div>
                        <h4 className="font-semibold flex items-center gap-1"><AlertTriangle className="h-4 w-4 text-orange-500"/>Missing Critical Skills:</h4>
                        <ul className="list-disc list-inside ml-4 text-muted-foreground">
                        {advancedMatchingResult.detailedAssessment.missingCriticalSkills.map((s, i) => <li key={`missing-${i}`}>{s}</li>)}
                        </ul>
                    </div>
                  )}
                  <p><span className="font-semibold">Career Trajectory:</span> {advancedMatchingResult.detailedAssessment.careerTrajectoryAnalysis}</p>
                  <p><span className="font-semibold">Cultural Fit Score:</span> {advancedMatchingResult.detailedAssessment.culturalFitScore}/10</p>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-accent"/>Highlighted Matches</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                        <div>
                            <h4 className="font-semibold text-sm mb-1">Matched Skills:</h4>
                            <div className="flex flex-wrap gap-1.5">
                                {advancedMatchingResult.highlightedMatchedSkills.map((s, i) => <Badge key={`hl-skill-${i}`} variant="secondary">{s}</Badge>)}
                            </div>
                        </div>
                         <div>
                            <h4 className="font-semibold text-sm mb-1">Matched Experience:</h4>
                            <ul className="list-disc list-inside ml-4 text-xs text-muted-foreground">
                                {advancedMatchingResult.highlightedMatchedExperience.map((exp, i) => <li key={`hl-exp-${i}`}>{exp}</li>)}
                            </ul>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><HelpIcon className="h-5 w-5 text-accent"/>Interview & Fit</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                         <div>
                            <h4 className="font-semibold text-sm mb-1">Generated Interview Questions:</h4>
                            <ul className="list-decimal list-inside ml-4 text-xs text-muted-foreground">
                                {advancedMatchingResult.generatedInterviewQuestions.map((q, i) => <li key={`question-${i}`}>{q}</li>)}
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold text-sm mb-1">Fit Assessment Summary:</h4>
                            <p className="text-xs text-muted-foreground">{advancedMatchingResult.fitAssessmentSummary}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-accent"/>Recommendations for Candidate</CardTitle></CardHeader>
                <CardContent>
                     <ul className="list-disc list-inside ml-4 text-sm text-muted-foreground">
                        {advancedMatchingResult.improvementRecommendations.map((rec, i) => <li key={`rec-${i}`}>{rec}</li>)}
                    </ul>
                </CardContent>
            </Card>
             <CardFooter>
                <p className="text-xs text-muted-foreground">
                    <AlertTriangle className="inline-block h-3 w-3 mr-1 text-yellow-500" />
                    AI-generated content should be reviewed for accuracy. These insights are to aid your decision-making.
                </p>
            </CardFooter>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
