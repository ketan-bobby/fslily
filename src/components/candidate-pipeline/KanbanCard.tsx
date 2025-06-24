
"use client";

import React from 'react';
import type { Candidate, CandidateStage } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreVertical, Edit2, Trash2, MessageSquare, ArrowRightCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CANDIDATE_STAGES } from '@/lib/types';
import { format } from 'date-fns';


interface KanbanCardProps {
  candidate: Candidate;
  onStageChange: (candidateId: string, newStage: CandidateStage) => void;
  onViewDetails?: (candidateId: string) => void; // Optional: for viewing full details
  onDelete?: (candidateId: string) => void; // Optional: for deleting candidate
}

export const KanbanCard: React.FC<KanbanCardProps> = ({ candidate, onStageChange, onViewDetails, onDelete }) => {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <Card className="mb-4 shadow-md hover:shadow-lg transition-shadow duration-200 bg-card">
      <CardHeader className="p-4 flex flex-row items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border">
            <AvatarImage src={candidate.avatarUrl} alt={candidate.name} data-ai-hint="person portrait" />
            <AvatarFallback>{getInitials(candidate.name)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-base font-semibold">{candidate.name}</CardTitle>
            <p className="text-xs text-muted-foreground">{candidate.jobTitle}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            {onViewDetails && <DropdownMenuItem onClick={() => onViewDetails(candidate.id)}><Edit2 className="mr-2 h-4 w-4" />View/Edit Details</DropdownMenuItem>}
            {onDelete && <DropdownMenuItem onClick={() => onDelete(candidate.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4" />Delete Candidate</DropdownMenuItem>}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Move to Stage</DropdownMenuLabel>
            {CANDIDATE_STAGES.filter(s => s !== candidate.stage).map(stage => (
              <DropdownMenuItem key={stage} onClick={() => onStageChange(candidate.id, stage)}>
                <ArrowRightCircle className="mr-2 h-4 w-4" /> {stage}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="p-4 pt-0 text-sm">
        <div className="space-y-2">
          <p className="text-muted-foreground">Email: {candidate.email}</p>
          <p className="text-muted-foreground">Applied: {format(new Date(candidate.appliedDate), "MMM d, yyyy")}</p>
          {candidate.skills && candidate.skills.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {candidate.skills.slice(0, 3).map(skill => (
                <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
              ))}
              {candidate.skills.length > 3 && <Badge variant="outline" className="text-xs">+{candidate.skills.length - 3} more</Badge>}
            </div>
          )}
        </div>
      </CardContent>
      {candidate.notes && (
         <CardFooter className="p-4 border-t">
            <p className="text-xs text-muted-foreground italic flex items-start gap-1">
                <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" /> 
                <span>{candidate.notes.length > 50 ? `${candidate.notes.substring(0, 50)}...` : candidate.notes}</span>
            </p>
         </CardFooter>
      )}
    </Card>
  );
};
