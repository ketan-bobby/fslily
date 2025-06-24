
"use client";

import React, { useState, useEffect, ChangeEvent, useCallback } from 'react';
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Edit2, Loader2, Info, FileText } from 'lucide-react';
import type { Project, ProjectStatus } from '@/lib/types';
import { PROJECT_STATUSES } from '@/lib/types';
import { parseJobDescription } from '@/ai/flows/parse-job-description';

export type ProjectFormData = Omit<Project, 'id' | 'createdAt' | 'updatedAt'>;

interface AddProjectDialogProps {
  project?: Project;
  onSaveProject: (data: ProjectFormData, id?: string) => Promise<void> | void;
  trigger?: React.ReactNode;
  customTrigger?: React.ReactNode;
}

const readFileAsDataURL = (fileToRead: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(fileToRead);
  });
};

export const AddProjectDialog: React.FC<AddProjectDialogProps> = ({ project, onSaveProject, trigger, customTrigger }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [manager, setManager] = useState('');
  const [status, setStatus] = useState<ProjectStatus>(PROJECT_STATUSES[1]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionFileName, setDescriptionFileName] = useState('');

  const [jobsCount, setJobsCount] = useState(0);
  const [candidatesInPipeline, setCandidatesInPipeline] = useState(0);
  const [interviewsCount, setInterviewsCount] = useState(0);
  const [progress, setProgress] = useState(0);

  const [isSaving, setIsSaving] = useState(false);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const { toast } = useToast();
  const isEditing = !!project;

  const resetForm = useCallback(() => {
    setName('');
    setManager('');
    setStatus(PROJECT_STATUSES[1]);
    setStartDate('');
    setEndDate('');
    setDescription('');
    setDescriptionFileName('');
    setJobsCount(0);
    setCandidatesInPipeline(0);
    setInterviewsCount(0);
    setProgress(0);
    const fileInput = document.getElementById('descriptionFile') as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (project) {
        setName(project.name);
        setManager(project.manager);
        setStatus(project.status);
        setStartDate(project.startDate || '');
        setEndDate(project.endDate || '');
        setDescription(project.description || '');
        setDescriptionFileName('');
        setJobsCount(project.jobsCount);
        setCandidatesInPipeline(project.candidatesInPipeline);
        setInterviewsCount(project.interviewsCount);
        setProgress(project.progress);
      } else {
        resetForm();
      }
    }
  }, [project, isOpen, resetForm]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const allowedMimeTypes = ['application/pdf', 'text/plain', 'text/markdown'];
      if (!allowedMimeTypes.includes(file.type)) {
         toast({ variant: "destructive", title: "Unsupported File Type", description: "Please upload a PDF, TXT, or MD file." });
         setDescriptionFileName('');
         if (event.target) event.target.value = "";
         return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB Limit
          toast({ variant: "destructive", title: "File Too Large", description: "Please upload a file smaller than 5MB." });
          setDescriptionFileName('');
          if (event.target) event.target.value = "";
          return;
      }
      
      setDescriptionFileName(file.name);
      setIsParsingFile(true);
      toast({ title: "Parsing File...", description: `AI is processing ${file.name} to extract description.`});

      try {
        const dataUri = await readFileAsDataURL(file);
        
        console.log(`[AddProjectDialog] Calling parseJobDescription. Data URI prefix: ${dataUri.substring(0, 100)}... Length: ${dataUri.length}`);
        const parsedData = await parseJobDescription({ jobDescriptionDataUri: dataUri });

        if (parsedData && parsedData.description) {
          setDescription(parsedData.description);
          if (parsedData.title && !name.trim()) setName(parsedData.title); 
          toast({ title: "Description Extracted", description: "AI has populated the project description field." });
        } else {
          toast({ variant: "destructive", title: "Parsing Issue", description: "AI could not extract a description. Please ensure the file has clear text or copy-paste manually." });
        }
      } catch (error: any) {
        console.error("Error parsing project description file:", error);
        toast({ variant: "destructive", title: "File Parsing Failed", description: error.message || "Could not parse the file with AI." });
      } finally {
        setIsParsingFile(false);
      }
    } else {
      setDescriptionFileName('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !manager || !status) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please fill in Project Name, Manager, and Status.",
      });
      return;
    }
    if (progress < 0 || progress > 100) {
      toast({
        variant: "destructive",
        title: "Invalid Progress",
        description: "Progress must be between 0 and 100.",
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSaveProject({
        name,
        manager,
        status,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        description: description || undefined,
        jobsCount: project?.jobsCount || 0,
        candidatesInPipeline: project?.candidatesInPipeline || 0,
        interviewsCount: project?.interviewsCount || 0,
        progress
      }, project?.id);
      setIsOpen(false); 
    } catch (error) {
      console.error("Error in dialog submit:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const defaultTrigger = (
    <Button>
      <PlusCircle className="mr-2 h-4 w-4" /> Create New Project
    </Button>
  );

  const editTriggerButton = (
     <Button variant="outline" size="sm" className="w-full text-xs">
      <Edit2 className="mr-1.5 h-3 w-3" /> Edit
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!isSaving && !isParsingFile) setIsOpen(open);}}>
      <DialogTrigger asChild>
        {customTrigger ? customTrigger : (trigger ? trigger : (isEditing ? editTriggerButton : defaultTrigger))}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit" : "Create New"} Project</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the project details." : "Enter the details for the new recruitment project. Upload a file for AI-assisted description filling."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto space-y-3 pr-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="projectName">Project Name</Label>
                <Input id="projectName" value={name} onChange={(e) => setName(e.target.value)} required disabled={isSaving || isParsingFile}/>
              </div>
              <div className="space-y-1">
                <Label htmlFor="projectManager">Manager</Label>
                <Input id="projectManager" value={manager} onChange={(e) => setManager(e.target.value)} required disabled={isSaving || isParsingFile}/>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="projectStatus">Status</Label>
              <Select value={status} onValueChange={(val: ProjectStatus) => setStatus(val)} disabled={isSaving || isParsingFile}>
                <SelectTrigger id="projectStatus"><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="startDate">Start Date (Optional)</Label>
                <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={isSaving || isParsingFile}/>
              </div>
              <div className="space-y-1">
                <Label htmlFor="endDate">End Date (Optional)</Label>
                <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={isSaving || isParsingFile}/>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="descriptionFile">Upload File for Description (Optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="descriptionFile"
                  type="file"
                  accept="application/pdf,text/plain,text/markdown"
                  onChange={handleFileChange}
                  disabled={isSaving || isParsingFile}
                  className="file:mr-2 file:py-1 file:px-2 file:rounded-md file:border file:border-input file:bg-transparent file:text-xs file:font-medium file:text-foreground hover:file:bg-accent hover:file:text-accent-foreground"
                />
                {isParsingFile && <Loader2 className="h-4 w-4 animate-spin" />}
                {descriptionFileName && !isParsingFile && <FileText className="h-4 w-4 text-muted-foreground" />}
              </div>
               {descriptionFileName && !isParsingFile && <p className="text-xs text-muted-foreground">Selected: {descriptionFileName}</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  AI parsing is supported for PDF, TXT, and MD files.
                </p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="description">Project Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSaving || isParsingFile}
                rows={4}
                placeholder="Overall project goals, primary role overview, or client details. Upload a file for AI-assist, or type manually."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="jobsCount">Jobs Count</Label>
                <Input id="jobsCount" type="number" value={jobsCount} readOnly disabled={isSaving || isParsingFile} className="bg-muted/50 cursor-not-allowed"/>
              </div>
              <div className="space-y-1">
                <Label htmlFor="candidatesInPipeline">Candidates</Label>
                <Input id="candidatesInPipeline" type="number" value={candidatesInPipeline} readOnly disabled={isSaving || isParsingFile} className="bg-muted/50 cursor-not-allowed"/>
              </div>
              <div className="space-y-1">
                <Label htmlFor="interviewsCount">Interviews Count</Label>
                <Input id="interviewsCount" type="number" value={interviewsCount} readOnly disabled={isSaving || isParsingFile} className="bg-muted/50 cursor-not-allowed"/>
              </div>
            </div>
             <p className="text-xs text-muted-foreground flex items-start gap-1">
                <Info className="h-3 w-3 mt-0.5 shrink-0" />
                <span>Jobs, Candidates, and Interviews counts are placeholders and will be dynamically calculated in future updates.</span>
            </p>

            <div className="space-y-1">
              <Label htmlFor="progress">Progress (%)</Label>
              <Input
                id="progress"
                type="number"
                min="0"
                max="100"
                value={progress}
                onChange={(e) => setProgress(Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)))}
                disabled={isSaving || isParsingFile}
                placeholder="Manually set project completion percentage (0-100)"
              />
            </div>

            <div className="mt-4 p-3 border rounded-md bg-muted/30">
                <h4 className="text-sm font-medium text-muted-foreground">Future Enhancements:</h4>
                <ul className="list-disc list-inside pl-4 text-xs text-muted-foreground space-y-0.5 mt-1">
                    <li>Link specific job requisitions to this project.</li>
                    <li>View project activity timeline.</li>
                </ul>
            </div>
        </form>
        <DialogFooter className="mt-auto pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving || isParsingFile}>Cancel</Button>
          <Button type="submit" formAction="submit" onClick={handleSubmit} disabled={isSaving || isParsingFile}>
            {(isSaving || isParsingFile) && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
            {isSaving ? (isEditing ? "Saving..." : "Creating...") : (isParsingFile ? "Parsing..." : (isEditing ? "Save Changes" : "Save Project"))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
