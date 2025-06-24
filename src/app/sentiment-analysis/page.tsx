
"use client";

import React, { useState, useCallback } from 'react';
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { analyzeCandidateSentiment, AnalyzeCandidateSentimentOutput } from '@/ai/flows/analyze-candidate-sentiment';
import { Loader2, MessageSquare, Smile, Meh, Frown, CheckCircle, AlertTriangle } from "lucide-react";
import { ScrollArea } from '@/components/ui/scroll-area';

// Helper to determine sentiment icon and color based on keywords
const getSentimentVisuals = (summary: string): { icon: React.ElementType, color: string, label: string } => {
  const lowerSummary = summary.toLowerCase();
  if (lowerSummary.includes("positive") || lowerSummary.includes("enthusiastic") || lowerSummary.includes("good") || lowerSummary.includes("excited")) {
    return { icon: Smile, color: "text-green-500", label: "Positive" };
  }
  if (lowerSummary.includes("negative") || lowerSummary.includes("concerned") || lowerSummary.includes("bad") || lowerSummary.includes("disappointed")) {
    return { icon: Frown, color: "text-red-500", label: "Negative" };
  }
  return { icon: Meh, color: "text-yellow-500", label: "Neutral" };
};


export default function SentimentAnalysisPage() {
  const [emailText, setEmailText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sentimentSummary, setSentimentSummary] = useState('');
  const { toast } = useToast();

  const handleSubmit = useCallback(async () => {
    if (!emailText.trim()) {
      toast({
        variant: "destructive",
        title: "No text provided",
        description: "Please paste email communications to analyze.",
      });
      return;
    }

    setIsLoading(true);
    setSentimentSummary('');

    try {
      const result: AnalyzeCandidateSentimentOutput = await analyzeCandidateSentiment({ emailCommunications: emailText });
      setSentimentSummary(result.sentimentSummary);
      toast({
        title: "Analysis Complete",
        description: "Sentiment analysis successful.",
        action: <CheckCircle className="text-green-500" />,
      });
    } catch (error: any) {
      console.error("Error analyzing sentiment:", error);
      toast({
        variant: "destructive",
        title: "Analysis Failed",
        description: error.message || "An unexpected error occurred during sentiment analysis.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [emailText, toast]);

  const sentimentVisuals = sentimentSummary ? getSentimentVisuals(sentimentSummary) : null;


  return (
    <AppLayout>
      <div className="space-y-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Candidate Sentiment Analysis</h1>
          <p className="text-muted-foreground">Analyze the tone of email communications to gauge candidate engagement.</p>
        </header>

        <Card className="max-w-2xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MessageSquare className="h-6 w-6 text-primary"/>Email Communications</CardTitle>
            <CardDescription>Paste the candidate's email text below for sentiment analysis.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid w-full gap-1.5">
              <Label htmlFor="email-text">Email Text</Label>
              <Textarea 
                id="email-text" 
                placeholder="Paste email content here..." 
                rows={10}
                value={emailText}
                onChange={(e) => setEmailText(e.target.value)}
                disabled={isLoading}
                className="resize-y min-h-[150px]"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleSubmit} disabled={isLoading || !emailText.trim()} className="w-full">
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              Analyze Sentiment
            </Button>
          </CardFooter>
        </Card>

        {sentimentSummary && (
          <Card className="shadow-lg">
            <CardHeader>
               <CardTitle className="flex items-center gap-2">
                {sentimentVisuals && <sentimentVisuals.icon className={`h-6 w-6 ${sentimentVisuals.color}`} />}
                Sentiment Summary
              </CardTitle>
              {sentimentVisuals && (
                 <CardDescription>
                  Overall sentiment detected: <span className={`font-semibold ${sentimentVisuals.color}`}>{sentimentVisuals.label}</span>
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-40 rounded-md border p-3 bg-muted/30">
                <p className="text-sm text-foreground whitespace-pre-wrap">{sentimentSummary}</p>
              </ScrollArea>
            </CardContent>
             <CardFooter>
                <p className="text-xs text-muted-foreground">
                    <AlertTriangle className="inline-block h-3 w-3 mr-1" />
                    AI-generated sentiment is an estimation and may require human judgment.
                </p>
            </CardFooter>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
