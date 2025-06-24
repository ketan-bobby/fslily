
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AppLayout } from "@/components/layout/app-layout";
import type { Candidate, CandidateStage } from '@/lib/types';
import { CANDIDATE_STAGES } from '@/lib/types';
import { KanbanColumn } from '@/components/candidate-pipeline/KanbanColumn';
import { AddCandidateDialog } from '@/components/candidate-pipeline/AddCandidateDialog';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Input } from '@/components/ui/input';
import { Card, CardContent } from "@/components/ui/card";
import { Search, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { getCandidatesFromDB, saveCandidateToDB, deleteCandidateFromDB } from '@/lib/db';

export default function CandidatePipelinePage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJobFilter, setSelectedJobFilter] = useState<string>('all');
  const [uniqueJobTitles, setUniqueJobTitles] = useState<string[]>(['all']);
  const { toast } = useToast();

  const fetchCandidates = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getCandidatesFromDB({ jobTitle: selectedJobFilter });
      setCandidates(data);
      if (data.length > 0) {
          const titles = Array.from(new Set(data.map(c => c.jobTitle)));
          setUniqueJobTitles(['all', ...titles]);
      } else {
          setUniqueJobTitles(['all']);
          console.log("No candidates fetched from DB, or DB returned empty. Check DB connection and data.");
      }
    } catch (error) {
      console.error("Failed to fetch candidates:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load candidates. Ensure the database is connected and schema is set up." });
    } finally {
      setIsLoading(false);
    }
  }, [selectedJobFilter, toast]); // Removed toast from dependency list as it shouldn't trigger re-fetch

 useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]); // fetchCandidates is memoized and only changes if selectedJobFilter changes

  const handleStageChange = async (candidateId: string, newStage: CandidateStage) => {
    const candidateToUpdate = candidates.find(c => c.id === candidateId);
    if (candidateToUpdate) {
      setIsLoading(true);
      try {
        const updatedCandidate = await saveCandidateToDB({ ...candidateToUpdate, stage: newStage }, candidateId);
        if (updatedCandidate) {
          setCandidates(prevCandidates =>
            prevCandidates.map(candidate =>
              candidate.id === candidateId ? updatedCandidate : candidate
            )
          );
          toast({ title: "Candidate Stage Updated", description: `${updatedCandidate.name} moved to ${newStage}.` });
        } else {
          throw new Error("Update operation did not return a candidate.");
        }
      } catch (error) {
        console.error("Failed to update candidate stage:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not update candidate stage. Check server logs and database." });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleAddCandidate = async (newCandidateData: Omit<Candidate, 'id' | 'appliedDate'>) => {
    setIsLoading(true);
    try {
      const savedCandidate = await saveCandidateToDB({
          ...newCandidateData,
          avatarUrl: `https://placehold.co/100x100.png?text=${newCandidateData.name.substring(0,1)}`,
      });
      if (savedCandidate) {
        setCandidates(prevCandidates => [savedCandidate, ...prevCandidates]);
        if (!uniqueJobTitles.includes(savedCandidate.jobTitle)) {
            setUniqueJobTitles(prev => [...prev, savedCandidate.jobTitle].sort());
        }
        toast({ title: "Candidate Added", description: `${savedCandidate.name} added to pipeline.` });
      } else {
        throw new Error("Save operation did not return a candidate.");
      }
    } catch (error) {
      console.error("Failed to add candidate:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not add candidate. Check server logs and database." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCandidate = async (candidateId: string) => {
     setIsLoading(true);
     try {
      const success = await deleteCandidateFromDB(candidateId);
      if (success) {
        setCandidates(prevCandidates => prevCandidates.filter(c => c.id !== candidateId));
        toast({ title: "Candidate Deleted", description: "Candidate removed from pipeline." });
      } else {
        throw new Error("Delete operation failed.");
      }
    } catch (error) {
      console.error("Failed to delete candidate:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not delete candidate. Check server logs and database." });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCandidates = useMemo(() => {
    if (!searchTerm) return candidates;
    return candidates.filter(candidate => {
      return candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             candidate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
             candidate.jobTitle.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [candidates, searchTerm]);


  return (
    <AppLayout>
      <div className="flex flex-col h-full gap-6">
        <header className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline">Candidate Pipeline</h1>
            <p className="text-muted-foreground">Visualize and manage your candidates through various hiring stages.</p>
          </div>
          <AddCandidateDialog onAddCandidate={handleAddCandidate} />
        </header>

        <Card className="p-4 sm:p-6 shadow-md">
          <CardContent className="p-0">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-grow">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search candidates (name, email, job...)"
                  className="pl-8 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={selectedJobFilter} onValueChange={setSelectedJobFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filter by job title" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueJobTitles.map(title => (
                    <SelectItem key={title} value={title}>{title === 'all' ? 'All Job Titles' : title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        
        {isLoading && candidates.length === 0 ? (
          <div className="flex justify-center items-center h-[calc(100vh-20rem)]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Loading candidates...</p>
          </div>
        ) : (
          <ScrollArea className="flex-grow pb-2">
            <div className="flex gap-6 h-[calc(100vh-20rem)]">
              {CANDIDATE_STAGES.map(stage => (
                <KanbanColumn
                  key={stage}
                  stage={stage}
                  candidates={filteredCandidates.filter(candidate => candidate.stage === stage)}
                  onStageChange={handleStageChange}
                  onDelete={handleDeleteCandidate}
                />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </div>
    </AppLayout>
  );
}
