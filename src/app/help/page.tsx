
"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { HelpCircle, Search, BookOpen, MessageCircle, AlertTriangle } from "lucide-react";
import React from 'react';
import Link from "next/link";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";

const faqs = [
  {
    question: "How do I add a new job requisition?",
    answer: "Navigate to 'Job Management' (or 'Job Requisitions') from the sidebar. Click on the 'Create Requisition' button and fill in the required details like job title, department, description, and skills. Save the requisition to make it active or keep it as a draft."
  },
  {
    question: "Can I customize the candidate pipeline stages?",
    answer: "Currently, the candidate pipeline stages (Sourced, Screening, Interview, Offer, Hired, Rejected) are predefined. Customization of these stages is a feature planned for future releases. You can manage candidates by dragging them between the existing columns."
  },
  {
    question: "How does the AI Resume Screening work?",
    answer: "Go to the 'Resume Screening' page, upload a resume file (PDF, DOC, DOCX, TXT). The system uses AI to parse the resume, extract key skills, and provide a summary. This helps in quickly assessing a candidate's fit for a role."
  },
  {
    question: "What if I encounter an error or need technical assistance?",
    answer: "If you encounter any issues, first check this Help section or the Knowledge Base. If you can't find a solution, please use the 'Contact Support Team' form on the 'Admin Support' page to submit a ticket. Provide as much detail as possible about the error."
  },
  {
    question: "How can I change my account password or email?",
    answer: "User profile settings, including password and email changes, can typically be found by clicking on your user avatar in the top-right corner, then selecting 'Settings'. If this option is not available, please contact an administrator for assistance."
  }
];

const IconWrapper: React.FC<{icon: React.ElementType, className?: string}> = ({icon: Icon, className}) => (
    <div className={`p-3 rounded-full bg-primary/10 ${className}`}>
        <Icon className="h-6 w-6 text-primary"/>
    </div>
);


export default function HelpPage() {
  const { toast } = useToast();

  const handlePopularTopicClick = (topic: string) => {
    toast({
        title: "Knowledge Base Topic",
        description: `Displaying article for: ${topic}. The full knowledge base is currently under development.`,
    });
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <Card className="shadow-xl overflow-hidden bg-gradient-to-br from-primary/5 via-background to-background">
            <div className="grid md:grid-cols-2 items-center">
                <div className="p-8 md:p-10 space-y-3">
                    <HelpCircle className="h-16 w-16 text-primary mb-3"/>
                    <h1 className="text-4xl font-bold tracking-tight font-headline text-primary">Help & Support Center</h1>
                    <p className="text-lg text-muted-foreground">
                        Your central hub for assistance with IntelliAssistant. Find FAQs, search articles, or contact our support team.
                    </p>
                </div>
                <div className="hidden md:flex justify-end p-6 pr-0">
                   <Image 
                        src="https://placehold.co/500x300.png" 
                        alt="Support illustration" 
                        width={500} 
                        height={300} 
                        className="rounded-l-lg object-cover"
                        data-ai-hint="customer support helpdesk"
                    />
                </div>
            </div>
        </Card>

        <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center gap-4">
                <IconWrapper icon={Search}/>
                <div>
                    <CardTitle className="text-xl">Search Help Articles</CardTitle>
                    <CardDescription>Quickly find information by searching our knowledge base. (Search functionality is UI only for now)</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                 <Input type="search" placeholder="Type your question or keywords... (e.g., 'how to add user')" className="py-3 text-base" />
            </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center gap-4">
            <IconWrapper icon={BookOpen}/>
            <div>
                <CardTitle className="text-xl">Frequently Asked Questions (FAQs)</CardTitle>
                <CardDescription>Common questions and answers about using IntelliAssistant.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem value={`item-${index}`} key={index}>
                  <AccordionTrigger className="text-left hover:no-underline text-md py-5">{faq.question}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base pb-5">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center gap-4">
                <IconWrapper icon={MessageCircle}/>
                <div>
                    <CardTitle className="text-xl">Contact Support</CardTitle>
                    <CardDescription>Still need help? Reach out to our support team.</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                <p className="text-base text-muted-foreground">
                    If you couldn't find an answer in our FAQs or knowledge base, our support team is ready to assist you.
                    Please navigate to the <Link href="/admin-support" className="text-primary hover:underline font-medium">'Admin Support'</Link> page to submit a detailed support ticket.
                </p>
                <Button asChild variant="default" size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md">
                    <Link href="/admin-support">Go to Admin Support</Link>
                </Button>
            </CardContent>
        </Card>
        
        <Card className="border-yellow-500 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900/30 shadow-md">
            <CardHeader className="flex flex-row items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-yellow-600 dark:text-yellow-400"/>
                <CardTitle className="text-lg text-yellow-700 dark:text-yellow-400">Important Notes</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                <p>Features with "(Acknowledged)" or similar in toasts or dialogs provide UI interaction but their full backend functionality is pending further development.</p>
                <p>AI-generated content (like resume summaries or sentiment analysis) should be reviewed for accuracy.</p>
            </CardContent>
        </Card>

      </div>
    </AppLayout>
  );
}
