
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
import type { Client } from '@/lib/types';

export type ClientFormData = Omit<Client, 'id' | 'createdAt' | 'updatedAt'>;

interface ClientFormDialogProps {
  client?: Client; // Existing client data for editing
  onSave: (data: ClientFormData, id?: string) => Promise<void> | void;
  trigger?: React.ReactNode;
}

export const ClientFormDialog: React.FC<ClientFormDialogProps> = ({ client, onSave, trigger }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [activeRequisitions, setActiveRequisitions] = useState(0);
  const [totalHires, setTotalHires] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const { toast } = useToast();
  const isEditing = !!client;

  useEffect(() => {
    if (client && isOpen) {
      setCompanyName(client.companyName);
      setContactPerson(client.contactPerson);
      setEmail(client.email);
      setPhone(client.phone || '');
      setLogoUrl(client.logoUrl || '');
      setActiveRequisitions(client.activeRequisitions);
      setTotalHires(client.totalHires);
    } else if (!client && isOpen) {
      setCompanyName('');
      setContactPerson('');
      setEmail('');
      setPhone('');
      setLogoUrl('');
      setActiveRequisitions(0);
      setTotalHires(0);
    }
  }, [client, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !contactPerson || !email) {
      toast({ variant: "destructive", title: "Missing fields", description: "Company Name, Contact Person, and Email are required." });
      return;
    }
    setIsSaving(true);
    try {
      await onSave({ companyName, contactPerson, email, phone, logoUrl, activeRequisitions, totalHires }, client?.id);
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
      <PlusCircle className="mr-2 h-4 w-4" /> Add New Client
    </Button>
  );
  
  const editTriggerButton = (
    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isSaving}>
      <Edit2 className="h-4 w-4" />
      <span className="sr-only">Edit Client</span>
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
            <DialogTitle>{isEditing ? "Edit" : "Add New"} Client</DialogTitle>
            <DialogDescription>
              {isEditing ? "Update the client's details." : "Enter the details for the new client."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-1"><Label htmlFor="clientCompanyName">Company Name</Label><Input id="clientCompanyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required disabled={isSaving}/></div>
            <div className="space-y-1"><Label htmlFor="clientContactPerson">Contact Person</Label><Input id="clientContactPerson" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} required disabled={isSaving}/></div>
            <div className="space-y-1"><Label htmlFor="clientEmail">Email</Label><Input id="clientEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isSaving}/></div>
            <div className="space-y-1"><Label htmlFor="clientPhone">Phone (Optional)</Label><Input id="clientPhone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={isSaving}/></div>
            <div className="space-y-1"><Label htmlFor="clientLogoUrl">Logo URL (Optional)</Label><Input id="clientLogoUrl" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." disabled={isSaving}/></div>
            <div className="space-y-1"><Label htmlFor="clientActiveReqs">Active Requisitions</Label><Input id="clientActiveReqs" type="number" value={activeRequisitions} onChange={(e) => setActiveRequisitions(parseInt(e.target.value) || 0)} disabled={isSaving}/></div>
            <div className="space-y-1"><Label htmlFor="clientTotalHires">Total Hires</Label><Input id="clientTotalHires" type="number" value={totalHires} onChange={(e) => setTotalHires(parseInt(e.target.value) || 0)} disabled={isSaving}/></div>
          </div>
          <DialogFooter className="mt-4 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Save Changes" : "Add Client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
