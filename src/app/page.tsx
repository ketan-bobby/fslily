
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { 
  Briefcase, Users, CalendarCheck2, FileText, Settings, BarChart2, 
  PlusCircle, Eye, Sparkles, HelpCircle, LifeBuoy, Activity, Loader2, AlertCircle
} from "lucide-react";
import { auth, firestore } from '@/lib/firebase'; 
import type { User as FirebaseUser } from 'firebase/auth'; 
import { collection, query, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import type { ActivityLog } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import {
  countOpenJobRequisitions,
  countTotalCandidates,
  countUpcomingScheduledInterviews,
  countCandidatesInScreeningStage,
} from '@/lib/db';
import { useToast } from '@/hooks/use-toast';


interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  isLoading?: boolean;
  actionLink?: string;
  actionText?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon: Icon, description, isLoading, actionLink, actionText }) => (
  <Card className="shadow-md hover:shadow-lg transition-shadow">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-5 w-5 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <div className="h-8 w-20 animate-pulse bg-muted rounded-md"></div>
      ) : (
        <div className="text-2xl font-bold">{value}</div>
      )}
      {description && !isLoading && <p className="text-xs text-muted-foreground">{description}</p>}
      {actionLink && actionText && !isLoading && (
        <Button variant="link" size="sm" className="p-0 h-auto mt-1 text-xs" asChild>
            <Link href={actionLink}>{actionText}</Link>
        </Button>
      )}
    </CardContent>
  </Card>
);

interface QuickActionProps {
  href: string;
  label: string;
  icon: React.ElementType;
}

const QuickAction: React.FC<QuickActionProps> = ({ href, label, icon: Icon }) => (
    <Button variant="outline" className="w-full justify-start text-sm" asChild>
        <Link href={href}>
            <Icon className="mr-2 h-4 w-4 text-primary" />
            {label}
        </Link>
    </Button>
);


