
"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Repeat, Mail, UserCheck, Filter, Loader2, Trash2 } from "lucide-react";
import React, { useState, useEffect, useCallback } from 'react';
import { AddPastCandidateDialog, type PastCandidateFormData } from '@/components/re-engagement/AddPastCandidateDialog';
import { useToast } from "@/hooks/use-toast";
import type { ReEngagementCandidate } from '@/lib/types';
import { getReEngagementCandidatesFromDB, saveReEngagementCandidateToDB, deleteReEngagementCandidateFromDB } from '@/lib/db';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogClose,
  DialogFooter as FilterDialogFooter, // Renamed to avoid conflict
  DialogHeader as FilterDialogHeader,
  DialogTitle as FilterDialogTitle,
  DialogContent as FilterDialogContent,
  DialogTrigger as FilterDialogTrigger,
  DialogDescription as FilterDialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ReEngagementPage() {
  const [candidates, setCandidates] = useState<ReEngagementCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [filterPrevRole, setFilterPrevRole] = useState('');
  const [filterLastContactedStart, setFilterLastContactedStart] = useState('');
  const [filterLastContactedEnd, setFilterLastContactedEnd] = useState('');


  const fetchCandidates = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getReEngagementCandidatesFromDB();
      setCandidates(data);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not load re-engagement candidates." });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const handleSaveCandidate = async (newCandidateData: PastCandidateFormData, id?: string) => {
    setIsLoading(true);
    try {
      const candidateToSave: Omit<ReEngagementCandidate, 'id' | 'createdAt' | 'updatedAt'> = {
        ...newCandidateData,
        contactedForNewRole: id ? candidates.find(c=>c.id === id)?.contactedForNewRole : false,
      };
      const savedCandidate = await saveReEngagementCandidateToDB(candidateToSave, id);
      if (savedCandidate) {
        toast({ title: "Success", description: `Candidate ${id ? 'updated' : 'added'} successfully.` });
        fetchCandidates();
      } else {
        throw new Error("Save operation failed.");
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: `Could not ${id ? 'update' : 'add'} candidate.` });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeleteCandidate = async (candidateId: string) => {
    setIsLoading(true);
    try {
      const success = await deleteReEngagementCandidateFromDB(candidateId);
      if (success) {
        toast({ title: "Candidate Deleted", description: "Candidate removed from re-engagement pool."});
        fetchCandidates();
      } else {
        throw new Error("Delete operation failed.");
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not delete candidate." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReengage = async (candidateId: string) => {
    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate) return;

    setIsLoading(true);
    try {
      const updatedCandidateData = { ...candidate, contactedForNewRole: true };
      const { id, createdAt, updatedAt, ...dataToSave } = updatedCandidateData;
      const saved = await saveReEngagementCandidateToDB(dataToSave, candidate.id);
      if (saved) {
        toast({
          title: "Re-engagement Action Simulated",
          description: `Marked ${candidate.name} as contacted. An outreach email mock-up would be sent.`,
        });
        fetchCandidates(); 
      } else {
        throw new Error("Failed to update contacted status.");
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not update re-engagement status."});
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyFilters = () => {
    toast({
      title: "Filters Applied (Simulated)",
      description: `Filtering by Previous Role: '${filterPrevRole}', Last Contacted: ${filterLastContactedStart || 'any'} to ${filterLastContactedEnd || 'any'}. Actual data filtering is not yet implemented.`,
    });
    setIsFilterDialogOpen(false);
  };


  return (
    <AppLayout>
      <div className="space-y-8">
        <header className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline">Candidate Re-engagement</h1>
            <p className="text-muted-foreground">Reconnect with promising past candidates for new opportunities.</p>
          </div>
           <AddPastCandidateDialog onSaveCandidate={handleSaveCandidate} />
        </header>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UserCheck className="h-6 w-6 text-primary"/>Silver Medalist Pool</CardTitle>
            <CardDescription>
              These are promising candidates from past recruitments who were not hired but could be a great fit for current or future roles.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-end mb-4">
                <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline"><Filter className="mr-2 h-4 w-4"/>Filter Candidates</Button>
                  </DialogTrigger>
                  <FilterDialogContent>
                    <FilterDialogHeader>
                      <FilterDialogTitle>Filter Re-engagement Candidates</FilterDialogTitle>
                      <FilterDialogDescription>
                        Refine the list of candidates. Actual data filtering is not yet implemented.
                      </FilterDialogDescription>
                    </FilterDialogHeader>
                    <div className="grid gap-4 py-4">
                      <div>
                        <Label htmlFor="filterPrevRole">Previous Role Considered</Label>
                        <Input id="filterPrevRole" value={filterPrevRole} onChange={e => setFilterPrevRole(e.target.value)} placeholder="e.g., Software Engineer"/>
                      </div>
                      <div>
                        <Label>Last Contacted Date Range</Label>
                        <div className="flex gap-2">
                           <Input type="date" value={filterLastContactedStart} onChange={e => setFilterLastContactedStart(e.target.value)} />
                           <span className="self-center">to</span>
                           <Input type="date" value={filterLastContactedEnd} onChange={e => setFilterLastContactedEnd(e.target.value)} />
                        </div>
                      </div>
                    </div>
                    <FilterDialogFooter>
                      <Button variant="outline" onClick={() => setIsFilterDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleApplyFilters}>Apply Filters (Simulated)</Button>
                    </FilterDialogFooter>
                  </FilterDialogContent>
                </Dialog>
            </div>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Previous Role</TableHead>
                        <TableHead>Last Contacted</TableHead>
                        <TableHead>Potential Fit For</TableHead>
                        <TableHead>Reason Not Hired</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && candidates.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center"><Loader2 className="inline mr-2 h-4 w-4 animate-spin" />Loading candidates...</TableCell></TableRow>
                        ) : candidates.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No past promising candidates in the pool yet.</TableCell></TableRow>
                        ) : candidates.map((candidate) => (
                        <TableRow key={candidate.id}>
                            <TableCell className="font-medium">{candidate.name} {candidate.contactedForNewRole && <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700 dark:bg-blue-700/30 dark:text-blue-200">Contacted</Badge>}</TableCell>
                            <TableCell>{candidate.previousRole}</TableCell>
                            <TableCell>{format(new Date(candidate.lastContacted), "MMM d, yyyy")}</TableCell>
                            <TableCell>
                                <div className="flex flex-wrap gap-1">
                                    {candidate.potentialFitFor.map(role => <Badge key={role} variant="outline">{role}</Badge>)}
                                </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{candidate.reasonNotHired}</TableCell>
                            <TableCell className="text-right space-x-1">
                                <AddPastCandidateDialog candidate={candidate} onSaveCandidate={handleSaveCandidate} />
                                <Button variant="ghost" size="sm" onClick={() => handleReengage(candidate.id)} disabled={isLoading || candidate.contactedForNewRole}><Mail className="mr-2 h-4 w-4"/> Re-engage</Button>
                                 <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will remove {candidate.name} from the re-engagement pool.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteCandidate(candidate.id)} disabled={isLoading} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                            </TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Re-engagement Strategies</CardTitle>
            <CardDescription>Tips for effectively reconnecting with past candidates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="p-3 bg-muted/50 rounded-md">
                <h4 className="font-semibold">Personalize Your Outreach:</h4>
                <p className="text-muted-foreground">Reference their previous application and specific skills that impressed you.</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-md">
                <h4 className="font-semibold">Highlight What's New:</h4>
                <p className="text-muted-foreground">Explain how the new role or company has evolved since your last interaction.</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-md">
                <h4 className="font-semibold">Offer Value:</h4>
                <p className="text-muted-foreground">Share relevant company news, industry insights, or networking opportunities even if there's no immediate role.</p>
            </div>
             <div className="p-3 bg-muted/50 rounded-md">
                <h4 className="font-semibold">Maintain a Talent Pool:</h4>
                <p className="text-muted-foreground">Use this system to tag and categorize candidates for easy future searching based on skills or roles.</p>
            </div>
          </CardContent>
        </Card>

      </div>
    </AppLayout>
  );
}
