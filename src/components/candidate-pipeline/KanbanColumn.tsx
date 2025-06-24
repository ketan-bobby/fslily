
"use client";

import React from 'react';
import type { Candidate, CandidateStage } from '@/lib/types';
import { KanbanCard } from './KanbanCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface KanbanColumnProps {
  stage: CandidateStage;
  candidates: Candidate[];
  onStageChange: (candidateId: string, newStage: CandidateStage) => void;
  onViewDetails?: (candidateId: string) => void;
  onDelete?: (candidateId: string) => void;
}

const stageColors: Record<CandidateStage, string> = {
  Sourced: "bg-blue-500",
  Screening: "bg-purple-500",
  Interview: "bg-yellow-500",
  Offer: "bg-orange-500",
  Hired: "bg-green-500",
  Rejected: "bg-red-500",
};


export const KanbanColumn: React.FC<KanbanColumnProps> = ({ stage, candidates, onStageChange, onViewDetails, onDelete }) => {
  return (
    <Card className="w-full md:w-80 lg:w-96 flex-shrink-0 bg-muted/30 h-full flex flex-col shadow-md">
      <CardHeader className="p-4 border-b sticky top-0 bg-muted/50 z-10 rounded-t-lg">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center">
            <span className={`w-3 h-3 rounded-full mr-2 ${stageColors[stage]}`}></span>
            {stage}
          </CardTitle>
          <Badge variant="secondary" className="text-sm">{candidates.length}</Badge>
        </div>
      </CardHeader>
      <ScrollArea className="flex-1">
        <CardContent className="p-4 space-y-0"> {/* Removed space-y-4 to let KanbanCard handle its margin */}
          {candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No candidates in this stage.</p>
          ) : (
            candidates.map(candidate => (
              <KanbanCard 
                key={candidate.id} 
                candidate={candidate} 
                onStageChange={onStageChange}
                onViewDetails={onViewDetails}
                onDelete={onDelete}
              />
            ))
          )}
        </CardContent>
      </ScrollArea>
    </Card>
  );
};
