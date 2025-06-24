
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { CalendarDays, User, Briefcase, Users2, Activity, ListChecks, Loader2, AlertTriangle, Link as LinkIconLucide, Eye, Edit, BarChart2, Trash2, ListTodo, Edit2, PlusCircle, UserCircle, DollarSign, StickyNote } from "lucide-react"; // Added UserCircle, DollarSign, StickyNote
import type { Project, JobRequisition, ActivityLog, JobRequisitionStatus, ProjectTask, ProjectTaskStatus, ProjectBudget } from '@/lib/types';
import {
  getProjectByIdFromDB,
  getLinkedJobRequisitionsForProject,
  getActivityLogsForProject,
  getJobRequisitionByIdFromDB,
  countJobsForProject,
  countCandidatesForProject,
  countInterviewsForProject,
  getProjectTasksFromDB,
  deleteProjectTaskFromDB,
  getProjectBudgetByProjectId, // New import
  deleteProjectBudgetByProjectId, // New import
} from '@/lib/db';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { format, formatDistanceToNow, differenceInDays, isValid } from 'date-fns';
import { ManageLinkedJobsDialog } from '@/components/projects/ManageLinkedJobsDialog';
import { JobRequisitionDialog } from '@/components/job-requisitions/JobRequisitionDialog';
import { ProjectTaskDialog } from '@/components/projects/ProjectTaskDialog';
import { ProjectBudgetDialog } from '@/components/projects/ProjectBudgetDialog'; // New import
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader as AlertHeader, 
  AlertDialogTitle as AlertTitle,    
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


