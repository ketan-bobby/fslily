
"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ShieldCheck, KeyRound, Lock, UserCog, FileText, Eye, Check } from "lucide-react";
import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
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

type SecurityAction = 
  | "Password Policy Configuration"
  | "SSO Setup"
  | "Role Management"
  | "Permission Settings"
  | "Data Retention Policy Setup"
  | "GDPR & Compliance Tools"
  | "Audit Log Viewer"
  | "Security Alert Configuration"
  | "Two-Factor Authentication (2FA) Setup";


export default function SecurityControlsPage() {
  const [mfaRequired, setMfaRequired] = useState(false); 
  const { toast } = useToast();
  const [currentAction, setCurrentAction] = useState<SecurityAction | null>(null);
  const [isActionAlertOpen, setIsActionAlertOpen] = useState(false);

  const handleTriggerAction = (actionName: SecurityAction) => {
    setCurrentAction(actionName);
    setIsActionAlertOpen(true);
  };

  const handleConfirmAction = () => {
    if (currentAction) {
      toast({
        title: "Action Acknowledged",
        description: `The configuration for "${currentAction}" would open here. Full backend implementation is pending.`,
      });
    }
    setIsActionAlertOpen(false);
    setCurrentAction(null);
  };
  
  const handleMfaSwitchChange = (checked: boolean) => {
    setMfaRequired(checked);
    handleTriggerAction("Two-Factor Authentication (2FA) Setup");
  };


  return (
    <AppLayout>
      <AlertDialog open={isActionAlertOpen} onOpenChange={setIsActionAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Configure: {currentAction}</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to open the configuration panel for "{currentAction}".
              Full functionality for this action requires backend implementation. Proceed to acknowledge this action?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {setCurrentAction(null); if(currentAction === "Two-Factor Authentication (2FA) Setup") setMfaRequired(!mfaRequired); /* revert switch on cancel */}}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction}>Open Panel</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Security Controls</h1>
          <p className="text-muted-foreground">Manage and configure security settings for the platform.</p>
        </header>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><KeyRound className="text-primary"/>Authentication</CardTitle>
              <CardDescription>Settings related to user login and access.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-md">
                <div>
                  <Label htmlFor="mfaRequiredSwitch" className="cursor-pointer">Require Two-Factor Authentication (2FA)</Label>
                  <p className="text-xs text-muted-foreground">Enforce 2FA for all users or specific roles.</p>
                </div>
                <Switch id="mfaRequiredSwitch" checked={mfaRequired} onCheckedChange={handleMfaSwitchChange} />
              </div>
              <div className="space-y-1 p-3 border rounded-md">
                <Label htmlFor="passwordPolicy">Password Policy</Label>
                <Button variant="outline" size="sm" onClick={() => handleTriggerAction('Password Policy Configuration')}>Configure Policy</Button>
                <p className="text-xs text-muted-foreground">Set minimum length, complexity, and expiration.</p>
              </div>
              <div className="space-y-1 p-3 border rounded-md">
                <Label htmlFor="sso">Single Sign-On (SSO)</Label>
                <Button variant="outline" size="sm" onClick={() => handleTriggerAction('SSO Setup')}>Setup SSO</Button>
                <p className="text-xs text-muted-foreground">Integrate with SAML/OAuth providers.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><UserCog className="text-primary"/>Access Control</CardTitle>
              <CardDescription>Define user roles and permissions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="p-3 border rounded-md">
                    <Label>Role Management</Label>
                    <p className="text-xs text-muted-foreground mb-2">Define roles like Admin, Recruiter, Hiring Manager.</p>
                    <Button variant="outline" size="sm" onClick={() => handleTriggerAction('Role Management')}>Manage Roles</Button>
                </div>
                <div className="p-3 border rounded-md">
                    <Label>Permission Settings</Label>
                    <p className="text-xs text-muted-foreground mb-2">Assign specific permissions to roles (e.g., view candidates, edit jobs).</p>
                    <Button variant="outline" size="sm" onClick={() => handleTriggerAction('Permission Settings')}>Configure Permissions</Button>
                </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Lock className="text-primary"/>Data Security & Privacy</CardTitle>
            <CardDescription>Controls for data encryption, retention, and compliance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-md">
              <div>
                <Label htmlFor="dataEncryption">Data Encryption at Rest</Label>
                <p className="text-xs text-muted-foreground">Ensures stored data is encrypted (Firebase Firestore default).</p>
              </div>
              <Badge variant="secondary"><Check className="h-3 w-3 mr-1 inline"/>Enabled</Badge>
            </div>
            <div className="space-y-1 p-3 border rounded-md">
                <Label htmlFor="retentionPolicy">Data Retention Policy</Label>
                <Button variant="outline" size="sm" onClick={() => handleTriggerAction('Data Retention Policy Setup')}>Set Policy</Button>
                <p className="text-xs text-muted-foreground">Configure how long candidate data is stored.</p>
            </div>
             <div className="space-y-1 p-3 border rounded-md">
                <Label htmlFor="gdprTools">GDPR & Compliance Tools</Label>
                 <Button variant="outline" size="sm" onClick={() => handleTriggerAction('GDPR & Compliance Tools')}>Access Tools</Button>
                <p className="text-xs text-muted-foreground">Features for data subject requests and consent management.</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Eye className="text-primary"/>Audit & Monitoring</CardTitle>
            <CardDescription>Track system activity and security events.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="p-3 border rounded-md">
                <Label>Access Audit Logs</Label>
                <p className="text-xs text-muted-foreground mb-2">View detailed logs of user actions and system events.</p>
                <Button variant="outline" onClick={() => handleTriggerAction('Audit Log Viewer')}>View Logs</Button>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-md">
                <div>
                    <Label htmlFor="securityAlerts">Security Alerts</Label>
                    <p className="text-xs text-muted-foreground">Configure alerts for suspicious activities.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleTriggerAction('Security Alert Configuration')}>Configure Alerts</Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </AppLayout>
  );
}
