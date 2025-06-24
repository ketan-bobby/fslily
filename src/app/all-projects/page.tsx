
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddProjectDialog, type ProjectFormData } from '@/components/all-projects/AddProjectDialog';
import { ProjectCard } from '@/components/all-projects/ProjectCard';
import { useToast } from "@/hooks/use-toast";
import type { Project as BaseProject, ProjectStatus } from '@/lib/types';
import { getProjectsFromDB, saveProjectToDB, deleteProjectFromDB, countJobsForProject, countCandidatesForProject, countInterviewsForProject } from '@/lib/db';
import { Loader2, Search, Filter as FilterIcon, PlusCircle, FolderOpen } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";

type FilterType = ProjectStatus | "All Projects";

// Extend base Project type for local state
interface ProjectWithDynamicCounts extends BaseProject {
  dynamicJobsCount?: number;
  dynamicCandidatesCount?: number;
  dynamicInterviewsCount?: number;
  dynamicCountsLoading?: boolean;
}

const filterTabs: { label: FilterType; countKey?: keyof Record<ProjectStatus, number> }[] = [
  { label: "All Projects" },
  { label: "Active", countKey: "Active" },
  { label: "Completed", countKey: "Completed" },
  { label: "On Hold", countKey: "On Hold" },
  { label: "Planning", countKey: "Planning" },
];


