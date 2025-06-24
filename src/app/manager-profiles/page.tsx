
"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserCog, Briefcase, Users, CheckCircle, Loader2, Trash2 } from "lucide-react";
import React, { useState, useEffect, useCallback } from 'react';
import type { ManagerProfile } from '@/lib/types';
import { ManagerProfileDialog, type ManagerProfileFormData } from '@/components/manager-profiles/ManagerProfileDialog';
import { getManagerProfilesFromDB, saveManagerProfileToDB, deleteManagerProfileFromDB } from '@/lib/db';
import { useToast } from "@/hooks/use-toast";
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

export default function ManagerProfilesPage() {
  const [managers, setManagers] = useState<ManagerProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchManagerProfiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getManagerProfilesFromDB();
      setManagers(data);
    } catch (error) {
      console.error("Failed to fetch manager profiles:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load manager profiles." });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchManagerProfiles();
  }, [fetchManagerProfiles]);

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase();

  const handleSaveManagerProfile = async (data: ManagerProfileFormData, id?: string) => {
    setIsLoading(true);
    try {
      const savedProfile = await saveManagerProfileToDB(data, id);
      if (savedProfile) {
        toast({ title: "Success", description: `Manager profile ${id ? 'updated' : 'added'} successfully.` });
        fetchManagerProfiles();
      } else {
        throw new Error("Save operation failed");
      }
    } catch (error) {
      console.error("Failed to save manager profile:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not save manager profile." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteManagerProfile = async (profileId: string) => {
    setIsLoading(true);
    try {
      const success = await deleteManagerProfileFromDB(profileId);
      if (success) {
        toast({ title: "Manager Profile Deleted", description: "The manager profile has been removed." });
        fetchManagerProfiles();
      } else {
         throw new Error("Delete operation failed");
      }
    } catch (error) {
      console.error("Failed to delete manager profile:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not delete manager profile." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <header className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline">Manager Profiles</h1>
            <p className="text-muted-foreground">View and manage profiles of hiring managers in your organization.</p>
          </div>
          <ManagerProfileDialog onSave={handleSaveManagerProfile} />
        </header>

        {isLoading && managers.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Loading manager profiles...</p>
          </div>
        ) : managers.length === 0 ? (
          <p className="col-span-full text-center text-muted-foreground py-10">No manager profiles found. Add one to get started.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {managers.map((manager) => (
              <Card key={manager.id} className="hover:shadow-lg transition-shadow flex flex-col">
                <CardHeader className="flex flex-row items-center gap-4">
                  <Avatar className="h-16 w-16 border">
                    <AvatarImage src={manager.avatarUrl || `https://placehold.co/100x100.png?text=${getInitials(manager.name)}`} alt={manager.name} data-ai-hint="person portrait"/>
                    <AvatarFallback>{getInitials(manager.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg font-semibold">{manager.name}</CardTitle>
                    <CardDescription>{manager.department} Department</CardDescription>
                    <p className="text-xs text-muted-foreground">{manager.email}</p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm flex-grow">
                  <div className="flex items-center gap-2 text-muted-foreground">
                      <Briefcase className="h-4 w-4"/> 
                      <span>{manager.activeRequisitions} active requisitions</span>
                  </div>
                   <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4"/> 
                      <span>Manages a team of {manager.teamSize}</span>
                  </div>
                  {manager.hiringSince && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle className="h-4 w-4"/> 
                        <span>Hiring since {new Date(manager.hiringSince).toLocaleDateString()}</span>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="pt-2 flex gap-2">
                  <ManagerProfileDialog manager={manager} onSave={handleSaveManagerProfile} />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="icon" className="text-destructive hover:text-destructive h-9 w-9">
                          <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete manager profile for "{manager.name}".
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteManagerProfile(manager.id)} disabled={isLoading}>
                           {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                           Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Purpose of Manager Profiles</CardTitle>
            <CardDescription>Understanding hiring manager preferences and history can streamline recruitment.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Track hiring activity and success rates per manager.</li>
              <li>Store manager-specific preferences for candidate profiles (e.g., "prefers candidates with X skill").</li>
              <li>Facilitate communication and feedback loops with hiring managers.</li>
              <li>Provide insights for training or supporting managers in their hiring responsibilities.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
