
"use client";

import React, { useState, useEffect } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Edit2, Loader2 } from 'lucide-react';
import type { InterviewLink, InterviewLinkType } from '@/lib/types';
import { INTERVIEW_LINK_TYPES } from '@/lib/types';

export type InterviewLinkFormData = Omit<InterviewLink, 'id' | 'createdAt' | 'updatedAt'>;

interface GenerateLinkDialogProps {
  link?: InterviewLink; // For editing
  onSaveLink: (data: InterviewLinkFormData, id?:string) => Promise<void> | void;
  trigger?: React.ReactNode;
}

export const GenerateLinkDialog: React.FC<GenerateLinkDialogProps> = ({ link, onSaveLink, trigger }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [jobTitle, setJobTitle] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [expiresAt, setExpiresAt] = useState(''); // YYYY-MM-DD string
  const [type, setType] = useState<InterviewLinkType>(INTERVIEW_LINK_TYPES[0]);
  const [isSaving, setIsSaving] = useState(false);

  const { toast } = useToast();
  const isEditing = !!link;

  useEffect(() => {
    if (link && isOpen) {
      setJobTitle(link.jobTitle);
      setCandidateName(link.candidateName || '');
      setLinkUrl(link.linkUrl);
      setType(link.type);
      setExpiresAt(link.expiresAt ? link.expiresAt.substring(0, 10) : '');
    } else if (!link && isOpen) {
      setJobTitle('');
      setCandidateName('');
      setLinkUrl('');
      setExpiresAt('');
      setType(INTERVIEW_LINK_TYPES[0]);
    }
  }, [link, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle || !linkUrl || !type) {
      toast({ variant: "destructive", title: "Missing fields", description: "Please fill in Job Title, Link URL, and Type." });
      return;
    }
    setIsSaving(true);
    try {
      await onSaveLink({ 
          jobTitle, 
          candidateName: candidateName || undefined, // ensure empty string becomes undefined
          linkUrl, 
          type, 
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined 
      }, link?.id);
      setIsOpen(false);
      // Toast handled by parent
    } catch (error) {
      // Toast handled by parent
    } finally {
      setIsSaving(false);
    }
  };
  
  const defaultTrigger = (
    <Button disabled={isSaving}>
      <PlusCircle className="mr-2 h-4 w-4" /> Generate New Link
    </Button>
  );

  const editTriggerButton = (
     <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isSaving}>
      <Edit2 className="h-4 w-4" />
      <span className="sr-only">Edit Link</span>
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!isSaving) setIsOpen(open);}}>
      <DialogTrigger asChild>
        {trigger ? trigger : (isEditing ? editTriggerButton : defaultTrigger)}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit" : "Generate New"} Interview Link</DialogTitle>
            <DialogDescription>
              {isEditing ? "Update the link details." : "Enter the details for the new link."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-1">
              <Label htmlFor="linkJobTitle">Job Title</Label>
              <Input id="linkJobTitle" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} required disabled={isSaving}/>
            </div>
            <div className="space-y-1">
              <Label htmlFor="linkCandidateName">Candidate Name (Optional)</Label>
              <Input id="linkCandidateName" value={candidateName} onChange={(e) => setCandidateName(e.target.value)} placeholder="e.g., Jane Doe" disabled={isSaving}/>
            </div>
            <div className="space-y-1">
              <Label htmlFor="linkUrl">Link URL</Label>
              <Input id="linkUrl" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://meet.example.com/xyz" required disabled={isSaving}/>
            </div>
             <div className="space-y-1">
              <Label htmlFor="linkType">Type</Label>
              <Select value={type} onValueChange={(value: InterviewLinkType) => setType(value)} disabled={isSaving}>
                <SelectTrigger id="linkType"><SelectValue placeholder="Select link type" /></SelectTrigger>
                <SelectContent>
                  {INTERVIEW_LINK_TYPES.map(t => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="linkExpiresAt">Expires At (Optional)</Label>
              <Input id="linkExpiresAt" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} disabled={isSaving}/>
            </div>
          </div>
          <DialogFooter className="mt-4 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Save Changes" : "Generate Link"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
