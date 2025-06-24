
"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LifeBuoy, MessageCircle, BookOpen, Search, Send, FileQuestion, Loader2 } from "lucide-react";
import React, { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { saveSupportTicketToDB } from "@/lib/db";
import type { SupportTicketData } from "@/lib/types";


export default function AdminSupportPage() {
  const { toast } = useToast();
  const [supportSubject, setSupportSubject] = useState('');
  const [supportIssue, setSupportIssue] = useState('');
  const [supportAttachment, setSupportAttachment] = useState<File | null>(null);
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);


  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportIssue.trim()) {
        toast({ variant: "destructive", title: "Issue Description Empty", description: "Please describe your issue before submitting." });
        return;
    }
    setIsSubmittingTicket(true);
    const ticketData: SupportTicketData = {
        subject: supportSubject || "No Subject Provided",
        issueDescription: supportIssue,
        attachmentName: supportAttachment?.name,
        attachmentSize: supportAttachment?.size,
        status: "Open", 
        // user info can be added on backend or if auth is available here
    };
    try {
        const savedTicket = await saveSupportTicketToDB(ticketData);
        if (savedTicket) {
            toast({
                title: "Support Ticket Submitted",
                description: `Your ticket (ID: ${savedTicket.id.substring(0,8)}...) has been logged. We will get back to you soon.`,
            });
            setSupportSubject('');
            setSupportIssue('');
            setSupportAttachment(null);
            const fileInput = document.getElementById('supportAttachment') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
        } else {
            throw new Error("Failed to save ticket to the database.");
        }
    } catch (error) {
        toast({ variant: "destructive", title: "Submission Failed", description: "Could not submit your support ticket. Please try again." });
        console.error("Support ticket submission error:", error);
    } finally {
        setIsSubmittingTicket(false);
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim()) {
      toast({ variant: "destructive", title: "Feedback Empty", description: "Please enter your feedback before submitting." });
      return;
    }
    setIsSubmittingFeedback(true);
    // In a real app, this would send to a backend or Firestore collection like 'feedback'
    // For now, we log it and show a toast
    console.log("Feedback Submitted:", feedbackText);
    // Simulate a short delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast({
      title: "Feedback Submitted",
      description: "Thank you for your feedback! It has been recorded.",
    });
    setFeedbackText('');
    setIsFeedbackDialogOpen(false);
    setIsSubmittingFeedback(false);
  };

  const handlePopularTopicClick = (topic: string) => {
    toast({
        title: "Knowledge Base Topic",
        description: `Displaying article for: ${topic}. Full knowledge base is under development.`,
    });
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Admin Support</h1>
          <p className="text-muted-foreground">Access help resources, documentation, and contact support for IntelliAssistant.</p>
        </header>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BookOpen className="text-primary"/>Knowledge Base & FAQs</CardTitle>
              <CardDescription>Find answers to common questions and learn how to use platform features.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Search documentation... (UI only)" className="pl-8" />
              </div>
              <Button variant="outline" className="w-full" onClick={() => handlePopularTopicClick("Browse All Articles")}>Browse All Articles</Button>
              <div className="space-y-2 text-sm">
                <h4 className="font-semibold">Popular Topics:</h4>
                <ul className="list-disc list-inside text-muted-foreground">
                    <li><button className="text-primary hover:underline text-left" onClick={() => handlePopularTopicClick("Setting up User Roles")}>Setting up User Roles</button></li>
                    <li><button className="text-primary hover:underline text-left" onClick={() => handlePopularTopicClick("Integrating with your ATS")}>Integrating with your ATS</button></li>
                    <li><button className="text-primary hover:underline text-left" onClick={() => handlePopularTopicClick("Troubleshooting AI Screening")}>Troubleshooting AI Screening</button></li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MessageCircle className="text-primary"/>Contact Support Team</CardTitle>
              <CardDescription>Submit a ticket or get in touch with our support specialists.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form className="space-y-3" onSubmit={handleSupportSubmit}>
                <div>
                  <Label htmlFor="supportSubject">Subject</Label>
                  <Input id="supportSubject" placeholder="e.g., Issue with candidate pipeline" value={supportSubject} onChange={(e) => setSupportSubject(e.target.value)} disabled={isSubmittingTicket}/>
                </div>
                <div>
                  <Label htmlFor="supportIssue">Describe your issue</Label>
                  <Textarea id="supportIssue" rows={5} placeholder="Please provide as much detail as possible..." value={supportIssue} onChange={(e) => setSupportIssue(e.target.value)} disabled={isSubmittingTicket} required/>
                </div>
                 <div>
                  <Label htmlFor="supportAttachment">Attach File (Optional)</Label>
                  <Input id="supportAttachment" type="file" onChange={(e) => setSupportAttachment(e.target.files ? e.target.files[0] : null)} disabled={isSubmittingTicket}/>
                   {supportAttachment && <p className="text-xs text-muted-foreground mt-1">Selected: {supportAttachment.name}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={isSubmittingTicket}>
                  {isSubmittingTicket ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4"/>} 
                  {isSubmittingTicket ? "Submitting..." : "Submit Support Ticket"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <Dialog open={isFeedbackDialogOpen} onOpenChange={(open) => {if(!isSubmittingFeedback) setIsFeedbackDialogOpen(open)}}>
          <DialogTrigger asChild>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><FileQuestion className="text-primary"/>Feature Requests & Feedback</CardTitle>
                    <CardDescription>Have an idea to improve IntelliAssistant? Let us know!</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                        We value your input in shaping the future of IntelliAssistant. If you have suggestions for new features,
                        improvements to existing ones, or general feedback, please share it with us.
                    </p>
                    <Button variant="outline">Submit Feedback / Feature Request</Button>
                </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit Feedback / Feature Request</DialogTitle>
              <DialogDescription>
                Your input helps us improve IntelliAssistant. Please provide your feedback or feature idea below.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="feedbackText">Your Feedback</Label>
              <Textarea
                id="feedbackText"
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Type your feedback or feature request here..."
                rows={6}
                disabled={isSubmittingFeedback}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsFeedbackDialogOpen(false)} disabled={isSubmittingFeedback}>Cancel</Button>
              <Button onClick={handleFeedbackSubmit} disabled={isSubmittingFeedback}>
                {isSubmittingFeedback && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Feedback
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </AppLayout>
  );
}
