
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Edit2, Loader2, FileUp, BrainCircuit, Trash2, ArrowLeft, Mail, CalendarDays as CalendarIcon } from 'lucide-react';
import type { ScheduledInterview, InterviewType } from '@/lib/types';
import { INTERVIEW_TYPES } from '@/lib/types';
import { generateInterviewQuestions } from '@/ai/flows/generate-interview-questions';
import { ScrollArea } from '../ui/scroll-area';
import { Switch } from '../ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';

export type InterviewEventFormData = Omit<ScheduledInterview, 'id' | 'createdAt' | 'updatedAt'>;

interface ScheduleInterviewDialogProps {
  interview?: ScheduledInterview; // For editing
  onSaveInterview: (newEvent: InterviewEventFormData, id?:string, integrationOptions?: { sendEmail: boolean; }) => Promise<void> | void;
  trigger?: React.ReactNode;
}

const readFileAsDataURL = (fileToRead: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(fileToRead);
  });
};

export const ScheduleInterviewDialog: React.FC<ScheduleInterviewDialogProps> = ({ interview, onSaveInterview, trigger }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [type, setType] = useState<InterviewType>(INTERVIEW_TYPES[0]);
  const [notes, setNotes] = useState('');
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [resumeDataUri, setResumeDataUri] = useState<string | null>(null);
  const [jdDataUri, setJdDataUri] = useState<string | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const isEditing = !!interview;

  const [view, setView] = useState<'form' | 'questions'>('form');
  const [generatedQuestions, setGeneratedQuestions] = useState<string[]>([]);
  const [newQuestion, setNewQuestion] = useState('');

  const [sendEmailInvite, setSendEmailInvite] = useState(true);

  const resetForm = useCallback(() => {
    setCandidateName('');
    setCandidateEmail('');
    setJobTitle('');
    setType(INTERVIEW_TYPES[0]);
    setNotes('');
    setResumeFile(null);
    setJdFile(null);
    setResumeDataUri(null);
    setJdDataUri(null);
    setGeneratedQuestions([]);
    setNewQuestion('');
    setView('form');
    setSendEmailInvite(true);
    const defaultDate = new Date();
    defaultDate.setHours(0, 0, 0, 0);
    setSelectedDate(defaultDate);
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (interview) {
        setCandidateName(interview.candidateName);
        setCandidateEmail(interview.candidateEmail || '');
        setJobTitle(interview.jobTitle);
        setType(interview.interviewType);
        setNotes(interview.notes || '');
        setResumeDataUri(interview.resumeDataUri || null);
        setJdDataUri(interview.jobDescriptionDataUri || null);

        const date = new Date(interview.interviewDateTime);
        setSelectedDate(date);
        
        if (interview.questions && interview.questions.length > 0) {
          setGeneratedQuestions(interview.questions);
          setView('questions');
        } else {
          setView('form');
          setGeneratedQuestions([]);
        }
        setResumeFile(null);
        setJdFile(null);
        setSendEmailInvite(true);
      } else {
        resetForm();
      }
    }
  }, [interview, isOpen, resetForm]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, fileType: 'resume' | 'jd') => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedMimeTypes = ['application/pdf', 'text/plain', 'text/markdown'];
    if (!allowedMimeTypes.includes(file.type)) {
        toast({ variant: "destructive", title: "Unsupported File Type", description: "Please upload a PDF, TXT, or MD file." });
        return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ variant: "destructive", title: "File too large", description: `Please upload a file smaller than 5MB.` });
        return;
    }

    try {
        const dataUri = await readFileAsDataURL(file);
        if (fileType === 'resume') {
            setResumeFile(file);
            setResumeDataUri(dataUri);
        } else {
            setJdFile(file);
            setJdDataUri(dataUri);
        }
        toast({ title: "File Ready", description: `${file.name} has been processed and is ready.` });
    } catch (error) {
        console.error(`Error processing ${fileType} file:`, error);
        toast({ variant: "destructive", title: "File Error", description: `Could not process ${file.name}.` });
    }
  };


  const handleGenerateQuestions = async () => {
    if (!candidateName || !jobTitle || !type || !candidateEmail) {
      toast({ variant: "destructive", title: "Missing fields", description: "Please fill in all required scheduling fields." });
      return;
    }
     if (!selectedDate) {
      toast({ variant: "destructive", title: "Missing Date", description: "Please select an interview date." });
      return;
    }
    if (!resumeDataUri || !jdDataUri) {
        toast({ variant: "destructive", title: "Files Required", description: "Please upload both a resume and a job description to generate questions." });
        return;
    }

    setIsGenerating(true);
    toast({ title: "Generating Questions...", description: "AI is analyzing the resume and job description." });
    
    try {
      const { questions } = await generateInterviewQuestions({
          resumeDataUri,
          jobDescriptionDataUri: jdDataUri 
      });

      if (!questions || questions.length === 0) {
        throw new Error("AI failed to generate any questions.");
      }
      
      setGeneratedQuestions(questions);
      setView('questions'); // Move to the next view
      toast({ title: "Questions Generated!", description: "Review, edit, and finalize the questions below." });
    } catch (error: any) {
      console.error("Error generating questions:", error);
      toast({ variant: "destructive", title: "Generation Failed", description: error.message || "An unexpected error occurred." });
    } finally {
      setIsGenerating(false);
    }
  };


  const handleSaveInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (generatedQuestions.length === 0) {
        toast({ variant: "destructive", title: "No Questions", description: "Please add at least one question for the interview." });
        return;
    }
    if (!selectedDate) {
      toast({ variant: "destructive", title: "Missing Date", description: "Interview date is not set." });
      return;
    }
    
    setIsSaving(true);

    const finalDate = new Date(selectedDate);
    finalDate.setHours(0, 0, 0, 0); // Set time to the beginning of the day
    const finalInterviewDateTime = finalDate.toISOString();
    
    try {
      await onSaveInterview({ 
          candidateName,
          candidateEmail, 
          jobTitle,
          interviewDateTime: finalInterviewDateTime, 
          interviewType: type, notes,
          questions: generatedQuestions,
          interviewers: interview?.interviewers || ['AI Interviewer'],
          resumeDataUri: resumeDataUri || undefined,
          jobDescriptionDataUri: jdDataUri || undefined,
      }, interview?.id, {
          sendEmail: sendEmailInvite
      });

      setIsOpen(false);
    } catch (error: any) {
      console.error("Error saving interview:", error);
      toast({ variant: "destructive", title: "Scheduling Failed", description: error.message || "An unexpected error occurred." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuestionChange = (index: number, value: string) => {
    const updatedQuestions = [...generatedQuestions];
    updatedQuestions[index] = value;
    setGeneratedQuestions(updatedQuestions);
  };
  
  const handleQuestionDelete = (index: number) => {
    const updatedQuestions = generatedQuestions.filter((_, i) => i !== index);
    setGeneratedQuestions(updatedQuestions);
  };

  const handleQuestionAdd = () => {
    if (newQuestion.trim()) {
      setGeneratedQuestions([...generatedQuestions, newQuestion.trim()]);
      setNewQuestion('');
    }
  };
  
  const defaultTrigger = (
    <Button disabled={isSaving}>
      <PlusCircle className="mr-2 h-4 w-4" /> Schedule AI Interview
    </Button>
  );

  const editTriggerButton = (
    <Button variant="outline" size="icon" className="h-9 w-9" disabled={isSaving}>
      <Edit2 className="h-4 w-4" />
       <span className="sr-only">Edit Interview</span>
    </Button>
  );
  
  const renderFormView = () => (
    <form onSubmit={(e) => { e.preventDefault(); handleGenerateQuestions(); }}>
        <DialogHeader>
            <DialogTitle>{isEditing ? "Edit" : "Schedule New"} AI Interview - Step 1 of 2</DialogTitle>
            <DialogDescription>
            Provide details and documents (PDF, TXT, MD). The AI will generate questions in the next step.
            </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-1">
              <Label htmlFor="candidateNameSched">Candidate Name</Label>
              <Input id="candidateNameSched" value={candidateName} onChange={(e) => setCandidateName(e.target.value)} required disabled={isGenerating}/>
            </div>
            <div className="space-y-1">
              <Label htmlFor="candidateEmailSched">Candidate Email</Label>
              <Input id="candidateEmailSched" type="email" value={candidateEmail} onChange={(e) => setCandidateEmail(e.target.value)} required disabled={isGenerating} placeholder="candidate@example.com"/>
            </div>
            <div className="space-y-1">
              <Label htmlFor="jobTitleSched">Job Title</Label>
              <Input id="jobTitleSched" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} required disabled={isGenerating}/>
            </div>
            <div className="space-y-1">
              <Label>Interview Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-3 p-3 border rounded-md bg-muted/20">
                <h4 className="text-sm font-medium flex items-center gap-2"><FileUp className="h-4 w-4 text-primary"/> Upload Documents</h4>
                <div className="space-y-1">
                    <Label htmlFor="resumeFile">Candidate Resume</Label>
                    <Input id="resumeFile" type="file" accept="application/pdf,text/plain,text/markdown" onChange={e => handleFileChange(e, 'resume')} required disabled={isGenerating} className="file:text-xs"/>
                </div>
                <div className="space-y-1">
                    <Label htmlFor="jdFile">Job Description</Label>
                    <Input id="jdFile" type="file" accept="application/pdf,text/plain,text/markdown" onChange={e => handleFileChange(e, 'jd')} required disabled={isGenerating} className="file:text-xs"/>
                </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="typeSched">Type</Label>
              <Select value={type} onValueChange={(value: InterviewType) => setType(value)} disabled={isGenerating}>
                  <SelectTrigger id="typeSched"><SelectValue placeholder="Select interview type" /></SelectTrigger>
                  <SelectContent>
                  {INTERVIEW_TYPES.map(t => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                  </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="notesSched">Notes (Optional)</Label>
              <Textarea id="notesSched" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any specific instructions or notes for this interview..." disabled={isGenerating}/>
            </div>
        </div>
        <DialogFooter className="mt-4 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isGenerating}>Cancel</Button>
            <Button type="submit" disabled={isGenerating}>
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4" />}
            Generate Questions
            </Button>
        </DialogFooter>
    </form>
  );

  const renderQuestionsView = () => (
     <form onSubmit={handleSaveInterview}>
        <DialogHeader>
            <DialogTitle>Review Questions - Step 2 of 2</DialogTitle>
            <DialogDescription>
            Edit the AI-generated questions or add your own, then save to schedule.
            </DialogDescription>
        </DialogHeader>
        <ScrollArea className="py-4 max-h-[60vh] overflow-y-auto pr-4">
            <div className="space-y-3">
                {generatedQuestions.map((q, index) => (
                    <div key={index} className="flex items-center gap-2">
                    <Label htmlFor={`q-${index}`} className="sr-only">Question {index+1}</Label>
                    <Textarea id={`q-${index}`} value={q} onChange={(e) => handleQuestionChange(index, e.target.value)} disabled={isSaving} rows={1} className="text-sm flex-grow"/>
                    <Button type="button" variant="ghost" size="icon" onClick={() => handleQuestionDelete(index)} disabled={isSaving}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                    </div>
                ))}
            </div>
            <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                <Input
                    placeholder="Add a new custom question..."
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleQuestionAdd(); }}}
                    disabled={isSaving}
                />
                <Button type="button" variant="outline" onClick={handleQuestionAdd} disabled={isSaving}>
                    <PlusCircle className="mr-2 h-4 w-4"/> Add
                </Button>
            </div>
            <div className="space-y-3 p-3 border rounded-md bg-muted/20 mt-4">
                <h4 className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary"/> Integrations
                </h4>
                 <p className="text-xs text-muted-foreground">
                    This action would trigger a backend function to send an email.
                 </p>
                <div className="flex items-center justify-between">
                    <Label htmlFor="sendEmailInvite" className="cursor-pointer text-sm font-normal">Send Email Invitation</Label>
                    <Switch id="sendEmailInvite" checked={sendEmailInvite} onCheckedChange={setSendEmailInvite} disabled={isSaving}/>
                </div>
            </div>
        </ScrollArea>
        <DialogFooter className="mt-4 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setView('form')} disabled={isSaving}>
                <ArrowLeft className="mr-2 h-4 w-4"/> Back
            </Button>
            <Button type="submit" disabled={isSaving || generatedQuestions.length === 0}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Save Changes" : "Save and Schedule"}
            </Button>
        </DialogFooter>
    </form>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!isSaving && !isGenerating) setIsOpen(open); }}>
      <DialogTrigger asChild>
        {trigger ? trigger : (isEditing ? editTriggerButton : defaultTrigger)}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        {view === 'form' ? renderFormView() : renderQuestionsView()}
      </DialogContent>
    </Dialog>
  );
};
