
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from '@/hooks/use-toast';
import { Link as LinkIconLucide, Loader2 } from 'lucide-react'; // Removed unused icons
import type { JobRequisition } from '@/lib/types';
import { getLinkableJobRequisitions, getLinkedJobRequisitionsForProject, linkJobToProject, unlinkJobFromProject } from '@/lib/db';
import { Badge } from '../ui/badge';

interface ManageLinkedJobsDialogProps {
  projectId: string;
  onLinksUpdated: () => void; // Callback to refresh the parent component's list
}

export const ManageLinkedJobsDialog: React.FC<ManageLinkedJobsDialogProps> = ({ projectId, onLinksUpdated }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [allJobs, setAllJobs] = useState<JobRequisition[]>([]);
  const [linkedJobIds, setLinkedJobIds] = useState<Set<string>>(new Set());
  const [initialLinkedJobIds, setInitialLinkedJobIds] = useState<Set<string>>(new Set()); // Store initial state for comparison
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    if (!isOpen || !projectId) return;
    console.log(`[ManageLinkedJobsDialog] fetchData triggered for project ${projectId}`);
    setIsLoading(true);
    try {
      const [availableJobsData, linkedJobsData] = await Promise.all([
        getLinkableJobRequisitions(projectId), // This fetches OPEN or ON_HOLD jobs
        getLinkedJobRequisitionsForProject(projectId) // This fetches currently linked jobs
      ]);
      
      // Combine them for display, ensuring linked jobs are included even if not Open/On Hold
      const combinedJobsMap = new Map<string, JobRequisition>();
      availableJobsData.forEach(job => combinedJobsMap.set(job.id, job));
      linkedJobsData.forEach(job => combinedJobsMap.set(job.id, job)); // Overwrites if already present, which is fine

      const uniqueJobs = Array.from(combinedJobsMap.values()).sort((a, b) => a.title.localeCompare(b.title));
      
      console.log(`[ManageLinkedJobsDialog] Fetched unique jobs for dialog: ${uniqueJobs.length}`);
      setAllJobs(uniqueJobs);
      
      const currentLinkedIds = new Set(linkedJobsData.map(job => job.id));
      setLinkedJobIds(currentLinkedIds);
      setInitialLinkedJobIds(new Set(currentLinkedIds)); // Store initial state
      console.log(`[ManageLinkedJobsDialog] Initial linked job IDs for project ${projectId}:`, Array.from(currentLinkedIds));

    } catch (error) {
      console.error("[ManageLinkedJobsDialog] Failed to fetch jobs for linking:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load job requisitions." });
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, projectId, toast]);

  useEffect(() => {
    if (isOpen) { // Fetch data only when dialog is opened
        fetchData();
    }
  }, [isOpen, fetchData]); // fetchData dependency ensures it's re-run if projectId changes while open (though unlikely)

  const handleCheckedChange = (jobId: string, checked: boolean | string) => {
    setLinkedJobIds(prev => {
        const newSet = new Set(prev);
        if (checked) {
            newSet.add(jobId);
        } else {
            newSet.delete(jobId);
        }
        console.log(`[ManageLinkedJobsDialog] handleCheckedChange: Job ID ${jobId}, Checked: ${checked}. New linkedJobIds:`, Array.from(newSet));
        return newSet;
    });
  };

  const handleSave = async () => {
    console.log(`[ManageLinkedJobsDialog] handleSave initiated for project ${projectId}`);
    console.log(`[ManageLinkedJobsDialog] Current linkedJobIds (to be saved):`, Array.from(linkedJobIds));
    console.log(`[ManageLinkedJobsDialog] Initial linkedJobIds (before changes):`, Array.from(initialLinkedJobIds));
    setIsSaving(true);
    
    const jobsToLink = Array.from(linkedJobIds).filter(id => !initialLinkedJobIds.has(id));
    const jobsToUnlink = Array.from(initialLinkedJobIds).filter(id => !linkedJobIds.has(id));
    
    console.log(`[ManageLinkedJobsDialog] Jobs to link: ${jobsToLink.join(', ') || 'None'}`);
    console.log(`[ManageLinkedJobsDialog] Jobs to unlink: ${jobsToUnlink.join(', ') || 'None'}`);

    if (jobsToLink.length === 0 && jobsToUnlink.length === 0) {
        toast({ title: "No Changes", description: "No changes were made to the linked jobs." });
        setIsSaving(false);
        setIsOpen(false);
        return;
    }

    const linkPromises = jobsToLink.map(jobId => {
        console.log(`[ManageLinkedJobsDialog] Creating promise to link job ${jobId} to project ${projectId}`);
        return linkJobToProject(projectId, jobId);
    });
    const unlinkPromises = jobsToUnlink.map(jobId => {
        console.log(`[ManageLinkedJobsDialog] Creating promise to unlink job ${jobId} from project ${projectId}`);
        return unlinkJobFromProject(projectId, jobId);
    });

    try {
      // Using Promise.allSettled to ensure all operations are attempted
      const results = await Promise.allSettled([...linkPromises, ...unlinkPromises]);
      console.log("[ManageLinkedJobsDialog] Link/Unlink Promise.allSettled results:", results);

      let allSucceeded = true;
      results.forEach(result => {
        if (result.status === 'rejected' || (result.status === 'fulfilled' && result.value === false)) {
          allSucceeded = false;
          console.error("[ManageLinkedJobsDialog] A link/unlink operation failed:", result.status === 'rejected' ? result.reason : 'Operation returned false');
        }
      });

      if (allSucceeded) {
        toast({ title: "Links Updated", description: "Job requisition links have been successfully updated." });
      } else {
        toast({ variant: "destructive", title: "Partial Update", description: "Some link operations may have failed. Please check the console and verify." });
      }
      
      console.log(`[ManageLinkedJobsDialog] Calling onLinksUpdated for project ${projectId} after save attempts.`);
      onLinksUpdated(); 
      setIsOpen(false);
    } catch (error) { // This catch block might not be strictly necessary with Promise.allSettled if errors are handled above
      console.error("[ManageLinkedJobsDialog] Unexpected error during Promise.allSettled or subsequent logic:", error);
      toast({ variant: "destructive", title: "Error Updating Links", description: (error as Error).message || "Could not update all job links." });
    } finally {
      setIsSaving(false);
      console.log(`[ManageLinkedJobsDialog] handleSave finished for project ${projectId}`);
    }
  };
  
  const getJobStatusColor = (status: JobRequisition['status']) => {
    switch (status) {
      case "Open": return "text-green-600 bg-green-100 dark:text-green-300 dark:bg-green-700/30";
      case "Closed": return "text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-700/30";
      case "On Hold": return "text-yellow-600 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-700/30";
      case "Draft": return "text-gray-600 bg-gray-100 dark:text-gray-300 dark:bg-gray-700/30";
      default: return "text-muted-foreground bg-muted";
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!isSaving) setIsOpen(open);}}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <LinkIconLucide className="mr-2 h-4 w-4" /> Manage Linked Jobs
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Linked Job Requisitions</DialogTitle>
          <DialogDescription>
            Select job requisitions to link or unlink from this project. Shows all 'Open' or 'On Hold' jobs, plus any currently linked jobs regardless of status.
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex-grow flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Loading jobs...</p>
          </div>
        ) : allJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No job requisitions available to link or currently linked.</p>
        ) : (
          <ScrollArea className="flex-grow my-4 border rounded-md">
            <div className="p-4 space-y-3">
              {allJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id={`job-${job.id}`}
                      checked={linkedJobIds.has(job.id)}
                      onCheckedChange={(checked) => handleCheckedChange(job.id, checked)}
                      disabled={isSaving}
                    />
                    <Label htmlFor={`job-${job.id}`} className="cursor-pointer text-sm font-medium">
                      {job.title}
                    </Label>
                  </div>
                  <Badge variant="outline" className={`text-xs px-2 py-0.5 ${getJobStatusColor(job.status)} border ${getJobStatusColor(job.status).replace('bg-', 'border-')}`}>{job.status}</Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="mt-auto pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading || isSaving || (allJobs.length === 0 && !isLoading) }>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Links
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

    