interface MetricDisplayProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  isLoading?: boolean;
  description?: string;
}
const MetricDisplay: React.FC<MetricDisplayProps> = ({ label, value, icon: Icon, isLoading, description }) => (
  <div className="p-4 rounded-lg border bg-card shadow-sm">
    <div className="flex items-center justify-between mb-1">
        <h4 className="text-sm font-medium text-muted-foreground">{label}</h4>
        <Icon className="h-5 w-5 text-primary"/>
    </div>
    {isLoading ?
        <Loader2 className="h-8 w-8 animate-spin text-primary" /> :
        <div className="text-3xl font-bold text-foreground">{value}</div>
    }
    {description && !isLoading && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
  </div>
);


export default function ProjectDetailsPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [linkedJobs, setLinkedJobs] = useState<JobRequisition[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [projectTasks, setProjectTasks] = useState<ProjectTask[]>([]);
  const [projectBudget, setProjectBudget] = useState<ProjectBudget | null>(null); // New state for budget
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [isLoadingLinkedJobs, setIsLoadingLinkedJobs] = useState(true);
  const [isLoadingActivity, setIsLoadingActivity] = useState(true);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isLoadingBudget, setIsLoadingBudget] = useState(true); // New loading state for budget
  const { toast } = useToast();

  const [dynamicJobsCount, setDynamicJobsCount] = useState(0);
  const [dynamicCandidatesCount, setDynamicCandidatesCount] = useState(0);
  const [dynamicInterviewsCount, setDynamicInterviewsCount] = useState(0);
  const [isLoadingDynamicCounts, setIsLoadingDynamicCounts] = useState(true);

  const [viewingJob, setViewingJob] = useState<JobRequisition | null>(null);
  const [isJobDialogActuallyOpen, setIsJobDialogActuallyOpen] = useState(false);
  
  const [taskToDelete, setTaskToDelete] = useState<ProjectTask | null>(null);
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
  const [isTaskDialogActuallyOpen, setIsTaskDialogActuallyOpen] = useState(false);
  
  const [isBudgetDialogActuallyOpen, setIsBudgetDialogActuallyOpen] = useState(false); // New state for budget dialog


  const fetchProjectDetails = useCallback(async () => {
    if (!projectId) {
      setIsLoadingProject(false);
      setProject(null);
      return;
    }
    setIsLoadingProject(true);
    try {
      const data = await getProjectByIdFromDB(projectId);
      if (data) {
        setProject(data);
      } else {
        toast({ variant: "destructive", title: "Error", description: "Project not found." });
        setProject(null);
      }
    } catch (error) {
      console.error("[ProjectDetailsPage] fetchProjectDetails: Failed to fetch project:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load project details." });
      setProject(null);
    } finally {
      setIsLoadingProject(false);
    }
  }, [projectId, toast]);

  const fetchLinkedJobs = useCallback(async () => {
    if (!projectId) {
      setLinkedJobs([]);
      setIsLoadingLinkedJobs(false);
      return;
    }
    setIsLoadingLinkedJobs(true);
    setLinkedJobs([]); 
    try {
      const jobs = await getLinkedJobRequisitionsForProject(projectId);
      setLinkedJobs(jobs);
    } catch (error) {
      console.error("[ProjectDetailsPage] fetchLinkedJobs: Failed to fetch linked jobs:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load linked job requisitions." });
      setLinkedJobs([]);
    } finally {
      setIsLoadingLinkedJobs(false);
    }
  }, [projectId, toast]);

  const fetchProjectActivity = useCallback(async () => {
    if (!projectId) {
      setActivityLogs([]);
      setIsLoadingActivity(false);
      return;
    }
    setIsLoadingActivity(true);
    setActivityLogs([]); 
    try {
      const logs = await getActivityLogsForProject(projectId, 10);
      setActivityLogs(logs);
    } catch (error) {
      console.error("[ProjectDetailsPage] fetchProjectActivity: Failed to fetch project activity:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load project activity." });
      setActivityLogs([]);
    } finally {
      setIsLoadingActivity(false);
    }
  }, [projectId, toast]);

  const fetchDynamicCounts = useCallback(async () => {
    if (!projectId) {
      setIsLoadingDynamicCounts(false);
      return;
    }
    setIsLoadingDynamicCounts(true);
    try {
      const [jobs, candidates, interviews] = await Promise.all([
        countJobsForProject(projectId),
        countCandidatesForProject(projectId),
        countInterviewsForProject(projectId),
      ]);
      setDynamicJobsCount(jobs);
      setDynamicCandidatesCount(candidates);
      setDynamicInterviewsCount(interviews);
    } catch (error) {
      console.error(`[ProjectDetailsPage] Error fetching dynamic counts for project ${projectId}:`, error);
      toast({ variant: "destructive", title: "Error", description: "Could not load dynamic project counts." });
    } finally {
      setIsLoadingDynamicCounts(false);
    }
  }, [projectId, toast]);

  const fetchTasks = useCallback(async () => {
    if (!projectId) {
      setProjectTasks([]);
      setIsLoadingTasks(false);
      return;
    }
    setIsLoadingTasks(true);
    try {
      const tasks = await getProjectTasksFromDB(projectId);
      setProjectTasks(tasks);
    } catch (error) {
      console.error(`[ProjectDetailsPage] Error fetching tasks for project ${projectId}:`, error);
      toast({ variant: "destructive", title: "Error", description: "Could not load project tasks." });
    } finally {
      setIsLoadingTasks(false);
    }
  }, [projectId, toast]);

  const fetchBudget = useCallback(async () => {
    if (!projectId) {
      setProjectBudget(null);
      setIsLoadingBudget(false);
      return;
    }
    setIsLoadingBudget(true);
    try {
      const budget = await getProjectBudgetByProjectId(projectId);
      setProjectBudget(budget);
    } catch (error) {
      console.error(`[ProjectDetailsPage] Error fetching budget for project ${projectId}:`, error);
      toast({ variant: "destructive", title: "Error", description: "Could not load project budget." });
    } finally {
      setIsLoadingBudget(false);
    }
  }, [projectId, toast]);


  useEffect(() => {
    if (projectId) {
      setProject(null); 
      setIsLoadingProject(true);
      setIsLoadingLinkedJobs(true);
      setIsLoadingActivity(true);
      setIsLoadingDynamicCounts(true);
      setIsLoadingTasks(true);
      setIsLoadingBudget(true); // Set loading for budget

      fetchProjectDetails();
      fetchLinkedJobs();
      fetchProjectActivity();
      fetchDynamicCounts(); 
      fetchTasks();
      fetchBudget(); // Fetch budget
    } else {
        setProject(null);
        setLinkedJobs([]);
        setActivityLogs([]);
        setProjectTasks([]);
        setProjectBudget(null); // Reset budget
        setIsLoadingProject(false);
        setIsLoadingLinkedJobs(false);
        setIsLoadingActivity(false);
        setIsLoadingDynamicCounts(false);
        setIsLoadingTasks(false);
        setIsLoadingBudget(false); // Reset budget loading
    }
  }, [projectId, fetchProjectDetails, fetchLinkedJobs, fetchProjectActivity, fetchDynamicCounts, fetchTasks, fetchBudget]);
  
  const handleViewJobDetails = async (jobId: string) => {
    try {
        const jobDetails = await getJobRequisitionByIdFromDB(jobId);
        if (jobDetails) {
            setViewingJob(jobDetails);
            setIsJobDialogActuallyOpen(true); 
        } else {
            toast({ variant: "destructive", title: "Job Not Found", description: "Could not fetch details for the selected job."});
            setViewingJob(null);
        }
    } catch (error) {
        console.error(`[ProjectDetailsPage] Error fetching job ${jobId} for view:`, error);
        toast({ variant: "destructive", title: "Error", description: "Failed to fetch job details."});
        setViewingJob(null);
    }
  };
  
  const handleTaskSaved = () => {
    fetchTasks(); 
    setEditingTask(null);
    setIsTaskDialogActuallyOpen(false);
  };

  const handleConfirmDeleteTask = async () => {
    if (!taskToDelete) return;
    try {
      const success = await deleteProjectTaskFromDB(taskToDelete.id);
      if (success) {
        toast({ title: "Task Deleted", description: `Task "${taskToDelete.title}" removed.` });
        fetchTasks();
      } else {
        throw new Error("Delete operation failed.");
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not delete task." });
    } finally {
      setTaskToDelete(null);
    }
  };

  const handleBudgetSaved = () => {
    fetchBudget(); // Refresh budget
    setIsBudgetDialogActuallyOpen(false);
  };

  const handleConfirmDeleteBudget = async () => {
    if (!projectBudget) return;
    try {
      const success = await deleteProjectBudgetByProjectId(projectBudget.projectId);
      if (success) {
        toast({ title: "Budget Deleted", description: `Budget for project "${project?.name}" removed.` });
        fetchBudget();
      } else {
        throw new Error("Delete operation failed.");
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not delete budget." });
    }
  };

  const getStatusColor = (status: Project['status'] | undefined) => {
    if (!status) return "bg-muted text-muted-foreground";
    switch (status) {
      case "Active": return "bg-green-500 text-green-50";
      case "Planning": return "bg-blue-500 text-blue-50";
      case "Completed": return "bg-gray-500 text-gray-50";
      case "On Hold": return "bg-yellow-500 text-yellow-50";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getJobStatusColor = (status: JobRequisitionStatus) => {
    switch (status) {
      case "Open": return "text-green-600 bg-green-100 dark:text-green-300 dark:bg-green-700/30";
      case "Closed": return "text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-700/30";
      case "On Hold": return "text-yellow-600 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-700/30";
      case "Draft": return "text-gray-600 bg-gray-100 dark:text-gray-300 dark:bg-gray-700/30";
      default: return "text-muted-foreground bg-muted";
    }
  };
  
  const getTaskStatusColor = (status: ProjectTaskStatus) => {
    switch (status) {
      case "To Do": return "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200";
      case "In Progress": return "bg-blue-200 text-blue-700 dark:bg-blue-700 dark:text-blue-200";
      case "Completed": return "bg-green-200 text-green-700 dark:bg-green-700 dark:text-green-200";
      default: return "bg-muted text-muted-foreground";
    }
  };


  const projectStatsData = [
    { name: 'Jobs', count: dynamicJobsCount, fill: "hsl(var(--chart-1))" },
    { name: 'Candidates', count: dynamicCandidatesCount, fill: "hsl(var(--chart-2))" },
    { name: 'Interviews', count: dynamicInterviewsCount, fill: "hsl(var(--chart-3))" },
  ];

  const projectStatsChartConfig: ChartConfig = {
    count: { label: "Count" },
    Jobs: { label: "Jobs", color: "hsl(var(--chart-1))" },
    Candidates: { label: "Candidates", color: "hsl(var(--chart-2))" },
    Interviews: { label: "Interviews", color: "hsl(var(--chart-3))" },
  };

  if (isLoadingProject && !project) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="ml-3 text-lg">Loading project details...</p>
        </div>
      </AppLayout>
    );
  }

  if (!project) {
    return (
      <AppLayout>
        <div className="text-center py-10">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Project Not Found</h2>
          <p className="text-muted-foreground mb-4">The project you are looking for does not exist or could not be loaded.</p>
          <Button asChild>
            <Link href="/all-projects">Back to All Projects</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  const startDate = project.startDate && isValid(new Date(project.startDate)) ? new Date(project.startDate) : null;
  const endDate = project.endDate && isValid(new Date(project.endDate)) ? new Date(project.endDate) : null;
  const today = new Date();
  today.setHours(0,0,0,0); 
  
  let totalDurationDays = 0;
  let elapsedDays = 0;
  let remainingDays = 0;
  let timeElapsedPercentage = 0;

  if (startDate && endDate && startDate <= endDate) {
    totalDurationDays = differenceInDays(endDate, startDate) + 1; 
    if (today >= startDate) {
        elapsedDays = differenceInDays(today > endDate ? endDate : today, startDate) +1;
        if (elapsedDays < 0) elapsedDays = 0; 
    }
    remainingDays = totalDurationDays - elapsedDays;
    if (remainingDays < 0) remainingDays = 0;
    timeElapsedPercentage = totalDurationDays > 0 ? Math.min(100, Math.round((elapsedDays / totalDurationDays) * 100)) : 0;
  } else if (startDate && today >= startDate) {
    elapsedDays = differenceInDays(today, startDate) + 1;
  }


  return (
    <AppLayout>
      <AlertDialog open={!!taskToDelete} onOpenChange={(open) => !open && setTaskToDelete(null)}>
        <AlertDialogContent>
            <AlertHeader>
              <AlertTitle>Are you sure?</AlertTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the task "{taskToDelete?.title}".
              </AlertDialogDescription>
            </AlertHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setTaskToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDeleteTask} className="bg-destructive hover:bg-destructive/90">Delete Task</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {project && (
        <ProjectTaskDialog
            projectId={project.id}
            task={editingTask || undefined}
            onTaskSaved={handleTaskSaved}
            customOpen={isTaskDialogActuallyOpen}
            customOnOpenChange={(open) => {
                setIsTaskDialogActuallyOpen(open);
                if (!open) setEditingTask(null);
            }}
            triggerButton={<></>} 
        />
      )}
      
      {project && (
        <ProjectBudgetDialog
            projectId={project.id}
            currentBudget={projectBudget || undefined}
            onBudgetSaved={handleBudgetSaved}
            customOpen={isBudgetDialogActuallyOpen}
            customOnOpenChange={setIsBudgetDialogActuallyOpen}
            triggerButton={<></>} // Actual trigger is in the Budget Card
        />
      )}


      <div className="space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Badge className={`text-sm px-3 py-1 ${getStatusColor(project.status)}`}>{project.status}</Badge>
              <h1 className="text-3xl font-bold tracking-tight font-headline">{project.name}</h1>
            </div>
            <div className="flex items-center text-md text-muted-foreground gap-2">
              <User className="h-4 w-4"/> Managed by: {project.manager}
            </div>
             {(startDate || endDate) && (
                <div className="flex items-center text-sm text-muted-foreground gap-1.5 mt-1">
                    <CalendarDays className="h-4 w-4"/>
                    <span>
                        {startDate ? format(startDate, "PPP") : 'N/A'} - {endDate ? format(endDate, "PPP") : 'Ongoing'}
                    </span>
                </div>
            )}
          </div>
          <Button variant="outline" asChild>
            <Link href={`/all-projects?edit=${project.id}`}>
              <Edit className="mr-2 h-4 w-4" /> Edit Project
            </Link>
          </Button>
        </header>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Project Overview & Description</CardTitle>
          </CardHeader>
          <CardContent>
            {project.description && (
              <ScrollArea className="h-auto max-h-40 rounded-md border p-4 bg-muted/30 shadow-inner">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{project.description}</p>
              </ScrollArea>
            )}
             {!project.description && <p className="text-sm text-muted-foreground">No description provided for this project.</p>}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Project Dashboard</CardTitle>
            <CardDescription>Key metrics, timeline, and progress for this project.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Key Performance Indicators</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricDisplay label="Jobs Linked" value={dynamicJobsCount} icon={Briefcase} isLoading={isLoadingDynamicCounts}/>
                <MetricDisplay label="Candidates" value={dynamicCandidatesCount} icon={Users2} isLoading={isLoadingDynamicCounts} description="Total in pipeline"/>
                <MetricDisplay label="Interviews" value={dynamicInterviewsCount} icon={Activity} isLoading={isLoadingDynamicCounts} description="Total scheduled"/>
                <MetricDisplay label="Project Progress" value={`${project.progress}%`} icon={ListChecks} description="Manually set completion"/>
              </div>
            </div>
            
            {startDate && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center">
                <CalendarDays className="mr-2 h-5 w-5 text-primary" /> Project Timeline
              </h3>
                <div className="space-y-4 text-sm p-4 border rounded-lg bg-card shadow">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p><strong>Start Date:</strong> {format(startDate, "PPP")}</p>
                      {endDate && <p><strong>End Date:</strong> {format(endDate, "PPP")}</p>}
                      {endDate && startDate <= endDate && <p><strong>Total Duration:</strong> {totalDurationDays} days</p>}
                    </div>
                    <div>
                      <p><strong>Days Elapsed:</strong> {elapsedDays} days</p>
                      {endDate && startDate <= endDate && <p><strong>Days Remaining:</strong> {remainingDays} days</p>}
                    </div>
                  </div>
                  {endDate && startDate <= endDate && (
                    <div className="mt-2">
                      <Label className="text-xs">Time Elapsed ({timeElapsedPercentage}%)</Label>
                      <Progress value={timeElapsedPercentage} className="h-3 mt-1" />
                    </div>
                  )}
                   <div>
                    <Label className="text-xs">Overall Progress ({project.progress}%)</Label>
                    <Progress value={project.progress} className="h-3 mt-1" indicatorClassName="bg-green-500" />
                  </div>
                   {endDate && startDate <= endDate && project.progress < timeElapsedPercentage && project.status === "Active" && (
                     <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1 mt-2">
                        <AlertTriangle className="h-3.5 w-3.5"/> Project progress is behind schedule based on time elapsed.
                     </p>
                   )}
                </div>
            </div>
            )}

            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center">
                <BarChart2 className="mr-2 h-5 w-5 text-primary" /> Project Metrics Overview
              </h3>
              {isLoadingDynamicCounts ? (
                <div className="flex justify-center items-center h-[250px]">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <ChartContainer config={projectStatsChartConfig} className="h-[250px] w-full">
                  <BarChart data={projectStatsData} accessibilityLayer>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={10} allowDecimals={false}/>
                    <Tooltip content={<ChartTooltipContent />} cursor={{fill: 'hsl(var(--muted))'}}/>
                    <Bar dataKey="count" radius={8}>
                       <LabelList dataKey="count" position="top" offset={5} className="fill-foreground text-xs" />
                       {projectStatsData.map((entry) => (
                          <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                       ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )}
            </div>
          </CardContent>
        </Card>

         <Card className="shadow-lg">
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary"/>Budget Overview</CardTitle>
            <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsBudgetDialogActuallyOpen(true)}>
                    <Edit2 className="mr-2 h-4 w-4" /> {projectBudget ? 'Manage Budget' : 'Set Up Budget'}
                </Button>
                {projectBudget && (
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" disabled={isLoadingBudget}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Budget
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertHeader>
                                <AlertTitle>Are you sure?</AlertTitle>
                                <AlertDialogDescription>
                                This action will permanently delete the budget for project "{project.name}". This cannot be undone.
                                </AlertDialogDescription>
                            </AlertHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleConfirmDeleteBudget}>Delete Budget</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingBudget ? (
              <div className="flex items-center justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary"/><p className="ml-2 text-sm text-muted-foreground">Loading budget...</p></div>
            ) : projectBudget ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="p-3 border rounded-md bg-muted/20">
                    <Label className="text-xs text-muted-foreground">Total Budget</Label>
                    <p className="text-xl font-semibold">{projectBudget.currency} {projectBudget.totalBudget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                 <div className="p-3 border rounded-md bg-muted/20">
                    <Label className="text-xs text-muted-foreground">Spent Budget</Label>
                    <p className="text-xl font-semibold">{projectBudget.currency} {projectBudget.spentBudget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                 <div className="p-3 border rounded-md bg-muted/20">
                    <Label className="text-xs text-muted-foreground">Remaining Budget</Label>
                    <p className="text-xl font-semibold">{projectBudget.currency} {(projectBudget.totalBudget - projectBudget.spentBudget).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                {projectBudget.notes && (
                    <div className="md:col-span-3 p-3 border rounded-md bg-muted/20">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1"><StickyNote className="h-3 w-3"/>Budget Notes</Label>
                        <p className="text-sm whitespace-pre-wrap mt-1">{projectBudget.notes}</p>
                    </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No budget set up for this project yet.</p>
            )}
          </CardContent>
           <CardFooter className="border-t pt-4 mt-4">
             <p className="text-xs text-muted-foreground">Resource allocation tracking will be added in a future update.</p>
           </CardFooter>
        </Card>
        
         <Card className="shadow-lg">
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle className="flex items-center gap-2"><ListTodo className="h-5 w-5 text-primary"/>Project Tasks</CardTitle>
            {project && (
                <Button variant="outline" size="sm" onClick={() => { setEditingTask(null); setIsTaskDialogActuallyOpen(true); }}>
                   <PlusCircle className="mr-2 h-4 w-4" /> Add Task
                </Button>
            )}
          </CardHeader>
          <CardContent>
            {isLoadingTasks ? (
              <div className="flex items-center justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary"/><p className="ml-2 text-sm text-muted-foreground">Loading tasks...</p></div>
            ) : projectTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No tasks added to this project yet.</p>
            ) : (
              <ScrollArea className="h-auto max-h-96">
                <div className="space-y-3">
                  {projectTasks.map(task => (
                    <Card key={task.id} className="bg-muted/40 shadow-sm hover:shadow-md transition-shadow">
                      <CardHeader className="p-3 pb-2 flex flex-row justify-between items-start">
                        <div>
                            <CardTitle className="text-base font-medium">{task.title}</CardTitle>
                            <CardDescription className="text-xs">
                                {task.assigneeName ? `Assignee: ${task.assigneeName}` : 'Unassigned'}
                                {task.dueDate && ` | Due: ${format(new Date(task.dueDate), 'MMM d, yyyy')}`}
                            </CardDescription>
                            {task.candidateName && (
                                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                   <UserCircle className="h-3 w-3"/> Candidate: {task.candidateName}
                                </div>
                            )}
                        </div>
                        <Badge className={`text-xs px-2 py-0.5 ${getTaskStatusColor(task.status)}`}>{task.status}</Badge>
                      </CardHeader>
                      {task.description && (
                        <CardContent className="p-3 pt-0 pb-2">
                            <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                        </CardContent>
                      )}
                      <CardFooter className="p-3 pt-1 flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingTask(task); setIsTaskDialogActuallyOpen(true); }}>
                           <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setTaskToDelete(task)}>
                           <Trash2 className="h-4 w-4" />
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>


        <div className="grid md:grid-cols-2 gap-6">
            <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <CardTitle className="flex items-center gap-2"><LinkIconLucide className="h-5 w-5 text-primary"/>Linked Job Requisitions</CardTitle>
                    {project && (
                      <ManageLinkedJobsDialog
                        projectId={project.id}
                        onLinksUpdated={() => {
                          toast({ title: "Updating View...", description: "Refreshing linked jobs, activity timeline and counts.", duration: 2000});
                          fetchLinkedJobs();
                          fetchProjectActivity();
                          fetchDynamicCounts();
                        }}
                      />
                    )}
                </CardHeader>
                <CardContent>
                    {isLoadingLinkedJobs ? (
                        <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin text-primary"/>
                            <p className="ml-2 text-sm text-muted-foreground">Loading linked jobs...</p>
                        </div>
                    ) : linkedJobs.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No job requisitions are currently linked to this project.</p>
                    ) : (
                        <ScrollArea className="h-auto max-h-80">
                           <div className="space-y-3">
                            {linkedJobs.map(job => (
                                <Card key={job.id} className="bg-muted/40 shadow-sm">
                                    <CardHeader className="p-3 pb-2">
                                        <div className="flex justify-between items-start">
                                            <CardTitle className="text-base font-medium">{job.title}</CardTitle>
                                            <Badge variant="outline" className={`text-xs px-2 py-0.5 ${getJobStatusColor(job.status)} border ${getJobStatusColor(job.status).replace('bg-', 'border-')}`}>{job.status}</Badge>
                                        </div>
                                        <CardDescription className="text-xs">
                                            {job.department} - {job.location}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardFooter className="p-3 pt-0">
                                        <Button variant="outline" size="xs" onClick={() => handleViewJobDetails(job.id)}>
                                            <Eye className="mr-1.5 h-3 w-3"/> View Job
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                           </div>
                        </ScrollArea>
                    )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><ListChecks className="h-5 w-5 text-primary"/>Project Activity Timeline</CardTitle></CardHeader>
                <CardContent>
                    {isLoadingActivity ? (
                         <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin text-primary"/>
                            <p className="ml-2 text-sm text-muted-foreground">Loading activity...</p>
                        </div>
                    ) : activityLogs.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No recent activity for this project.</p>
                    ) : (
                        <ScrollArea className="h-auto max-h-80">
                            <ul className="space-y-3">
                                {activityLogs.map(log => (
                                    <li key={log.id} className="flex items-start gap-3 p-2 border-b last:border-b-0 text-xs">
                                        <Activity className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-foreground">{log.description}</p>
                                            <p className="text-muted-foreground">
                                                {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                                                <span className="text-muted-foreground/70"> ({format(new Date(log.timestamp), 'MMM d, yyyy, h:mm a')})</span>
                                                {log.user && ` by ${log.user}`}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </ScrollArea>
                    )}
                </CardContent>
            </Card>
        </div>
        
        {viewingJob && (
            <JobRequisitionDialog
                requisition={viewingJob}
                viewOnly={true}
                customOpen={isJobDialogActuallyOpen}
                customOnOpenChange={(open) => {
                    setIsJobDialogActuallyOpen(open);
                    if (!open) {
                        setViewingJob(null); 
                    }
                }}
            />
        )}

        <CardFooter className="justify-end border-t pt-6">
             <Button asChild variant="outline">
                <Link href="/all-projects">
                    Back to All Projects
                </Link>
            </Button>
        </CardFooter>

      </div>
    </AppLayout>
  );
}
