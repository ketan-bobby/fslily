
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
    CalendarDays, User, Edit2, MoreVertical, Trash2, Loader2, 
    Link as LinkIconLucide, ListChecks, ShieldAlert, Users2, BrainCircuit, Eye, AlertTriangle, Briefcase, Activity
} from "lucide-react";
import type { Project as BaseProject } from '@/lib/types';
import { AddProjectDialog } from './AddProjectDialog';
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
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface ProjectWithDynamicCounts extends BaseProject {
  dynamicJobsCount?: number;
  dynamicCandidatesCount?: number;
  dynamicInterviewsCount?: number;
  dynamicCountsLoading?: boolean;
}

interface ProjectCardProps {
  project: ProjectWithDynamicCounts; // Use the extended type
  onEditProject: (project: ProjectWithDynamicCounts) => void; 
  onDeleteProject: (projectId: string) => Promise<void> | void;
}

const CountDisplay: React.FC<{value?: number, isLoading?: boolean, defaultVal: number}> = ({ value, isLoading, defaultVal }) => {
  if (isLoading) return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
  return <>{typeof value === 'number' ? value : defaultVal}</>;
};


export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onEditProject, onDeleteProject }) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const { toast } = useToast();

  const isInvalidProjectData = !project || typeof project.id !== 'string' || project.id.trim() === '' || project.id === 'your-project-id';

  if (isInvalidProjectData) {
    console.error("ProjectCard received invalid project prop:", project);
    return (
      <Card className="flex flex-col h-full shadow-md border-destructive p-4 items-center justify-center text-center">
        <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
        <CardTitle className="text-lg text-destructive">Invalid Project Data</CardTitle>
        <CardDescription className="text-xs">This project card could not be displayed due to missing or invalid ID. Check console for details.</CardDescription>
      </Card>
    );
  }

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDeleteProject(project.id);
    } finally {
      setIsDeleting(false);
    }
  };
  
  const getStatusColor = (status: BaseProject['status']) => {
    switch (status) {
      case "Active": return "bg-green-500 text-green-50";
      case "Planning": return "bg-blue-500 text-blue-50";
      case "Completed": return "bg-gray-500 text-gray-50";
      case "On Hold": return "bg-yellow-500 text-yellow-50";
      default: return "bg-muted text-muted-foreground";
    }
  };
  
  const handlePlaceholderClick = (featureName: string) => {
    toast({
        title: "Feature Coming Soon",
        description: `${featureName} functionality is under development.`,
    });
  };


  return (
    <Card className="flex flex-col h-full shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start mb-2">
          <Badge className={`text-xs ${getStatusColor(project.status)}`}>{project.status}</Badge>
          <div className="flex items-center gap-1">
            <AddProjectDialog 
                project={project} 
                onSaveProject={(data, id) => onEditProject({ ...project, ...data, id: id || project.id })}
                customTrigger={
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Edit2 className="h-4 w-4" />
                        <span className="sr-only">Edit Project</span>
                    </Button>
                }
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreVertical className="h-4 w-4" />
                   <span className="sr-only">More options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/projects/${project.id}`}>
                    <Eye className="mr-2 h-4 w-4"/> View Details
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePlaceholderClick("Link Jobs to Project (Card Action)")}>
                    <LinkIconLucide className="mr-2 h-4 w-4"/> Link Jobs
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePlaceholderClick("Project Activity Timeline (Card Action)")}>
                    <ListChecks className="mr-2 h-4 w-4"/> Activity Timeline
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Project
                        </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the project "{project.name}".
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <CardTitle className="text-lg font-semibold">{project.name}</CardTitle>
        <div className="flex items-center text-xs text-muted-foreground gap-1 mt-1">
            <User className="h-3 w-3"/> <span>{project.manager}</span>
        </div>
        {(project.startDate || project.endDate) && (
            <div className="flex items-center text-xs text-muted-foreground gap-1 mt-0.5">
                <CalendarDays className="h-3 w-3"/> 
                <span>
                    {project.startDate ? format(new Date(project.startDate), "d MMM yyyy") : 'N/A'} - {project.endDate ? format(new Date(project.endDate), "d MMM yyyy") : 'Ongoing'}
                </span>
            </div>
        )}
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground flex-grow pb-3 space-y-3">
        {project.description ? (
            <p className="line-clamp-3">{project.description}</p>
        ) : (
            <p className="italic">No description provided.</p>
        )}
        <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-1.5 rounded-md bg-green-50 dark:bg-green-900/30">
                <div className="text-lg font-bold text-green-700 dark:text-green-300 flex items-center justify-center">
                    <Briefcase className="h-4 w-4 mr-1.5 opacity-70"/>
                    <CountDisplay value={project.dynamicJobsCount} isLoading={project.dynamicCountsLoading} defaultVal={project.jobsCount} />
                </div>
                <p className="text-xs text-green-600 dark:text-green-400">Jobs</p>
            </div>
            <div className="p-1.5 rounded-md bg-red-50 dark:bg-red-900/30">
                 <div className="text-lg font-bold text-red-700 dark:text-red-300 flex items-center justify-center">
                    <Users2 className="h-4 w-4 mr-1.5 opacity-70"/>
                    <CountDisplay value={project.dynamicCandidatesCount} isLoading={project.dynamicCountsLoading} defaultVal={project.candidatesInPipeline} />
                </div>
                <p className="text-xs text-red-600 dark:text-red-400">Candidates</p>
            </div>
             <div className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-900/30">
                <div className="text-lg font-bold text-blue-700 dark:text-blue-300 flex items-center justify-center">
                    <Activity className="h-4 w-4 mr-1.5 opacity-70"/>
                    <CountDisplay value={project.dynamicInterviewsCount} isLoading={project.dynamicCountsLoading} defaultVal={project.interviewsCount} />
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400">Interviews</p>
            </div>
        </div>
        <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Progress</span>
                <span>{project.progress}%</span>
            </div>
            <Progress value={project.progress} className="h-2" />
        </div>
      </CardContent>
       <CardFooter className="pt-2 pb-4 flex flex-col gap-2">
        <Button variant="default" size="sm" className="w-full text-xs bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => handlePlaceholderClick("AI Project Insights")}>
            <BrainCircuit className="mr-1.5 h-3 w-3"/>AI Project Insights
        </Button>
         <div className="grid grid-cols-2 gap-2 w-full">
            <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => handlePlaceholderClick("AI Risk Assessment")}>
                <ShieldAlert className="mr-1.5 h-3 w-3"/>AI Risk Assessment
            </Button>
            <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => handlePlaceholderClick("AI Talent Sourcing for Project")}>
                <Users2 className="mr-1.5 h-3 w-3"/>AI Talent Sourcing
            </Button>
        </div>
      </CardFooter>
    </Card>
  );
};
