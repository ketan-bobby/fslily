
"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Handshake, Trash2, Briefcase, Users, Building, BarChart2, Loader2 } from "lucide-react";
import React, { useState, useEffect, useCallback } from 'react';
import { ClientFormDialog, type ClientFormData } from '@/components/client-management/ClientFormDialog';
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
import { useToast } from "@/hooks/use-toast";
import type { Client } from '@/lib/types';
import { getClientsFromDB, saveClientToDB, deleteClientFromDB } from '@/lib/db';

export default function ClientManagementPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchClients = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getClientsFromDB();
      setClients(data);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not load clients." });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase();

  const handleSaveClient = async (data: ClientFormData, id?: string) => {
    setIsLoading(true);
    try {
      const savedClient = await saveClientToDB(data, id);
      if (savedClient) {
        toast({ title: "Success", description: `Client ${id ? 'updated' : 'added'} successfully.` });
        fetchClients();
      } else {
        throw new Error("Save operation failed.");
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: `Could not ${id ? 'update' : 'add'} client.` });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeleteClient = async (clientId: string) => {
    setIsLoading(true);
    try {
      const success = await deleteClientFromDB(clientId);
      if (success) {
        toast({ title: "Client Deleted", description: "The client has been removed." });
        fetchClients();
      } else {
        throw new Error("Delete operation failed.");
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not delete client." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <header className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline">Client Management</h1>
            <p className="text-muted-foreground">Manage your recruitment agency's clients and their hiring needs.</p>
          </div>
          <ClientFormDialog onSave={handleSaveClient} />
        </header>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Client Overview</CardTitle>
             <CardDescription>List of all active and past clients. This feature is typically for recruitment agencies.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead className="w-[80px]">Logo</TableHead>
                        <TableHead>Company Name</TableHead>
                        <TableHead>Contact Person</TableHead>
                        <TableHead>Active Reqs.</TableHead>
                        <TableHead>Total Hires</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && clients.length === 0 ? (
                             <TableRow><TableCell colSpan={6} className="text-center"><Loader2 className="inline mr-2 h-4 w-4 animate-spin" />Loading clients...</TableCell></TableRow>
                        ) : clients.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No clients added yet.</TableCell></TableRow>
                        ) : clients.map((client) => (
                        <TableRow key={client.id} className="hover:bg-muted/50">
                            <TableCell>
                                <Avatar className="h-10 w-10 border">
                                    <AvatarImage src={client.logoUrl || `https://placehold.co/100x100.png?text=${getInitials(client.companyName)}`} alt={client.companyName} data-ai-hint="company logo"/>
                                    <AvatarFallback>{getInitials(client.companyName)}</AvatarFallback>
                                </Avatar>
                            </TableCell>
                            <TableCell className="font-medium">{client.companyName}</TableCell>
                            <TableCell>
                                <div>{client.contactPerson}</div>
                                <div className="text-xs text-muted-foreground">{client.email}</div>
                            </TableCell>
                            <TableCell className="text-center">{client.activeRequisitions}</TableCell>
                            <TableCell className="text-center">{client.totalHires}</TableCell>
                            <TableCell className="text-right space-x-1">
                               <ClientFormDialog client={client} onSave={handleSaveClient} />
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" disabled={isLoading}>
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">Delete Client</span>
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete the client "{client.companyName}".
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteClient(client.id)} disabled={isLoading}>
                                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                            </TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Key Features for Client Management (Planned)</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="space-y-1 p-3 bg-muted/30 rounded-md shadow-sm">
              <h4 className="font-semibold flex items-center gap-1"><Building className="h-4 w-4 text-primary"/>Client Portal Access</h4>
              <p className="text-xs text-muted-foreground">Allow clients to log in and view progress on their requisitions.</p>
            </div>
            <div className="space-y-1 p-3 bg-muted/30 rounded-md shadow-sm">
              <h4 className="font-semibold flex items-center gap-1"><Briefcase className="h-4 w-4 text-primary"/>Requisition Management per Client</h4>
              <p className="text-xs text-muted-foreground">Track job openings specific to each client account.</p>
            </div>
             <div className="space-y-1 p-3 bg-muted/30 rounded-md shadow-sm">
              <h4 className="font-semibold flex items-center gap-1"><Users className="h-4 w-4 text-primary"/>Candidate Submissions</h4>
              <p className="text-xs text-muted-foreground">Share candidate profiles with clients and track feedback.</p>
            </div>
             <div className="space-y-1 p-3 bg-muted/30 rounded-md shadow-sm">
              <h4 className="font-semibold flex items-center gap-1"><BarChart2 className="h-4 w-4 text-primary"/>Client-Specific Reporting</h4>
              <p className="text-xs text-muted-foreground">Generate reports on hiring activity and KPIs for each client.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