export default function AdminDashboardPage() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const { toast } = useToast();

  const [metrics, setMetrics] = useState({
    openJobs: 0,
    totalCandidates: 0,
    upcomingInterviews: 0,
    resumesToScreen: 0, 
  });
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
      setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchAllMetrics = useCallback(async () => {
    setIsLoadingMetrics(true);
    try {
      const results = await Promise.allSettled([
        countOpenJobRequisitions(),
        countTotalCandidates(),
        countUpcomingScheduledInterviews(),
        countCandidatesInScreeningStage(),
      ]);

      const newMetrics = {
        openJobs: results[0].status === 'fulfilled' ? results[0].value : 0,
        totalCandidates: results[1].status === 'fulfilled' ? results[1].value : 0,
        upcomingInterviews: results[2].status === 'fulfilled' ? results[2].value : 0,
        resumesToScreen: results[3].status === 'fulfilled' ? results[3].value : 0,
      };
      setMetrics(newMetrics);

      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const metricName = ['Open Jobs', 'Total Candidates', 'Upcoming Interviews', 'Resumes to Screen'][index];
          console.error(`Failed to load metric: ${metricName}`, result.reason);
          toast({
            variant: "destructive",
            title: `Metric Load Error`,
            description: `Could not load ${metricName.toLowerCase()}. Displaying 0.`,
          });
        }
      });

    } catch (error) {
      console.error("Error fetching one or more metrics:", error);
      toast({
        variant: "destructive",
        title: "Dashboard Error",
        description: "Could not load some key metrics. Please try refreshing.",
      });
    } finally {
      setIsLoadingMetrics(false);
    }
  }, [toast]); // Removed toast from dependency array if it was there inadvertently for fetchAllMetrics

  const fetchActivityLogs = useCallback(async () => {
    setIsLoadingActivity(true);
    try {
      const logsCollectionRef = collection(firestore, 'activityLogs');
      const q = query(logsCollectionRef, orderBy('timestamp', 'desc'), limit(5));
      const querySnapshot = await getDocs(q);
      const logs: ActivityLog[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        logs.push({ 
          id: doc.id, 
          ...data,
          timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(data.timestamp) 
        } as ActivityLog);
      });
      setActivityLogs(logs);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
    } finally {
      setIsLoadingActivity(false);
    }
  }, []); // Empty dependency array means this runs once on mount

  useEffect(() => {
    fetchAllMetrics();
    fetchActivityLogs();
  }, [fetchAllMetrics, fetchActivityLogs]);


  const userName = currentUser?.displayName || currentUser?.email?.split('@')[0] || "Admin";

  return (
    <AppLayout>
      <div className="space-y-8">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight font-headline text-foreground">
            Welcome back, {isLoadingAuth ? "..." : userName}!
          </h1>
          <p className="text-lg text-muted-foreground mt-1">
            Here&apos;s what&apos;s happening with your recruitment efforts today.
          </p>
        </header>

        <section>
          <h2 className="text-xl font-semibold mb-4">Key Metrics</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard 
                title="Open Job Requisitions" 
                value={metrics.openJobs} 
                icon={Briefcase} 
                description="Actively hiring roles"
                isLoading={isLoadingMetrics}
                actionLink="/job-requisitions"
                actionText="View Jobs"
            />
            <MetricCard 
                title="Total Candidates" 
                value={metrics.totalCandidates} 
                icon={Users} 
                description="In your talent pool"
                isLoading={isLoadingMetrics}
                actionLink="/candidate-pipeline"
                actionText="View Candidates"
            />
            <MetricCard 
                title="Upcoming Interviews" 
                value={metrics.upcomingInterviews} 
                icon={CalendarCheck2} 
                description="Scheduled this week"
                isLoading={isLoadingMetrics}
                actionLink="/interview-system"
                actionText="View Calendar"
            />
            <MetricCard 
                title="Resumes to Screen" 
                value={metrics.resumesToScreen} 
                icon={Sparkles} 
                description="Pending AI review"
                isLoading={isLoadingMetrics}
                actionLink="/resume-screening"
                actionText="Screen Resumes"
            />
          </div>
        </section>

        <div className="grid md:grid-cols-3 gap-6">
            <section className="md:col-span-2">
                <Card className="shadow-md h-full">
                    <CardHeader>
                        <CardTitle className="text-xl">Quick Actions</CardTitle>
                        <CardDescription>Get started with common tasks.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <QuickAction href="/job-requisitions" label="Create New Job" icon={PlusCircle}/>
                        <QuickAction href="/candidate-pipeline" label="Add Candidate Manually" icon={Users}/>
                        <QuickAction href="/resume-screening" label="Screen a Resume" icon={FileText}/>
                        <QuickAction href="/interview-system" label="Schedule Interview" icon={CalendarCheck2}/>
                        <QuickAction href="/all-projects" label="View All Projects" icon={Eye}/>
                        <QuickAction href="/company-analytics" label="View Analytics" icon={BarChart2}/>
                    </CardContent>
                </Card>
            </section>
            
            <section className="md:col-span-1">
                 <Card className="shadow-md h-full">
                    <CardHeader>
                        <CardTitle className="text-xl">System & Help</CardTitle>
                         <CardDescription>Access configuration and support.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <QuickAction href="/system-settings" label="System Settings" icon={Settings}/>
                        <QuickAction href="/help" label="Help & Documentation" icon={HelpCircle}/>
                        <QuickAction href="/admin-support" label="Contact Support" icon={LifeBuoy}/>
                    </CardContent>
                </Card>
            </section>
        </div>
        
        <section>
            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle className="text-xl">Recent Activity</CardTitle>
                     <CardDescription>Latest updates and actions in the system.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingActivity ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            <p className="ml-2 text-muted-foreground">Loading activity...</p>
                        </div>
                    ) : activityLogs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                           <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
                           <p className="text-muted-foreground">No recent activity to display.</p>
                           <p className="text-xs text-muted-foreground mt-1">As actions are performed in the app, they will appear here.</p>
                        </div>
                    ) : (
                        <ul className="space-y-3">
                            {activityLogs.map(log => (
                                <li key={log.id} className="flex items-start gap-3 p-3 border-b last:border-b-0 hover:bg-muted/30 rounded-md">
                                    <Activity className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm text-foreground">{log.description}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                                            {log.user && ` by ${log.user}`}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>
        </section>

      </div>
    </AppLayout>
  );
}
