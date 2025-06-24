
"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Share2, UploadCloud, DownloadCloud, Settings2 } from "lucide-react";
import React, { useState } from 'react';
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
} from "@/components/ui/alert-dialog";

type AtsAction = "ATS Import" | "ATS Export" | "Manage Integrations";

export default function AtsIntegrationPage() {
  const { toast } = useToast();
  const [currentAction, setCurrentAction] = useState<AtsAction | null>(null);
  const [isActionAlertOpen, setIsActionAlertOpen] = useState(false);

  const handleTriggerAction = (actionName: AtsAction) => {
    setCurrentAction(actionName);
    setIsActionAlertOpen(true);
  };

  const handleConfirmAction = () => {
    if (currentAction) {
      toast({
        title: "Configuration Panel Opened",
        description: `The configuration panel for "${currentAction}" would open here. Actual integration requires backend setup.`,
      });
    }
    setIsActionAlertOpen(false);
    setCurrentAction(null);
  };

  return (
    <AppLayout>
      <AlertDialog open={isActionAlertOpen} onOpenChange={setIsActionAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Configure: {currentAction}</AlertDialogTitle>
            <AlertDialogDescription>
              This will open the configuration settings for "{currentAction}".
              Full integration functionality requires backend setup. Do you want to proceed to the configuration panel?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCurrentAction(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction}>Open Configuration</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight font-headline">ATS Integration</h1>
          <p className="text-muted-foreground">Connect IntelliAssistant with your existing Applicant Tracking System.</p>
        </header>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Share2 className="h-6 w-6 text-primary"/>Seamless Data Flow</CardTitle>
            <CardDescription>
              Integrate IntelliAssistant with popular ATS platforms to ensure your hiring data is always synchronized and up-to-date. 
              This helps streamline your workflow by eliminating manual data entry and reducing errors.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Key Benefits</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Automatically export hired candidate data to your ATS.</li>
                <li>Import candidate profiles from your ATS for AI-powered screening.</li>
                <li>Keep candidate statuses synchronized across systems.</li>
                <li>Reduce administrative overhead and improve data accuracy.</li>
              </ul>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                <Card className="bg-muted/30 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2"><UploadCloud className="h-5 w-5"/>Import from ATS</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">Easily import candidate data from your existing ATS for advanced analysis and screening within IntelliAssistant.</p>
                        <Button variant="outline" onClick={() => handleTriggerAction('ATS Import')}>Configure Import</Button>
                    </CardContent>
                </Card>
                <Card className="bg-muted/30 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2"><DownloadCloud className="h-5 w-5"/>Export to ATS</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">After a candidate is hired, seamlessly export their profile and relevant data back to your main ATS.</p>
                        <Button variant="outline" onClick={() => handleTriggerAction('ATS Export')}>Configure Export</Button>
                    </CardContent>
                </Card>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><Settings2 className="h-5 w-5"/>Configuration</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Direct integration features are under development. Click "Manage Integrations" to see available options.
                We are working on native integrations with leading ATS providers.
              </p>
              <Button onClick={() => handleTriggerAction('Manage Integrations')}>Manage Integrations</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
