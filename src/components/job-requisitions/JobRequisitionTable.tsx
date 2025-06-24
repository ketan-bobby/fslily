
"use client";

import React from 'react';
import type { JobRequisition } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Trash2, Edit } from 'lucide-react'; // Added Edit
import { JobRequisitionDialog } from './JobRequisitionDialog'; // For editing
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
} from "@/components/ui/alert-dialog"

interface JobRequisitionTableProps {
  requisitions: JobRequisition[];
  onEditRequisition: (requisition: Omit<JobRequisition, 'id' | 'datePosted'>, id: string) => void;
  onDeleteRequisition: (id: string) => void;
  onViewRequisition?: (requisition: JobRequisition) => void; 
}

const statusColors: Record<JobRequisition['status'], string> = {
  Open: "bg-green-500 hover:bg-green-600",
  Closed: "bg-red-500 hover:bg-red-600",
  "On Hold": "bg-yellow-500 hover:bg-yellow-600",
  Draft: "bg-gray-500 hover:bg-gray-600",
};

const priorityBadgeVariant = (priority?: JobRequisition['priority']): React.ComponentProps<typeof Badge>['variant'] => {
  if (!priority) return "outline";
  switch (priority) {
    case 'High': return 'destructive';
    case 'Medium': return 'secondary'; // Using secondary for Medium as an example
    case 'Low': return 'outline';
    default: return 'outline';
  }
}

export const JobRequisitionTable: React.FC<JobRequisitionTableProps> = ({ requisitions, onEditRequisition, onDeleteRequisition, onViewRequisition }) => {
  if (requisitions.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No job requisitions found. Create one to get started!</p>;
  }
  
  return (
    <div className="rounded-lg border overflow-hidden shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Hiring Manager</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date Posted</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requisitions.map((req) => (
            <TableRow key={req.id}>
              <TableCell className="font-medium">{req.title}</TableCell>
              <TableCell>{req.department}</TableCell>
              <TableCell>{req.location}</TableCell>
              <TableCell>{req.hiringManager || 'N/A'}</TableCell>
              <TableCell>
                {req.priority ? (
                  <Badge variant={priorityBadgeVariant(req.priority)}>{req.priority}</Badge>
                ) : (
                  <span className="text-muted-foreground text-xs">N/A</span>
                )}
              </TableCell>
              <TableCell>
                <Badge className={`${statusColors[req.status]} text-primary-foreground`}>{req.status}</Badge>
              </TableCell>
              <TableCell>{format(new Date(req.datePosted), "MMM d, yyyy")}</TableCell>
              <TableCell className="text-right space-x-1">
                {onViewRequisition && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 p-0" onClick={() => onViewRequisition(req)}>
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View Details</span>
                    </Button>
                )}
                {/* Pass requisition data to the dialog for editing */}
                <JobRequisitionDialog 
                    requisition={req} 
                    onSave={onEditRequisition} 
                    triggerButton={
                        <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit Requisition</span>
                        </Button>
                    }
                />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete Requisition</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the job requisition "{req.title}".
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDeleteRequisition(req.id)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
