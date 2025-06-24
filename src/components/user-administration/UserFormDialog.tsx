
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
import type { User, UserRole } from '@/lib/types'; // Import User type
import { USER_ROLES } from '@/lib/types'; // Import USER_ROLES

export type UserFormData = Omit<User, 'id' | 'lastLogin' | 'createdAt' | 'updatedAt' | 'isActive'> & { isActive?: boolean };


interface UserFormDialogProps {
  user?: User; // Existing user data for editing
  onSave: (data: UserFormData, id?: string) => Promise<void> | void;
  trigger?: React.ReactNode;
}

export const UserFormDialog: React.FC<UserFormDialogProps> = ({ user, onSave, trigger }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>(USER_ROLES[1]); // Default to Recruiter
  const [isSaving, setIsSaving] = useState(false);

  const { toast } = useToast();
  const isEditing = !!user;

  useEffect(() => {
    if (user && isOpen) {
      setName(user.name);
      setEmail(user.email);
      setRole(user.role);
    } else if (!user && isOpen) {
      setName('');
      setEmail('');
      setRole(USER_ROLES[1]);
    }
  }, [user, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !role) {
      toast({ variant: "destructive", title: "Missing fields", description: "Please fill in Name, Email, and Role." });
      return;
    }
    setIsSaving(true);
    try {
      await onSave({ name, email, role, isActive: user?.isActive }, user?.id); // Pass isActive if editing
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
      <PlusCircle className="mr-2 h-4 w-4" /> Invite New User
    </Button>
  );
  
  const editTriggerButton = (
    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isSaving}>
      <Edit2 className="h-4 w-4" />
      <span className="sr-only">Edit User</span>
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if(!isSaving) setIsOpen(open);}}>
      <DialogTrigger asChild>
        {trigger ? trigger : (isEditing ? editTriggerButton : defaultTrigger)}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit" : "Invite New"} User</DialogTitle>
            <DialogDescription>
              {isEditing ? "Update the user's details." : "Enter the details for the new user to invite them."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="userNameDialog" className="text-right">Name</Label>
              <Input id="userNameDialog" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" required disabled={isSaving}/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="userEmailDialog" className="text-right">Email</Label>
              <Input id="userEmailDialog" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="col-span-3" required disabled={isSaving}/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="userRoleDialog" className="text-right">Role</Label>
              <Select value={role} onValueChange={(value: UserRole) => setRole(value)} disabled={isSaving}>
                <SelectTrigger id="userRoleDialog" className="col-span-3"><SelectValue placeholder="Select a role" /></SelectTrigger>
                <SelectContent>
                  {USER_ROLES.map(r => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Save Changes" : "Invite User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
