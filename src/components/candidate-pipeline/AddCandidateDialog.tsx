
"use client";

import React, { useState } from 'react';
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
import type { Candidate, CandidateStage } from '@/lib/types';
import { CANDIDATE_STAGES } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Loader2 } from 'lucide-react';

interface AddCandidateDialogProps {
  onAddCandidate: (newCandidate: Omit<Candidate, 'id' | 'appliedDate'>) => Promise<void> | void; // Can be async
}

export const AddCandidateDialog: React.FC<AddCandidateDialogProps> = ({ onAddCandidate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [stage, setStage] = useState<CandidateStage>(CANDIDATE_STAGES[0]);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !jobTitle) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please fill in all required fields (Name, Email, Job Title).",
      });
      return;
    }
    
    setIsSaving(true);
    try {
      await onAddCandidate({ name, email, jobTitle, stage });
      // Toast message handled by parent page
      // Reset form and close dialog
      setName('');
      setEmail('');
      setJobTitle('');
      setStage(CANDIDATE_STAGES[0]);
      setIsOpen(false);
    } catch (error) {
      // Error toast handled by parent page
      console.error("Error in dialog submit:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!isSaving) setIsOpen(open);
    }}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Candidate
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Candidate</DialogTitle>
            <DialogDescription>
              Enter the details for the new candidate. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" required disabled={isSaving}/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="col-span-3" required disabled={isSaving}/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="jobTitle" className="text-right">
                Job Title
              </Label>
              <Input id="jobTitle" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className="col-span-3" required disabled={isSaving}/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="stage" className="text-right">
                Stage
              </Label>
              <Select value={stage} onValueChange={(value: CandidateStage) => setStage(value)} disabled={isSaving}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a stage" />
                </SelectTrigger>
                <SelectContent>
                  {CANDIDATE_STAGES.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isSaving ? "Saving..." : "Save Candidate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
