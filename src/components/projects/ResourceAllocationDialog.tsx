
"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
import { Users2, PlusCircle, Edit2, Loader2 } from 'lucide-react';
import type { ProjectResource } from '@/lib/types';

export type ProjectResourceFormData = Omit<ProjectResource, 'id' | 'projectId' | 'createdAt' | 'updatedAt' | 'totalCost'>;

interface ResourceAllocationDialogProps {
  projectId: string;
  resource?: ProjectResource;
  onSave: (data: ProjectResourceFormData, id?: string) => Promise<void> | void;
  triggerButton?: React.ReactNode;
  customOpen?: boolean;
  customOnOpenChange?: (open: boolean) => void;
}

export const ResourceAllocationDialog: React.FC<ResourceAllocationDialogProps> = ({
  projectId,
  resource,
  onSave,
  triggerButton,
  customOpen,
  customOnOpenChange,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = customOpen !== undefined ? customOpen : internalOpen;
  const setIsOpen = customOnOpenChange || setInternalOpen;

  const [resourceName, setResourceName] = useState('');
  const [role, setRole] = useState('');
  const [allocatedHours, setAllocatedHours] = useState('');
  const [costPerHour, setCostPerHour] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const { toast } = useToast();
  const isEditing = !!resource;

  useEffect(() => {
    if (isOpen) {
      if (resource) {
        setResourceName(resource.resourceName);
        setRole(resource.role);
        setAllocatedHours(resource.allocatedHours.toString());
        setCostPerHour(resource.costPerHour.toString());
      } else {
        setResourceName('');
        setRole('');
        setAllocatedHours('');
        setCostPerHour('');
      }
    }
  }, [resource, isOpen]);

  const totalCost = useMemo(() => {
    const hours = parseFloat(allocatedHours);
    const cost = parseFloat(costPerHour);
    if (!isNaN(hours) && !isNaN(cost)) {
      return (hours * cost).toFixed(2);
    }
    return '0.00';
  }, [allocatedHours, costPerHour]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hoursNum = parseFloat(allocatedHours);
    const costNum = parseFloat(costPerHour);

    if (!resourceName.trim() || !role.trim()) {
      toast({ variant: "destructive", title: "Missing Fields", description: "Resource Name and Role are required." });
      return;
    }
    if (isNaN(hoursNum) || hoursNum < 0) {
      toast({ variant: "destructive", title: "Invalid Input", description: "Allocated hours must be a non-negative number." });
      return;
    }
    if (isNaN(costNum) || costNum < 0) {
      toast({ variant: "destructive", title: "Invalid Input", description: "Cost per hour must be a non-negative number." });
      return;
    }

    setIsSaving(true);
    const formData: ProjectResourceFormData = {
      resourceName,
      role,
      allocatedHours: hoursNum,
      costPerHour: costNum,
    };

    try {
      await onSave(formData, resource?.id);
      setIsOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <PlusCircle className="mr-2 h-4 w-4" /> Allocate Resource
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!isSaving) setIsOpen(open); }}>
      <DialogTrigger asChild>
        {triggerButton ? triggerButton : (isEditing ? 
          <Button variant="ghost" size="icon" className="h-7 w-7"><Edit2 className="h-4 w-4" /></Button> : 
          defaultTrigger
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit' : 'Allocate'} Resource</DialogTitle>
            <DialogDescription>
              Assign a resource to this project and define their allocated time and cost.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-1">
              <Label htmlFor="resourceName">Resource Name</Label>
              <Input id="resourceName" value={resourceName} onChange={(e) => setResourceName(e.target.value)} required disabled={isSaving} placeholder="e.g., John Doe" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="resourceRole">Role</Label>
              <Input id="resourceRole" value={role} onChange={(e) => setRole(e.target.value)} required disabled={isSaving} placeholder="e.g., Senior Recruiter" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="allocatedHours">Allocated Hours</Label>
                <Input id="allocatedHours" type="number" step="0.1" value={allocatedHours} onChange={(e) => setAllocatedHours(e.target.value)} required disabled={isSaving} placeholder="e.g., 40" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="costPerHour">Cost Per Hour</Label>
                <Input id="costPerHour" type="number" step="0.01" value={costPerHour} onChange={(e) => setCostPerHour(e.target.value)} required disabled={isSaving} placeholder="e.g., 75.50" />
              </div>
            </div>
            <div className="p-3 border rounded-md bg-muted/40">
              <Label className="text-xs text-muted-foreground">Calculated Total Cost</Label>
              <p className="text-lg font-semibold">${totalCost}</p>
            </div>
          </div>
          <DialogFooter className="mt-4 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Allocate'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
