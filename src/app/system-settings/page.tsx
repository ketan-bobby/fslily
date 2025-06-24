
"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, Bell, Palette, ListChecks, Briefcase, Shield, Save, Loader2, Plus, Trash2, MapPin, Check, UploadCloud } from "lucide-react";
import React, { useState, useEffect, useCallback } from 'react';
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { ManagedListItem, GeneralSystemSettings, NotificationSettings, AppearanceSettings, SecuritySettings } from '@/lib/types';
import { COUNTRIES, getCountryByCode } from '@/lib/countries';
import { TIMEZONES } from '@/lib/timezones';
import { Combobox } from '@/components/ui/combobox';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Image from 'next/image';
import { useSystemSettings } from "@/contexts/SystemSettingsContext";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getDepartments, addDepartment, deleteDepartment,
  getLocations, addLocation, deleteLocation,
  getCompanyHiringManagers, addCompanyHiringManager, deleteCompanyHiringManager,
  getGeneralSystemSettings, saveGeneralSystemSettings,
  getNotificationSettings, saveNotificationSettings,
  getAppearanceSettings, saveAppearanceSettings,
  getSecuritySettings, saveSecuritySettings,
} from '@/lib/db';
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

// ManagedListSection Component
interface ManagedListProps {
  title: string;
  itemTypeLabel: string;
  fetchItems: () => Promise<ManagedListItem[]>;
  addItem: (name: string) => Promise<ManagedListItem | null>;
  deleteItem: (id: string) => Promise<boolean>;
}

