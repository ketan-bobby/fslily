
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Edit2, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ReEngagementCandidate } from '@/lib/types';

export type PastCandidateFormData = Omit<ReEngagementCandidate, 'id' | 'createdAt' | 'updatedAt' | 'contactedForNewRole'>;

interface AddPastCandidateDialogProps {
  candidate?: ReEngagementCandidate; // For editing
  onSaveCandidate: (data: PastCandidateFormData, id?: string) => Promise<void> | void;
  trigger?: React.ReactNode;
}

export const AddPastCandidateDialog: React.FC<AddPastCandidateDialogProps> = ({ candidate, onSaveCandidate, trigger }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [previousRole, setPreviousRole] = useState('');
  const [lastContacted, setLastContacted] = useState(''); // YYYY-MM-DD
  const [reasonNotHired, setReasonNotHired] = useState('');
  const [currentPotentialRole, setCurrentPotentialRole] = useState('');
  const [potentialFitFor, setPotentialFitFor] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const { toast } = useToast();
  const isEditing = !!candidate;

  useEffect(() => {
    if (candidate && isOpen) {
      setName(candidate.name);
      setPreviousRole(candidate.previousRole);
      setLastContacted(candidate.lastContacted.substring(0, 10));
      setReasonNotHired(candidate.reasonNotHired);
      setPotentialFitFor(candidate.potentialFitFor || []);
    } else if (!candidate && isOpen) {
      setName('');
      setPreviousRole('');
      setLastContacted('');
      setReasonNotHired('');
      setPotentialFitFor([]);
      setCurrentPotentialRole('');
    }
  }, [candidate, isOpen]);

  const handleAddPotentialRole = () => {
    if (currentPotentialRole.trim() && !potentialFitFor.includes(currentPotentialRole.trim())) {
        setPotentialFitFor([...potentialFitFor, currentPotentialRole.trim()]);
        setCurrentPotentialRole('');
    }
  };

  const handleRemovePotentialRole = (roleToRemove: string) => {
    setPotentialFitFor(potentialFitFor.filter(role => role !== roleToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !previousRole || !lastContacted || !reasonNotHired || potentialFitFor.length === 0) {
      toast({ variant: "destructive", title: "Missing fields", description: "Please fill in all required fields." });
      return;
    }
    setIsSaving(true);
    try {
      await onSaveCandidate({ name, previousRole, lastContacted, reasonNotHired, potentialFitFor }, candidate?.id);
      setIsOpen(false);
      // Toast handled by parent
    } catch(error) {
      // Toast handled by parent
    } finally {
      setIsSaving(false);
    }
  };

  const defaultTrigger = (
    <Button disabled={isSaving}>
      <PlusCircle className="mr-2 h-4 w-4" /> Add Past Candidate
    </Button>
  );

  const editTriggerButton = (
     <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isSaving}>
      <Edit2 className="h-4 w-4" />
      <span className="sr-only">Edit Candidate</span>
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if(!isSaving) setIsOpen(open);}}>
      <DialogTrigger asChild>
        {trigger ? trigger : (isEditing ? editTriggerButton : defaultTrigger)}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit" : "Add"} Past Promising Candidate</DialogTitle>
            <DialogDescription>
              {isEditing ? "Update the candidate's details." : "Add a candidate to your re-engagement pool."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-1">
              <Label htmlFor="pastCandidateName">Name</Label>
              <Input id="pastCandidateName" value={name} onChange={(e) => setName(e.target.value)} required disabled={isSaving}/>
            </div>
            <div className="space-y-1">
              <Label htmlFor="previousRole">Previous Role Considered</Label>
              <Input id="previousRole" value={previousRole} onChange={(e) => setPreviousRole(e.target.value)} required disabled={isSaving}/>
            </div>
            <div className="space-y-1">
              <Label htmlFor="lastContacted">Last Contacted Date</Label>
              <Input id="lastContacted" type="date" value={lastContacted} onChange={(e) => setLastContacted(e.target.value)} required disabled={isSaving}/>
            </div>
            <div className="space-y-1">
              <Label htmlFor="reasonNotHired">Reason Not Hired Previously</Label>
              <Textarea id="reasonNotHired" value={reasonNotHired} onChange={(e) => setReasonNotHired(e.target.value)} required disabled={isSaving}/>
            </div>
            <div className="space-y-1">
                <Label htmlFor="potentialFitFor">Potential Fit For (Roles)</Label>
                <div className="flex items-center gap-2">
                    <Input 
                        id="potentialFitFor" 
                        value={currentPotentialRole} 
                        onChange={(e) => setCurrentPotentialRole(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); handleAddPotentialRole(); }
                        }}
                        placeholder="e.g., Senior Developer"
                        disabled={isSaving}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={handleAddPotentialRole} disabled={isSaving}>Add</Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                    {potentialFitFor.map(role => (
                        <Badge key={role} variant="secondary">
                            {role}
                            <button type="button" onClick={() => handleRemovePotentialRole(role)} className="ml-1.5 text-muted-foreground hover:text-destructive text-xs font-bold" disabled={isSaving}>
                                &times;
                            </button>
                        </Badge>
                    ))}
                </div>
            </div>
          </div>
          <DialogFooter className="mt-4 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              {isEditing ? "Save Changes" : "Add Candidate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
