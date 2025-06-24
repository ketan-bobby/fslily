
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { AppLayout } from "@/components/layout/app-layout";
import type { JobRequisition, JobRequisitionStatus } from '@/lib/types';
import { JobRequisitionTable } from '@/components/job-requisitions/JobRequisitionTable';
import { JobRequisitionDialog } from '@/components/job-requisitions/JobRequisitionDialog';
import { Input } from '@/components/ui/input';
import { Search, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card"; // Removed CardHeader, CardTitle
import { JOB_REQUISITION_STATUSES } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
// Removed direct DB imports: getJobRequisitionsFromDB, saveJobRequisitionToDB, deleteJobRequisitionFromDB

export default function JobRequisitionsPage() {
  const [requisitions, setRequisitions] = useState<JobRequisition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<JobRequisitionStatus | 'all'>('all');
  const { toast } = useToast();

  const fetchRequisitions = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/job-requisitions');
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      const data: JobRequisition[] = await response.json();
      setRequisitions(data);
      if (data.length === 0) {
          console.log("No job requisitions fetched from API, or API returned empty.");
      }
    } catch (error) {
      console.error("Failed to fetch requisitions:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load job requisitions from API." });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRequisitions();
  }, [fetchRequisitions]);

  const handleSaveRequisition = async (
    newData: Omit<JobRequisition, 'id' | 'datePosted' | 'createdAt' | 'updatedAt'>,
    id?: string
  ) => {
    setIsLoading(true);
    try {
      const url = id ? `/api/job-requisitions/${id}` : '/api/job-requisitions';
      const method = id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${id ? 'update' : 'create'} requisition`);
      }
      
      // const savedRequisition: JobRequisition = await response.json(); // No need to parse if just refetching
      toast({ title: "Success", description: `Job requisition ${id ? 'updated' : 'created'} successfully.` });
      fetchRequisitions(); // Refetch all requisitions to reflect changes
    } catch (error) {
      console.error("Failed to save requisition:", error);
      toast({ variant: "destructive", title: "Error", description: (error as Error).message || "Could not save job requisition via API." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRequisition = async (id: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/job-requisitions/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete requisition");
      }
      
      toast({ title: "Success", description: "Job requisition deleted." });
      fetchRequisitions(); // Refetch
    } catch (error) {
      console.error("Failed to delete requisition:", error);
      toast({ variant: "destructive", title: "Error", description: (error as Error).message || "Could not delete job requisition via API." });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRequisitions = useMemo(() => {
    return requisitions.filter(req => {
      const matchesSearch = req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            req.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            req.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [requisitions, searchTerm, statusFilter]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <header className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline">Job Requisitions</h1>
            <p className="text-muted-foreground">Manage your company's job openings and hiring workflows.</p>
          </div>
          <JobRequisitionDialog onSave={handleSaveRequisition} />
        </header>

        <Card className="p-4 sm:p-6 shadow-md">
          <CardContent className="p-0">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-grow">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search requisitions (title, department, location...)"
                  className="pl-8 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as JobRequisitionStatus | 'all')}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {JOB_REQUISITION_STATUSES.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        
        {isLoading && requisitions.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Loading job requisitions...</p>
          </div>
        ) : (
          <JobRequisitionTable 
            requisitions={filteredRequisitions} 
            onEditRequisition={(data, id) => handleSaveRequisition(data, id!)}
            onDeleteRequisition={handleDeleteRequisition}
          />
        )}
      </div>
    </AppLayout>
  );
}