const ManagedListSection: React.FC<ManagedListProps> = ({ title, itemTypeLabel, fetchItems, addItem, deleteItem }) => {
  const [items, setItems] = useState<ManagedListItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [itemToDelete, setItemToDelete] = useState<{id: string, name: string} | null>(null);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchItems();
      setItems(data);
    } catch (error) {
      toast({ variant: "destructive", title: `Error loading ${itemTypeLabel.toLowerCase()}s`, description: (error as Error).message });
    } finally {
      setIsLoading(false);
    }
  }, [fetchItems, toast, itemTypeLabel]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleAddItem = async () => {
    if (!newItemName.trim()) {
      toast({ variant: "destructive", title: "Validation Error", description: `${itemTypeLabel} name cannot be empty.` });
      return;
    }
    setIsSubmitting(true);
    try {
      const added = await addItem(newItemName.trim());
      if (added) {
        toast({ title: `${itemTypeLabel} Added`, description: `"${added.name}" has been added.` });
        setNewItemName('');
        await loadItems();
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: `Error Adding ${itemTypeLabel}`, description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;
    setIsSubmitting(true);
    try {
      const success = await deleteItem(itemToDelete.id);
      if (success) {
        toast({ title: `${itemTypeLabel} Deleted`, description: `"${itemToDelete.name}" has been removed.` });
        await loadItems();
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: `Error Deleting ${itemTypeLabel}`, description: error.message });
    } finally {
      setIsSubmitting(false);
      setItemToDelete(null);
    }
  };

  return (
    <Card className="shadow-md">
      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the {itemTypeLabel.toLowerCase()} "{itemToDelete?.name}". This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSubmitting} onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteItem} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Add, view, or remove {itemTypeLabel.toLowerCase()}s for selection in forms.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder={`New ${itemTypeLabel.toLowerCase()} name...`}
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            disabled={isSubmitting || isLoading}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddItem();}}
          />
          <Button onClick={handleAddItem} disabled={isSubmitting || isLoading || !newItemName.trim()}>
            {isSubmitting && !isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />} Add
          </Button>
        </div>
        {isLoading ? (
          <div className="text-center text-muted-foreground py-4"><Loader2 className="mr-2 h-4 w-4 animate-spin inline" /> Loading...</div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No {itemTypeLabel.toLowerCase()}s added yet.</p>
        ) : (
          <div className="max-h-60 overflow-y-auto space-y-2 rounded-md border p-3">
            {items.map(item => (
              <div key={item.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                <span className="text-sm">{item.name}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" disabled={isSubmitting} onClick={() => setItemToDelete(item)}>
                    <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};


// Main Page Component
export default function SystemSettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("general");
  const { settings: contextSettings, updateSettings: updateContextSettings } = useSystemSettings();

  // State for all settings tabs
  const [generalSettings, setGeneralSettings] = useState<Omit<GeneralSystemSettings, 'id' | 'updatedAt'>>({
      defaultTimezone: "", autoSaveDrafts: true, availableCountries: []
  });
  const [notificationSettings, setNotificationSettings] = useState<Omit<NotificationSettings, 'id' | 'updatedAt'>>({
      newCandidateEmail: true, interviewReminderApp: true, dailySummaryEmail: false
  });
  const [appearanceSettings, setAppearanceSettings] = useState<Omit<AppearanceSettings, 'id' | 'updatedAt'>>({
      organizationName: "", primaryColor: "#000000", logoUrl: undefined
  });
  const [securitySettings, setSecuritySettings] = useState<Omit<SecuritySettings, 'id' | 'updatedAt'>>({
      sessionTimeoutMinutes: 30
  });

  // Loading and saving states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  
  // Dialog state
  const [isDialogActionOpen, setIsDialogActionOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<{title: string, description: string} | null>(null);

  const loadDataForTab = useCallback(async (tab: string) => {
    setIsLoading(true);
    try {
        if (tab === "general") {
            const settings = await getGeneralSystemSettings();
            setGeneralSettings(settings || { defaultTimezone: "", autoSaveDrafts: true, availableCountries: ['US'] });
        } else if (tab === "notifications") {
            const settings = await getNotificationSettings();
            setNotificationSettings(settings || { newCandidateEmail: true, interviewReminderApp: true, dailySummaryEmail: false });
        } else if (tab === "appearance") {
            const settings = await getAppearanceSettings();
            setAppearanceSettings(settings || { organizationName: "IntelliAssistant Corp.", primaryColor: '#16A34A', logoUrl: '' });
        } else if (tab === "security") {
            const settings = await getSecuritySettings();
            setSecuritySettings(settings || { sessionTimeoutMinutes: 30 });
        }
    } catch(error: any) {
        toast({ variant: "destructive", title: `Error loading ${tab} settings`, description: error.message });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    if (activeTab !== 'recruitment-data' && activeTab !== 'integrations') {
        loadDataForTab(activeTab);
    }
  }, [activeTab, loadDataForTab]);


  // Handlers for General Tab
  const handleCountryAdd = (countryCode: string) => {
    if (countryCode && !generalSettings.availableCountries.includes(countryCode)) {
      setGeneralSettings(prev => ({ ...prev, availableCountries: [...prev.availableCountries, countryCode].sort() }));
    }
  };
  const handleCountryRemove = (countryCodeToRemove: string) => {
    setGeneralSettings(prev => ({ ...prev, availableCountries: prev.availableCountries.filter(c => c !== countryCodeToRemove) }));
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        toast({ variant: 'destructive', title: 'Invalid File Type', description: 'Please select an image file.' });
        return;
    }
    if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({ variant: 'destructive', title: 'File Too Large', description: 'Logo image must be smaller than 2MB.' });
        return;
    }

    setIsUploadingLogo(true);
    const logoRef = ref(storage, `logos/org-logo-${Date.now()}`);

    try {
        const snapshot = await uploadBytes(logoRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        setAppearanceSettings(prev => ({...prev, logoUrl: downloadURL}));
        toast({ title: 'Logo Uploaded', description: 'Your new logo has been uploaded. Save to apply.' });
    } catch (error: any) {
        console.error("Logo upload error:", error);
        toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
    } finally {
        setIsUploadingLogo(false);
    }
  };


  const handleSave = async () => {
    setIsSaving(true);
    try {
        let successMessage = "";
        if (activeTab === 'general') {
            await saveGeneralSystemSettings(generalSettings);
            successMessage = "General settings saved successfully.";
        } else if (activeTab === 'notifications') {
            await saveNotificationSettings(notificationSettings);
            successMessage = "Notification settings saved successfully.";
        } else if (activeTab === 'appearance') {
            await saveAppearanceSettings(appearanceSettings);
            successMessage = "Appearance settings saved successfully.";
            // Update context if org name or logo changed
            if (contextSettings?.organizationName !== appearanceSettings.organizationName || contextSettings?.logoUrl !== appearanceSettings.logoUrl) {
                updateContextSettings({ 
                    organizationName: appearanceSettings.organizationName,
                    logoUrl: appearanceSettings.logoUrl 
                });
            }
        } else if (activeTab === 'security') {
            await saveSecuritySettings(securitySettings);
            successMessage = "Security settings saved successfully.";
        }
        
        toast({ title: "Success", description: successMessage });

    } catch (error: any) {
        toast({ 
            variant: "destructive", 
            title: `Failed to Save ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Settings`, 
            description: error.message
        });
    } finally {
        setIsSaving(false);
    }
  };

  const handleTriggerAction = (title: string, description: string) => {
    setDialogAction({ title, description });
    setIsDialogActionOpen(true);
  };
  const handleConfirmAction = () => {
     if(dialogAction) toast({ title: "Action Acknowledged", description: `Configuration for "${dialogAction.title}" would open here. This is a placeholder.`});
     setDialogAction(null);
     setIsDialogActionOpen(false);
  };

  const renderFooter = () => (
     <CardFooter className="border-t mt-4 pt-4 flex justify-end">
        <Button onClick={handleSave} disabled={isLoading || isSaving || isUploadingLogo}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
            Save {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
        </Button>
     </CardFooter>
  );

  const timezoneOptions = TIMEZONES.map(tz => ({ value: tz, label: tz }));

  return (
    <AppLayout>
      <AlertDialog open={isDialogActionOpen} onOpenChange={setIsDialogActionOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{dialogAction?.title}</AlertDialogTitle><AlertDialogDescription>{dialogAction?.description}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel onClick={() => setDialogAction(null)}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmAction}>Acknowledge</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-8">
        <header><h1 className="text-3xl font-bold tracking-tight font-headline">System Settings</h1><p className="text-muted-foreground">Configure various aspects of the IntelliAssistant platform.</p></header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 h-auto">
            <TabsTrigger value="general"><Settings className="mr-2 h-4 w-4"/>General</TabsTrigger>
            <TabsTrigger value="notifications"><Bell className="mr-2 h-4 w-4"/>Notifications</TabsTrigger>
            <TabsTrigger value="appearance"><Palette className="mr-2 h-4 w-4"/>Appearance</TabsTrigger>
            <TabsTrigger value="recruitment-data"><ListChecks className="mr-2 h-4 w-4"/>Recruitment Data</TabsTrigger>
            <TabsTrigger value="integrations"><Briefcase className="mr-2 h-4 w-4"/>Integrations</TabsTrigger>
            <TabsTrigger value="security"><Shield className="mr-2 h-4 w-4"/>Security</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="mt-6">
            <Card>
              <CardHeader><CardTitle>General Settings</CardTitle><CardDescription>Basic configuration for your IntelliAssistant instance.</CardDescription></CardHeader>
              <CardContent className="space-y-6">
                {isLoading ? <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin inline-block mr-2" />Loading...</div> : <>
                    <div className="space-y-2">
                        <Label htmlFor="defaultTimezone">Default Timezone</Label>
                        <Combobox
                            options={timezoneOptions}
                            value={generalSettings.defaultTimezone}
                            onChange={(value) => setGeneralSettings(p => ({...p, defaultTimezone: value}))}
                            placeholder="Search timezone..."
                            notFoundText="No timezone found."
                            disabled={isSaving}
                        />
                    </div>

                    <div className="flex items-center space-x-2"><Switch id="autoSaveDrafts" checked={generalSettings.autoSaveDrafts} onCheckedChange={checked => setGeneralSettings(p => ({...p, autoSaveDrafts: checked}))} disabled={isSaving}/><Label htmlFor="autoSaveDrafts">Enable Auto-Save for Drafts</Label></div>
                    <div className="space-y-4 pt-4 border-t">
                      <Label className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary"/>Available Countries for Budgeting</Label>
                      <p className="text-xs text-muted-foreground">Select countries to make their currencies available in the Project Budget dialog.</p>
                      <Select onValueChange={handleCountryAdd} disabled={isSaving} value=""><SelectTrigger><SelectValue placeholder="Select a country to add..." /></SelectTrigger><SelectContent>{COUNTRIES.filter(c => !generalSettings.availableCountries.includes(c.code)).map(country => <SelectItem key={country.code} value={country.code}>{country.name} ({country.currency})</SelectItem>)}</SelectContent></Select>
                      <div className="flex flex-wrap gap-2">{generalSettings.availableCountries.map(code => { const country = getCountryByCode(code); return country ? <Badge key={code} variant="secondary"><button type="button" onClick={() => handleCountryRemove(code)} className="mr-1.5 text-muted-foreground hover:text-destructive" disabled={isSaving}><Trash2 className="h-3 w-3" /></button>{country.name} ({country.currency})</Badge> : null; })}</div>
                    </div>
                </>}
              </CardContent>
              {renderFooter()}
            </Card>
          </TabsContent>
          
          <TabsContent value="notifications" className="mt-6">
             <Card>
                <CardHeader><CardTitle>Notification Preferences</CardTitle><CardDescription>Manage how you and your users receive notifications.</CardDescription></CardHeader>
                <CardContent className="space-y-4">{isLoading ? <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin inline-block mr-2" />Loading...</div> : <>
                    <div className="flex items-center justify-between p-3 border rounded-md"><Label htmlFor="newCandidateEmail">New Candidate Applied (Email)</Label><Switch id="newCandidateEmail" checked={notificationSettings.newCandidateEmail} onCheckedChange={checked => setNotificationSettings(p => ({...p, newCandidateEmail: checked}))} disabled={isSaving}/></div>
                    <div className="flex items-center justify-between p-3 border rounded-md"><Label htmlFor="interviewReminderApp">Interview Reminders (In-App)</Label><Switch id="interviewReminderApp" checked={notificationSettings.interviewReminderApp} onCheckedChange={checked => setNotificationSettings(p => ({...p, interviewReminderApp: checked}))} disabled={isSaving}/></div>
                    <div className="flex items-center justify-between p-3 border rounded-md"><Label htmlFor="dailySummaryEmail">Daily Activity Summary (Email)</Label><Switch id="dailySummaryEmail" checked={notificationSettings.dailySummaryEmail} onCheckedChange={checked => setNotificationSettings(p => ({...p, dailySummaryEmail: checked}))} disabled={isSaving}/></div>
                </>}</CardContent>
                {renderFooter()}
            </Card>
          </TabsContent>

          <TabsContent value="appearance" className="mt-6">
             <Card>
                <CardHeader><CardTitle>Appearance & Branding</CardTitle><CardDescription>Customize the look and feel of the platform.</CardDescription></CardHeader>
                <CardContent className="space-y-6">{isLoading ? <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin inline-block mr-2" />Loading...</div> : <>
                    <div className="space-y-2">
                        <Label htmlFor="orgName">Organization Name</Label>
                        <Input id="orgName" value={appearanceSettings.organizationName} onChange={(e) => setAppearanceSettings(p => ({...p, organizationName: e.target.value}))} disabled={isSaving}/>
                    </div>

                    <div className="space-y-2">
                        <Label>Company Logo</Label>
                        <div className="flex items-center gap-4">
                           {appearanceSettings.logoUrl ? 
                             <Image src={appearanceSettings.logoUrl} alt="Company Logo" width={64} height={64} className="h-16 w-16 object-contain rounded-md border p-1" />
                             : <div className="h-16 w-16 rounded-md border flex items-center justify-center bg-muted"><Palette className="h-8 w-8 text-muted-foreground"/></div>
                           }
                            <Input id="logo-upload" type="file" accept="image/*" onChange={handleLogoUpload} disabled={isSaving || isUploadingLogo} className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                            {isUploadingLogo && <Loader2 className="h-5 w-5 animate-spin" />}
                        </div>
                        <p className="text-xs text-muted-foreground">Recommended: Square image, PNG or JPG, under 2MB.</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="primaryColor">Primary Theme Color</Label>
                        <div className="flex items-center gap-2">
                            <Input id="primaryColor" type="color" value={appearanceSettings.primaryColor} onChange={(e) => setAppearanceSettings(p => ({...p, primaryColor: e.target.value}))} className="w-16 h-10 p-1" disabled={isSaving}/>
                            <Input type="text" value={appearanceSettings.primaryColor} onChange={(e) => setAppearanceSettings(p => ({...p, primaryColor: e.target.value}))} className="w-28" disabled={isSaving}/>
                            <div style={{ backgroundColor: appearanceSettings.primaryColor }} className="h-8 w-8 rounded-md border"></div>
                        </div>
                    </div>

                </>}</CardContent>
                {renderFooter()}
            </Card>
          </TabsContent>
          
          <TabsContent value="recruitment-data" className="mt-6 space-y-6">
             <ManagedListSection title="Manage Departments" itemTypeLabel="Department" fetchItems={getDepartments} addItem={addDepartment} deleteItem={deleteDepartment} />
             <ManagedListSection title="Manage Locations" itemTypeLabel="Location" fetchItems={getLocations} addItem={addLocation} deleteItem={deleteLocation} />
             <ManagedListSection title="Manage Hiring Managers (System List)" itemTypeLabel="Hiring Manager" fetchItems={getCompanyHiringManagers} addItem={addCompanyHiringManager} deleteItem={deleteCompanyHiringManager} />
          </TabsContent>

          <TabsContent value="integrations" className="mt-6">
             <Card>
                <CardHeader><CardTitle>Integrations Management</CardTitle><CardDescription>Connect IntelliAssistant with other tools.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                    <Card className="p-4 shadow-sm"><div className="flex justify-between items-center"><div><h4 className="font-semibold">Google Calendar</h4><p className="text-xs text-muted-foreground">Sync interviews with Google Calendar.</p></div><Button variant="outline" onClick={() => handleTriggerAction("Connect Google Calendar", "This will start the OAuth flow to connect your Google Calendar account.")}>Connect</Button></div></Card>
                    <Card className="p-4 shadow-sm"><div className="flex justify-between items-center"><div><h4 className="font-semibold">Slack</h4><p className="text-xs text-muted-foreground">Receive notifications in Slack channels.</p></div> <Button variant="outline" onClick={() => handleTriggerAction("Connect Slack", "This will start the process to connect to your Slack workspace.")}>Connect</Button></div></Card>
                    <Card className="p-4 shadow-sm"><div className="flex justify-between items-center"><div><h4 className="font-semibold">Your ATS</h4><p className="text-xs text-muted-foreground">See ATS Integration page for more details.</p></div> <Button variant="link" asChild><Link href="/ats-integration">Configure</Link></Button></div></Card>
                </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="mt-6">
             <Card>
                <CardHeader><CardTitle>Security Settings</CardTitle><CardDescription>Manage security options for your account.</CardDescription></CardHeader>
                <CardContent className="space-y-4">{isLoading ? <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin inline-block mr-2" />Loading...</div> : <>
                    <div className="flex items-center justify-between p-3 border rounded-md"><Label>Two-Factor Authentication (2FA)</Label><Button variant="outline" onClick={() => handleTriggerAction("Enable 2FA", "This would take you to the 2FA setup wizard.")}>Enable 2FA</Button></div>
                    <div className="space-y-2"><Label htmlFor="sessionTimeoutMinutes">Session Timeout (minutes)</Label><Input id="sessionTimeoutMinutes" type="number" value={securitySettings.sessionTimeoutMinutes} onChange={(e) => setSecuritySettings(p => ({...p, sessionTimeoutMinutes: Math.max(1, parseInt(e.target.value) || 0)}))} disabled={isSaving}/></div>
                    <div><Button variant="outline" onClick={() => handleTriggerAction("View Audit Logs", "This would open the detailed audit log viewer.")}>View Audit Logs</Button></div>
                    <div className="flex items-center justify-between p-3 border rounded-md"><Label>Data Encryption at Rest</Label><Badge variant="secondary"><Check className="h-3 w-3 mr-1 inline"/>Enabled</Badge></div>
                </>}</CardContent>
                {renderFooter()}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
