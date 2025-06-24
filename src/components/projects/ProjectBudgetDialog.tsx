
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Edit2, Loader2 } from 'lucide-react';
import type { ProjectBudget } from '@/lib/types';
import { saveProjectBudget, getGeneralSystemSettings } from '@/lib/db';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { COUNTRIES } from '@/lib/countries';

export type ProjectBudgetFormData = Omit<ProjectBudget, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>;

interface ProjectBudgetDialogProps {
  projectId: string;
  currentBudget?: ProjectBudget;
  onBudgetSaved: () => void;
  triggerButton?: React.ReactNode; // For custom trigger scenarios if needed
  customOpen?: boolean;
  customOnOpenChange?: (open: boolean) => void;
}

export const ProjectBudgetDialog: React.FC<ProjectBudgetDialogProps> = ({
  projectId,
  currentBudget,
  onBudgetSaved,
  triggerButton,
  customOpen,
  customOnOpenChange,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = customOpen !== undefined ? customOpen : internalOpen;
  const setIsOpen = customOnOpenChange || setInternalOpen;

  const [totalBudget, setTotalBudget] = useState<string>('');
  const [spentBudget, setSpentBudget] = useState<string>('');
  const [currency, setCurrency] = useState<string>('USD');
  const [notes, setNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [availableCountries, setAvailableCountries] = useState<string[]>(['US', 'GB', 'EU']);
  const [isLoadingCurrencies, setIsLoadingCurrencies] = useState(true);

  const { toast } = useToast();
  const isEditing = !!currentBudget;

  const fetchSettings = useCallback(async () => {
    setIsLoadingCurrencies(true);
    try {
      const settings = await getGeneralSystemSettings();
      if (settings && settings.availableCountries && settings.availableCountries.length > 0) {
        setAvailableCountries(settings.availableCountries);
        if (!isEditing) {
            const firstCountry = COUNTRIES.find(c => c.code === settings.availableCountries[0]);
            if (firstCountry) setCurrency(firstCountry.currency);
        }
      }
    } catch(error) {
      toast({ variant: "destructive", title: "Could not load currency settings", description: "Defaulting to USD, EUR, GBP." });
    } finally {
      setIsLoadingCurrencies(false);
    }
  }, [toast, isEditing]);

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
      if (currentBudget) {
        setTotalBudget(currentBudget.totalBudget.toString());
        setSpentBudget(currentBudget.spentBudget.toString());
        setCurrency(currentBudget.currency);
        setNotes(currentBudget.notes || '');
      } else {
        // Defaults for a new budget
        setTotalBudget('');
        setSpentBudget('0'); // Default spent to 0 for new budgets
        // Currency is set by fetchSettings
        setNotes('');
      }
    }
  }, [currentBudget, isOpen, fetchSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedTotalBudget = parseFloat(totalBudget);
    const parsedSpentBudget = parseFloat(spentBudget);

    if (isNaN(parsedTotalBudget) || parsedTotalBudget < 0) {
      toast({ variant: "destructive", title: "Invalid Input", description: "Total budget must be a non-negative number." });
      return;
    }
    if (isNaN(parsedSpentBudget) || parsedSpentBudget < 0) {
      toast({ variant: "destructive", title: "Invalid Input", description: "Spent budget must be a non-negative number." });
      return;
    }
    if (!currency.trim()) {
      toast({ variant: "destructive", title: "Missing Currency", description: "Please select a currency." });
      return;
    }

    setIsSaving(true);
    const budgetDataToSave: Omit<ProjectBudget, 'id' | 'createdAt' | 'updatedAt'> = {
      projectId,
      totalBudget: parsedTotalBudget,
      spentBudget: parsedSpentBudget,
      currency: currency,
      notes: notes || undefined,
    };

    try {
      const savedBudget = await saveProjectBudget(budgetDataToSave);
      if (savedBudget) {
        toast({ title: `Budget ${isEditing ? 'Updated' : 'Set Up'}`, description: `Budget for project has been ${isEditing ? 'updated' : 'set up'}.` });
        onBudgetSaved();
        setIsOpen(false);
      } else {
        throw new Error("Failed to save budget. The operation returned null.");
      }
    } catch (error: any) {
      console.error("Error saving project budget:", error);
      toast({ variant: "destructive", title: "Error Saving Budget", description: error.message || "Could not save the project budget." });
    } finally {
      setIsSaving(false);
    }
  };

  const defaultTriggerButton = (
    <Button variant="outline" onClick={() => setIsOpen(true)} disabled={isSaving}>
      <DollarSign className="mr-2 h-4 w-4" /> {isEditing ? "Manage Budget" : "Set Up Budget"}
    </Button>
  );

  const selectableCurrencies = COUNTRIES.filter(country => availableCountries.includes(country.code));

  return (
    <Dialog open={isOpen} onOpenChange={(openState) => { if (!isSaving) setIsOpen(openState); }}>
      {triggerButton && <DialogTrigger asChild>{triggerButton}</DialogTrigger>}
      {!triggerButton && !customOpen && React.cloneElement(defaultTriggerButton, { onClick: () => setIsOpen(true) })}
      
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Manage" : "Set Up"} Project Budget</DialogTitle>
            <DialogDescription>
              {isEditing ? "Update the financial details for this project." : "Define the budget for this project."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-1">
              <Label htmlFor="totalBudget">Total Budget</Label>
              <Input
                id="totalBudget"
                type="number"
                step="0.01"
                value={totalBudget}
                onChange={(e) => setTotalBudget(e.target.value)}
                placeholder="e.g., 50000.00"
                required
                disabled={isSaving}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="spentBudget">Spent Budget</Label>
              <Input
                id="spentBudget"
                type="number"
                step="0.01"
                value={spentBudget}
                onChange={(e) => setSpentBudget(e.target.value)}
                placeholder="e.g., 15000.00"
                required
                disabled={isSaving}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="currency">Country / Currency</Label>
              <Select value={currency} onValueChange={setCurrency} disabled={isSaving}>
                <SelectTrigger id="currency">
                    <SelectValue placeholder={isLoadingCurrencies ? "Loading..." : "Select currency"} />
                </SelectTrigger>
                <SelectContent>
                    {selectableCurrencies.map(c => (
                        <SelectItem key={c.code} value={c.currency}>
                            {c.name} ({c.currency} - {c.symbol})
                        </SelectItem>
                    ))}
                    {/* Handle case where the saved currency is not in the selectable list (legacy) */}
                    {currentBudget?.currency && !selectableCurrencies.some(c => c.currency === currentBudget.currency) && (
                         <SelectItem key={currentBudget.currency} value={currentBudget.currency}>
                           {currentBudget.currency} (Legacy)
                         </SelectItem>
                    )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="budgetNotes">Notes (Optional)</Label>
              <Textarea
                id="budgetNotes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any relevant notes about the budget..."
                rows={3}
                disabled={isSaving}
              />
            </div>
          </div>
          <DialogFooter className="mt-4 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || isLoadingCurrencies}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Save Changes" : "Save Budget"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
