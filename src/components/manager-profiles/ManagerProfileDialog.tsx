
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
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Edit2, Loader2 } from 'lucide-react';
import type { ManagerProfile } from '@/lib/types';

export type ManagerProfileFormData = Omit<ManagerProfile, 'id' | 'createdAt' | 'updatedAt'>;

interface ManagerProfileDialogProps {
  manager?: ManagerProfile;
  onSave: (data: ManagerProfileFormData, id?: string) => Promise<void> | void;
  trigger?: React.ReactNode;
}

export const ManagerProfileDialog: React.FC<ManagerProfileDialogProps> = ({ manager, onSave, trigger }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [activeRequisitions, setActiveRequisitions] = useState(0);
  const [teamSize, setTeamSize] = useState(0);
  const [hiringSince, setHiringSince] = useState(''); // YYYY-MM-DD string
  const [isSaving, setIsSaving] = useState(false);

  const { toast } = useToast();
  const isEditing = !!manager;

  useEffect(() => {
    if (manager && isOpen) {
      setName(manager.name);
      setEmail(manager.email);
      setDepartment(manager.department);
      setAvatarUrl(manager.avatarUrl || '');
      setActiveRequisitions(manager.activeRequisitions);
      setTeamSize(manager.teamSize);
      setHiringSince(manager.hiringSince ? manager.hiringSince.substring(0, 10) : '');
    } else if (!manager && isOpen) {
      setName('');
      setEmail('');
      setDepartment('');
      setAvatarUrl('');
      setActiveRequisitions(0);
      setTeamSize(0);
      setHiringSince('');
    }
  }, [manager, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !department) {
      toast({ variant: "destructive", title: "Missing Fields", description: "Name, Email, and Department are required." });
      return;
    }
    setIsSaving(true);
    try {
      await onSave({
        name, email, department, avatarUrl, activeRequisitions, teamSize,
        hiringSince: hiringSince || undefined, // Ensure it's undefined if empty
      }, manager?.id);
      setIsOpen(false);
      // Toast handled by parent page
    } catch (error) {
      // Toast handled by parent page
    } finally {
      setIsSaving(false);
    }
  };

  const defaultTrigger = (
    <Button disabled={isSaving}>
      <PlusCircle className="mr-2 h-4 w-4" /> Add Manager
    </Button>
  );
  
  const editTriggerButton = (
     <Button variant="outline" size="sm" className="w-full" disabled={isSaving}>
        <Edit2 className="mr-2 h-4 w-4" /> Edit
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!isSaving) setIsOpen(open); }}>
      <DialogTrigger asChild>
        {trigger ? trigger : (isEditing ? editTriggerButton : defaultTrigger)}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit" : "Add New"} Manager Profile</DialogTitle>
            <DialogDescription>
              {isEditing ? "Update the manager's details." : "Enter the details for the new manager."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-1"><Label htmlFor="managerName">Name</Label><Input id="managerName" value={name} onChange={e => setName(e.target.value)} required disabled={isSaving} /></div>
            <div className="space-y-1"><Label htmlFor="managerEmail">Email</Label><Input id="managerEmail" type="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={isSaving}/></div>
            <div className="space-y-1"><Label htmlFor="managerDepartment">Department</Label><Input id="managerDepartment" value={department} onChange={e => setDepartment(e.target.value)} required disabled={isSaving}/></div>
            <div className="space-y-1"><Label htmlFor="managerAvatarUrl">Avatar URL</Label><Input id="managerAvatarUrl" value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="https://..." disabled={isSaving}/></div>
            <div className="space-y-1"><Label htmlFor="activeRequisitions">Active Requisitions</Label><Input id="activeRequisitions" type="number" value={activeRequisitions} onChange={e => setActiveRequisitions(parseInt(e.target.value) || 0)} disabled={isSaving}/></div>
            <div className="space-y-1"><Label htmlFor="teamSize">Team Size</Label><Input id="teamSize" type="number" value={teamSize} onChange={e => setTeamSize(parseInt(e.target.value) || 0)} disabled={isSaving}/></div>
            <div className="space-y-1"><Label htmlFor="hiringSince">Hiring Since</Label><Input id="hiringSince" type="date" value={hiringSince} onChange={e => setHiringSince(e.target.value)} disabled={isSaving}/></div>
          </div>
          <DialogFooter className="mt-4 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Save Changes" : "Add Manager"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
