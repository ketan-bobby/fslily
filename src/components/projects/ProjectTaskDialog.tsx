
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  SelectGroup,
  SelectLabel
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Edit2, Loader2, User, Briefcase } from 'lucide-react'; // Added Briefcase icon
import type { ProjectTask, ProjectTaskStatus, Candidate, JobRequisition as JobRequisitionType } from '@/lib/types';
import { PROJECT_TASK_STATUSES } from '@/lib/types';
import { saveProjectTaskToDB, getCandidatesForProject, getLinkedJobRequisitionsForProject } from '@/lib/db';

export type ProjectTaskFormData = Omit<ProjectTask, 'id' | 'projectId' | 'createdAt' | 'updatedAt' | 'candidateName'>;

interface ProjectTaskDialogProps {
  projectId: string;
  task?: ProjectTask;
  onTaskSaved: () => void; 
  triggerButton?: React.ReactNode;
  customOpen?: boolean;
  customOnOpenChange?: (open: boolean) => void;
}

interface CandidateWithJobInfo {
  id: string;
  name: string;
  jobTitle: string;
  jobRequisitionId: string;
}

export const ProjectTaskDialog: React.FC<ProjectTaskDialogProps> = ({
  projectId,
  task,
  onTaskSaved,
  triggerButton,
  customOpen,
  customOnOpenChange,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = customOpen !== undefined ? customOpen : internalOpen;
  const setIsOpen = customOnOpenChange || setInternalOpen;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectTaskStatus>(PROJECT_TASK_STATUSES[0]);
  const [assigneeName, setAssigneeName] = useState('');
  const [dueDate, setDueDate] = useState(''); 
  
  const [projectJobs, setProjectJobs] = useState<JobRequisitionType[]>([]);
  const [isLoadingProjectJobs, setIsLoadingProjectJobs] = useState(false);
  const [selectedJobIdForCandidate, setSelectedJobIdForCandidate] = useState<string | undefined>(undefined);

  const [allProjectCandidates, setAllProjectCandidates] = useState<CandidateWithJobInfo[]>([]);
  const [isLoadingAllProjectCandidates, setIsLoadingAllProjectCandidates] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | undefined>(undefined);

  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const isEditing = !!task;

  const fetchDialogData = useCallback(async () => {
    if (!projectId || !isOpen) return;
    
    setIsLoadingProjectJobs(true);
    setIsLoadingAllProjectCandidates(true);

    try {
      const [jobs, candidates] = await Promise.all([
        getLinkedJobRequisitionsForProject(projectId),
        getCandidatesForProject(projectId) 
      ]);
      setProjectJobs(jobs);
      setAllProjectCandidates(candidates);

      if (isEditing && task?.candidateId) {
        const linkedCandidate = candidates.find(c => c.id === task.candidateId);
        if (linkedCandidate) {
          setSelectedJobIdForCandidate(linkedCandidate.jobRequisitionId);
          // selectedCandidateId will be set by useEffect below once job is set and candidates are filtered
        }
      }

    } catch (error) {
      console.error("Error fetching data for task dialog:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load jobs or candidates for selection." });
    } finally {
      setIsLoadingProjectJobs(false);
      setIsLoadingAllProjectCandidates(false);
    }
  }, [projectId, isOpen, toast, isEditing, task?.candidateId]);

  useEffect(() => {
    fetchDialogData();
  }, [fetchDialogData]);

  const filteredCandidatesForJob = useMemo(() => {
    if (!selectedJobIdForCandidate) return [];
    return allProjectCandidates.filter(c => c.jobRequisitionId === selectedJobIdForCandidate);
  }, [allProjectCandidates, selectedJobIdForCandidate]);

  useEffect(() => {
    if (isOpen) {
      if (task) {
        setTitle(task.title);
        setDescription(task.description || '');
        setStatus(task.status);
        setAssigneeName(task.assigneeName || '');
        setDueDate(task.dueDate ? task.dueDate.substring(0, 10) : '');
        // Pre-selection of job and candidate is handled by fetchDialogData and subsequent effects
        if (task.candidateId) {
            // Check if allProjectCandidates already loaded to set selectedJobIdForCandidate, then candidate
            const linkedCand = allProjectCandidates.find(c => c.id === task.candidateId);
            if(linkedCand) {
                setSelectedJobIdForCandidate(linkedCand.jobRequisitionId);
                // The effect for filteredCandidatesForJob will run, then this:
                setSelectedCandidateId(task.candidateId);
            } else if (!isLoadingAllProjectCandidates && !isLoadingProjectJobs) {
                // If data is loaded and candidate not found, it might be an old link or error
                console.warn(`Editing task, but could not find candidate ${task.candidateId} in project's candidates.`);
            }
        } else {
            setSelectedJobIdForCandidate(undefined);
            setSelectedCandidateId(undefined);
        }

      } else { // New task
        setTitle('');
        setDescription('');
        setStatus(PROJECT_TASK_STATUSES[0]);
        setAssigneeName('');
        setDueDate('');
        setSelectedJobIdForCandidate(undefined);
        setSelectedCandidateId(undefined);
      }
    }
  }, [task, isOpen, allProjectCandidates, isLoadingAllProjectCandidates, isLoadingProjectJobs]);

  // Effect to reset candidate when job changes
  useEffect(() => {
    if (!isEditing || (isEditing && task?.candidateId && allProjectCandidates.find(c => c.id === task.candidateId)?.jobRequisitionId !== selectedJobIdForCandidate)) {
         setSelectedCandidateId(undefined);
    }
  }, [selectedJobIdForCandidate, isEditing, task?.candidateId, allProjectCandidates]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ variant: "destructive", title: "Task Title Required", description: "Please enter a title for the task." });
      return;
    }

    setIsSaving(true);
    const taskData: ProjectTaskFormData = {
      title,
      description: description || undefined,
      status,
      assigneeName: assigneeName || undefined,
      dueDate: dueDate || undefined,
      candidateId: selectedCandidateId || undefined,
    };

    try {
      const savedTask = await saveProjectTaskToDB({ projectId, ...taskData }, task?.id);
      if (savedTask) {
        toast({ title: `Task ${isEditing ? 'Updated' : 'Added'}`, description: `Task "${title}" has been successfully ${isEditing ? 'updated' : 'added'}.` });
        onTaskSaved(); 
        setIsOpen(false);
      } else {
        throw new Error("Save operation failed to return a task.");
      }
    } catch (error) {
      console.error("Error saving project task:", error);
      toast({ variant: "destructive", title: "Error", description: `Could not ${isEditing ? 'update' : 'add'} task.` });
    } finally {
      setIsSaving(false);
    }
  };
  
  const defaultTrigger = (
    <Button variant="outline" size="sm">
        <PlusCircle className="mr-2 h-4 w-4" /> Add Task
    </Button>
  );

  const editTrigger = (
     <Button variant="ghost" size="icon" className="h-7 w-7">
        <Edit2 className="h-4 w-4" />
        <span className="sr-only">Edit Task</span>
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(openState) => { if (!isSaving) setIsOpen(openState); }}>
      <DialogTrigger asChild>
        {triggerButton ? triggerButton : (isEditing ? editTrigger : defaultTrigger)}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit" : "Add New"} Project Task</DialogTitle>
            <DialogDescription>
              {isEditing ? "Update the details of this task." : "Enter the details for the new task for this project."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-1">
              <Label htmlFor="taskTitle">Title</Label>
              <Input id="taskTitle" value={title} onChange={(e) => setTitle(e.target.value)} required disabled={isSaving} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="taskDescription">Description (Optional)</Label>
              <Textarea id="taskDescription" value={description} onChange={(e) => setDescription(e.target.value)} disabled={isSaving} rows={3} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="taskStatus">Status</Label>
                <Select value={status} onValueChange={(val: ProjectTaskStatus) => setStatus(val)} disabled={isSaving}>
                  <SelectTrigger id="taskStatus"><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    {PROJECT_TASK_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="taskAssignee">Assignee (Optional)</Label>
                <Input id="taskAssignee" value={assigneeName} onChange={(e) => setAssigneeName(e.target.value)} placeholder="e.g., John Doe" disabled={isSaving} />
              </div>
            </div>
            
            <div className="space-y-1">
                <Label htmlFor="taskRelatedJob">Related Job (Optional)</Label>
                <Select 
                    value={selectedJobIdForCandidate} 
                    onValueChange={(value) => {
                        setSelectedJobIdForCandidate(value === 'none' ? undefined : value);
                        setSelectedCandidateId(undefined); // Reset candidate if job changes
                    }} 
                    disabled={isSaving || isLoadingProjectJobs}
                >
                    <SelectTrigger id="taskRelatedJob">
                        <SelectValue placeholder={isLoadingProjectJobs ? "Loading jobs..." : "Select a job..."} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {projectJobs.map(job => (
                            <SelectItem key={job.id} value={job.id}>
                                {job.title}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-1">
                <Label htmlFor="taskCandidate">Related Candidate (Optional)</Label>
                <Select 
                    value={selectedCandidateId} 
                    onValueChange={(value) => setSelectedCandidateId(value === 'none' ? undefined : value)} 
                    disabled={isSaving || isLoadingAllProjectCandidates || !selectedJobIdForCandidate || filteredCandidatesForJob.length === 0}
                >
                    <SelectTrigger id="taskCandidate">
                        <SelectValue placeholder={
                            !selectedJobIdForCandidate ? "Select a job first" : 
                            isLoadingAllProjectCandidates ? "Loading candidates..." : 
                            (filteredCandidatesForJob.length === 0 ? "No candidates for selected job" : "Select a candidate...")
                        } />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {filteredCandidatesForJob.map(cand => (
                            <SelectItem key={cand.id} value={cand.id}>
                                {cand.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="taskDueDate">Due Date (Optional)</Label>
              <Input id="taskDueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} disabled={isSaving} />
            </div>
          </div>
          <DialogFooter className="mt-4 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button type="submit" disabled={isSaving || isLoadingProjectJobs || isLoadingAllProjectCandidates}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Save Changes" : "Add Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