export default function AllProjectsPage() {
  const [projects, setProjects] = useState<ProjectWithDynamicCounts[]>([]);
  const [isLoadingInitialProjects, setIsLoadingInitialProjects] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>("All Projects");
  const { toast } = useToast();

  const fetchProjectDynamicCounts = useCallback(async (projectId: string) => {
    try {
      const [jobs, candidates, interviews] = await Promise.all([
        countJobsForProject(projectId),
        countCandidatesForProject(projectId),
        countInterviewsForProject(projectId),
      ]);
      return { dynamicJobsCount: jobs, dynamicCandidatesCount: candidates, dynamicInterviewsCount: interviews };
    } catch (error) {
      console.error(`Failed to fetch dynamic counts for project ${projectId}:`, error);
      toast({ variant: "destructive", title: "Count Error", description: `Could not load counts for project ID ${projectId.substring(0,8)}...` });
      return { dynamicJobsCount: undefined, dynamicCandidatesCount: undefined, dynamicInterviewsCount: undefined }; // Return undefined on error
    }
  }, [toast]);

  const fetchProjects = useCallback(async () => {
    setIsLoadingInitialProjects(true);
    setProjects([]); // Clear projects before fetching
    try {
      const baseProjects = await getProjectsFromDB();
      const projectsWithLoadingState = baseProjects.map(p => ({ ...p, dynamicCountsLoading: true }));
      setProjects(projectsWithLoadingState);
      setIsLoadingInitialProjects(false); // Initial load done

      // Sequentially fetch dynamic counts to avoid overwhelming the DB/network for many projects
      // A more advanced solution might use a queue or Promise.all with concurrency control
      for (const project of baseProjects) {
        if (project.id) { // Ensure project.id is valid
          const counts = await fetchProjectDynamicCounts(project.id);
          setProjects(prevProjects =>
            prevProjects.map(p =>
              p.id === project.id ? { ...p, ...counts, dynamicCountsLoading: false } : p
            )
          );
        }
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error);
      toast({ variant: "destructive", title: "Error Loading Projects", description: "Could not load projects. Please check server logs and database connection." });
      setIsLoadingInitialProjects(false);
    }
  }, [toast, fetchProjectDynamicCounts]);


  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleSaveProject = async (newProjectData: ProjectFormData, id?: string) => {
    // For simplicity, after saving, we refetch all projects to get updated data including counts.
    // More optimized: update the specific project in state and then refetch its dynamic counts.
    setIsLoadingInitialProjects(true); // Use this as a general loading indicator during save
    try {
      const savedProject = await saveProjectToDB(newProjectData, id);
      if (savedProject) {
        toast({ title: "Success", description: `Project ${id ? 'updated' : 'created'} successfully.` });
        fetchProjects(); // This will refetch all projects and their dynamic counts
      } else {
        throw new Error("Save operation failed. The database did not return the saved project.");
      }
    } catch (error: any) {
      console.error("Failed to save project (client-side catch):", error);
      toast({
        variant: "destructive",
        title: "Error Saving Project",
        description: `Could not save project. ${error.message || "Please check server logs for more details, especially [DB] logs."}`,
        duration: 7000,
      });
      setIsLoadingInitialProjects(false); // Ensure loading state is reset on error
    }
  };

  const handleDeleteProject = async (projectId: string) => {
     setIsLoadingInitialProjects(true); // Use this as a general loading indicator
     try {
      const success = await deleteProjectFromDB(projectId);
      if (success) {
        toast({ title: "Project Deleted", description: "The project has been removed." });
        fetchProjects(); // Refetch all
      } else {
        throw new Error("Delete operation failed. The database reported an issue.");
      }
    } catch (error: any) {
      console.error("Failed to delete project (client-side catch):", error);
      toast({
        variant: "destructive",
        title: "Error Deleting Project",
        description: `Could not delete project. ${error.message || "Please check server logs for more details."}`,
        duration: 7000,
      });
      setIsLoadingInitialProjects(false);
    }
  };

  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            project.manager.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesFilter = activeFilter === "All Projects" || project.status === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [projects, searchTerm, activeFilter]);

  const projectCountsByStatus = useMemo(() => {
    const counts: Record<ProjectStatus, number> & { "All Projects": number } = {
      "Active": 0,
      "Planning": 0,
      "Completed": 0,
      "On Hold": 0,
      "All Projects": projects.length, // Total number of projects loaded, not sum of dynamic counts
    };
    projects.forEach(p => {
      counts[p.status]++;
    });
    return counts;
  }, [projects]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <header className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="relative w-full md:max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                type="search"
                placeholder="Search projects..."
                className="pl-8 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <AddProjectDialog
                onSaveProject={handleSaveProject}
                customTrigger={
                    <Button className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-md">
                        <PlusCircle className="mr-2 h-4 w-4" /> New Project
                    </Button>
                }
            />
        </header>

        <div className="flex flex-wrap gap-2 items-center">
            {filterTabs.map(tab => (
                <Button
                    key={tab.label}
                    variant={activeFilter === tab.label ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveFilter(tab.label)}
                    className={`font-normal ${activeFilter === tab.label ? 'bg-primary text-primary-foreground shadow-sm' : ''}`}
                >
                    {tab.label}
                    <span className="ml-1.5 rounded-full bg-muted-foreground/20 px-1.5 py-0.5 text-xs">
                        {tab.countKey ? projectCountsByStatus[tab.countKey] : projectCountsByStatus["All Projects"]}
                    </span>
                </Button>
            ))}
             <Button variant="outline" size="icon" className="h-9 w-9 ml-auto hidden md:flex">
                <FilterIcon className="h-4 w-4"/>
                <span className="sr-only">Filters</span>
            </Button>
        </div>


        {isLoadingInitialProjects && filteredProjects.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-64 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground">Loading projects...</p>
          </div>
        ) : !isLoadingInitialProjects && filteredProjects.length === 0 ? (
           <div className="text-center py-16">
            <FolderOpen className="mx-auto h-16 w-16 text-muted-foreground mb-6 opacity-70" />
            <h3 className="text-2xl font-semibold mb-2">No Projects Yet</h3>
            <p className="text-muted-foreground mb-6">Start by creating a new project to manage your recruitment efforts.</p>
             <AddProjectDialog
                onSaveProject={handleSaveProject}
                customTrigger={
                    <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md">
                        <PlusCircle className="mr-2 h-5 w-5" /> Create Your First Project
                    </Button>
                }
            />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project} // Pass the project with dynamic count fields and loading state
                onEditProject={(editedProject) => {
                    const formData: ProjectFormData = {
                        name: editedProject.name,
                        manager: editedProject.manager,
                        status: editedProject.status,
                        startDate: editedProject.startDate,
                        endDate: editedProject.endDate,
                        description: editedProject.description,
                        // These base counts are now less relevant on the card, but form needs them
                        jobsCount: editedProject.jobsCount, 
                        candidatesInPipeline: editedProject.candidatesInPipeline,
                        interviewsCount: editedProject.interviewsCount,
                        progress: editedProject.progress,
                    };
                    handleSaveProject(formData, editedProject.id);
                }}
                onDeleteProject={handleDeleteProject}
              />
            ))}
          </div>
        )}
         <Card className="mt-8 shadow-md">
          <CardHeader>
            <CardTitle>Future Enhancements</CardTitle>
            <CardDescription>Features planned for project management.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Detailed project dashboards with timelines and KPIs.</li>
              <li>Task management and collaboration within projects.</li>
              <li>Budget tracking and resource allocation for projects.</li>
              <li>Customizable project templates.</li>
              <li>Dynamic calculation of Jobs, Candidates, and Interviews count per project.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
