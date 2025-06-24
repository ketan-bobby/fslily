
"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link2 as LinkIcon, Copy, Trash2, ExternalLink, CalendarDays, Loader2 } from "lucide-react";
import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { GenerateLinkDialog, type InterviewLinkFormData } from '@/components/interview-links/GenerateLinkDialog';
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
import type { InterviewLink } from '@/lib/types';
// No longer need direct DB access for this local-first approach
// import { getInterviewLinksFromDB, saveInterviewLinkToDB, deleteInterviewLinkFromDB } from '@/lib/db';
import { format } from 'date-fns';

export default function InterviewLinksPage() {
  const [links, setLinks] = useState<InterviewLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchLinks = useCallback(() => {
    setIsLoading(true);
    try {
      const storedLinks = localStorage.getItem('local_links');
      if (storedLinks) {
        setLinks(JSON.parse(storedLinks));
      } else {
        setLinks([]);
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not load interview links from local storage." });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const handleCopyLink = (url: string) => {
    // Make URL absolute for clipboard
    const absoluteUrl = new URL(url, window.location.origin).href;
    navigator.clipboard.writeText(absoluteUrl);
    toast({ title: "Link Copied!", description: "The interview link has been copied to your clipboard." });
  };

  const handleSaveLink = async (newLinkData: InterviewLinkFormData, id?: string) => {
    setIsLoading(true);
    try {
      let updatedLinks: InterviewLink[];
      if (id) {
        updatedLinks = links.map(l => l.id === id ? { ...l, ...newLinkData, id, createdAt: l.createdAt, updatedAt: new Date().toISOString() } : l);
      } else {
        const newLink: InterviewLink = {
          ...newLinkData,
          id: `link-${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        updatedLinks = [...links, newLink];
      }
      localStorage.setItem('local_links', JSON.stringify(updatedLinks));
      setLinks(updatedLinks);
      toast({ title: "Success", description: `Interview link ${id ? 'updated' : 'generated'} successfully.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: `Could not ${id ? 'update' : 'generate'} link.` });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    setIsLoading(true);
    try {
      const updatedLinks = links.filter(l => l.id !== linkId);
      localStorage.setItem('local_links', JSON.stringify(updatedLinks));
      setLinks(updatedLinks);
      toast({ title: "Link Deleted", description: "The interview link has been removed." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not delete link." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <header className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline">Interview Links</h1>
            <p className="text-muted-foreground">Manage and generate shareable links for interviews, assessments, and feedback.</p>
          </div>
          <GenerateLinkDialog onSaveLink={handleSaveLink} />
        </header>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Active Interview Links</CardTitle>
            <CardDescription>Overview of all generated links. Expired links will be hidden or marked. Data is stored locally.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Job Title</TableHead>
                        <TableHead>Candidate</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && links.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center"><Loader2 className="inline mr-2 h-4 w-4 animate-spin" />Loading links...</TableCell></TableRow>
                        ) : links.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No interview links generated yet.</TableCell></TableRow>
                        ) : links.map((link) => (
                        <TableRow key={link.id} className={link.expiresAt && new Date(link.expiresAt) < new Date() ? "opacity-50" : ""}>
                            <TableCell className="font-medium">{link.jobTitle}</TableCell>
                            <TableCell>{link.candidateName || "Generic Link"}</TableCell>
                            <TableCell><span className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded-full">{link.type}</span></TableCell>
                            <TableCell>{format(new Date(link.createdAt), "MMM d, yyyy")}</TableCell>
                            <TableCell>{link.expiresAt ? format(new Date(link.expiresAt), "MMM d, yyyy") : "Never"}</TableCell>
                            <TableCell className="text-right space-x-1">
                                <GenerateLinkDialog link={link} onSaveLink={handleSaveLink} />
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopyLink(link.linkUrl)}>
                                    <Copy className="h-4 w-4" />
                                    <span className="sr-only">Copy Link</span>
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                    <a href={link.linkUrl} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-4 w-4" />
                                        <span className="sr-only">Open Link</span>
                                    </a>
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" disabled={isLoading}>
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">Delete Link</span>
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete the link for {link.jobTitle} ({link.candidateName || 'Generic'}).
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteLink(link.id)} disabled={isLoading}>
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

        <Card>
          <CardHeader>
            <CardTitle>Link Management Features (Planned)</CardTitle>
            <CardDescription>Enhancements for a more robust link system.</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-muted/30 rounded-md">
              <h4 className="font-semibold flex items-center gap-1"><CalendarDays className="h-4 w-4 text-primary"/>Integration with Interview Scheduling</h4>
              <p className="text-xs text-muted-foreground">Automatically generate links when an interview is scheduled in the Interview System.</p>
            </div>
            <div className="p-3 bg-muted/30 rounded-md">
              <h4 className="font-semibold">Customizable Expiry Dates</h4>
              <p className="text-xs text-muted-foreground">Set specific expiration times for sensitive links.</p>
            </div>
            <div className="p-3 bg-muted/30 rounded-md">
              <h4 className="font-semibold">Link Tracking & Analytics</h4>
              <p className="text-xs text-muted-foreground">See if and when a link was accessed (for assessments, etc.).</p>
            </div>
            <div className="p-3 bg-muted/30 rounded-md">
              <h4 className="font-semibold">Branded Link Pages</h4>
              <p className="text-xs text-muted-foreground">Option for candidates to land on a company-branded page before joining a call or assessment.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
