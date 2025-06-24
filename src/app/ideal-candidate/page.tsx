
"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Target, PlusCircle, Search, Edit2, Trash2, Info, Lightbulb, BarChartHorizontalBig, Loader2, BrainCircuit, Sparkles } from "lucide-react";
import React, { useState, useEffect, useCallback } from 'react';
import type { IdealCandidateProfile } from '@/lib/types';
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
import { getIdealCandidateProfilesFromDB, saveIdealCandidateProfileToDB, deleteIdealCandidateProfileFromDB } from '@/lib/db';
import { generateICPFromJobDescription, type GenerateICPFromJobDescriptionOutput } from '@/ai/flows/generate-icp-from-job-description';


export default function IdealCandidatePage() {
  const [profiles, setProfiles] = useState<IdealCandidateProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState<IdealCandidateProfile | null>(null);
  const { toast } = useToast();

  const [profileName, setProfileName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [keySkills, setKeySkills] = useState<string[]>([]);
  const [currentSkill, setCurrentSkill] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [educationRequirements, setEducationRequirements] = useState('');
  const [locationPreferences, setLocationPreferences] = useState('');
  const [companyBackground, setCompanyBackground] = useState('');
  const [culturalFitNotes, setCulturalFitNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [jobDescriptionForICP, setJobDescriptionForICP] = useState('');
  const [isGeneratingICP, setIsGeneratingICP] = useState(false);

  const fetchProfiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getIdealCandidateProfilesFromDB();
      setProfiles(data);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not load ideal candidate profiles." });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const resetFormFields = () => {
    setProfileName('');
    setJobTitle('');
    setKeySkills([]);
    setCurrentSkill('');
    setExperienceLevel('');
    setEducationRequirements('');
    setLocationPreferences('');
    setCompanyBackground('');
    setCulturalFitNotes('');
    setJobDescriptionForICP('');
  };

  const populateFormWithAIData = (aiData: GenerateICPFromJobDescriptionOutput) => {
    setProfileName(aiData.profileName);
    setJobTitle(aiData.jobTitle);
    setKeySkills(aiData.keySkills);
    setExperienceLevel(aiData.experienceLevel);
    setEducationRequirements(aiData.educationRequirements);
    setLocationPreferences(aiData.locationPreferences);
    setCompanyBackground(aiData.companyBackground || '');
    setCulturalFitNotes(aiData.culturalFitNotes);
  };

  useEffect(() => {
    if (editingProfile) {
      setProfileName(editingProfile.profileName);
      setJobTitle(editingProfile.jobTitle);
      setKeySkills(editingProfile.keySkills);
      setExperienceLevel(editingProfile.experienceLevel);
      setEducationRequirements(editingProfile.educationRequirements);
      setLocationPreferences(editingProfile.locationPreferences);
      setCompanyBackground(editingProfile.companyBackground || '');
      setCulturalFitNotes(editingProfile.culturalFitNotes);
      setJobDescriptionForICP(''); // Clear AI input field when editing existing
      setShowForm(true);
    } else if (showForm && !editingProfile) { 
      // If opening form for new (not AI generated yet), reset fields
      // If form is shown *after* AI generation, fields are already populated by populateFormWithAIData
      // This condition avoids resetting fields if AI just populated them.
      if(!isGeneratingICP) { // Only reset if not in midst of AI populating
          resetFormFields();
      }
    }
  }, [editingProfile, showForm]);

  const handleSkillAdd = () => {
    if (currentSkill.trim() && !keySkills.includes(currentSkill.trim())) {
      setKeySkills([...keySkills, currentSkill.trim()]);
      setCurrentSkill('');
    }
  };

  const handleSkillRemove = (skillToRemove: string) => {
    setKeySkills(keySkills.filter(skill => skill !== skillToRemove));
  };
  
  const handleCreateOrUpdateProfile = async () => {
    if (!profileName || !jobTitle || keySkills.length === 0 || !experienceLevel || !educationRequirements || !locationPreferences || !culturalFitNotes) {
        toast({
            variant: "destructive",
            title: "Missing Required Fields",
            description: "Please fill in all required fields marked with *.",
        });
        return;
    }
    setIsSubmitting(true);
    const profileData = {
        profileName, jobTitle, keySkills, experienceLevel, educationRequirements,
        locationPreferences, companyBackground, culturalFitNotes,
    };

    try {
      const savedProfile = await saveIdealCandidateProfileToDB(profileData, editingProfile?.id);
      if (savedProfile) {
        toast({ title: editingProfile ? "Profile Updated" : "Profile Saved", description: `Profile "${profileName}" has been ${editingProfile ? 'updated' : 'saved'}.` });
        setShowForm(false);
        setEditingProfile(null);
        resetFormFields();
        fetchProfiles();
      } else {
        throw new Error("Save operation failed");
      }
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: `Could not ${editingProfile ? 'update' : 'save'} profile.` });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleGenerateICPWithAI = async () => {
    if (!jobDescriptionForICP.trim()) {
      toast({ variant: "destructive", title: "Job Description Required", description: "Please paste a job description to generate the profile." });
      return;
    }
    setIsGeneratingICP(true);
    setEditingProfile(null); // Ensure we are creating a new profile
    resetFormFields(); // Reset form before populating with AI data

    try {
      const result = await generateICPFromJobDescription({
        jobDescription: jobDescriptionForICP,
        jobTitle: jobTitle || undefined, // Pass current job title if user typed one in ICP form already
      });
      populateFormWithAIData(result);
      setShowForm(true); // Show the form populated with AI data
      toast({ title: "ICP Generated", description: "AI has populated the profile form. Review and save." });
    } catch (error: any) {
      console.error("Error generating ICP with AI:", error);
      toast({ variant: "destructive", title: "AI Generation Failed", description: error.message || "Could not generate ICP." });
    } finally {
      setIsGeneratingICP(false);
    }
  };

  const handleStartCreate = () => {
    setEditingProfile(null); 
    resetFormFields(); 
    setShowForm(true);
  };

  const handleStartEdit = (profile: IdealCandidateProfile) => {
    setEditingProfile(profile);
    // Fields will be populated by useEffect
    setShowForm(true);
  };
  
  const handleDeleteProfile = async (profileId: string) => {
    setIsSubmitting(true); 
    try {
      const success = await deleteIdealCandidateProfileFromDB(profileId);
      if (success) {
        toast({ title: "Profile Deleted", description: "The ideal candidate profile has been removed." });
        fetchProfiles();
      } else {
        throw new Error("Delete operation failed");
      }
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Could not delete profile." });
    } finally {
        setIsSubmitting(false);
    }
  };

  const filteredProfiles = profiles.filter(profile => 
    profile.profileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profile.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profile.keySkills.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <AppLayout>
      <div className="space-y-8">
        <header className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-headline">Ideal Candidate Profiles</h1>
            <p className="text-muted-foreground">Define and manage profiles for your perfect hires. This is your hiring blueprint.</p>
          </div>
           <Button onClick={handleStartCreate} disabled={(showForm && !editingProfile) || isSubmitting || isGeneratingICP}>
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Profile
          </Button>
        </header>

        {showForm && (
           <Card className="shadow-lg border-primary/50">
             <CardHeader>
               <CardTitle className="text-xl">{editingProfile ? "Edit" : "Create"} Ideal Candidate Profile</CardTitle>
               <CardDescription>Define the characteristics of your ideal hire for a specific role.</CardDescription>
             </CardHeader>
             <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label htmlFor="profileName">Profile Name <span className="text-destructive">*</span></Label><Input id="profileName" placeholder="e.g., Senior Dev Profile" value={profileName} onChange={e => setProfileName(e.target.value)} disabled={isSubmitting || isGeneratingICP} /></div>
                    <div><Label htmlFor="jobTitleForm">Job Title <span className="text-destructive">*</span></Label><Input id="jobTitleForm" placeholder="e.g., Software Engineer" value={jobTitle} onChange={e => setJobTitle(e.target.value)} disabled={isSubmitting || isGeneratingICP}/></div>
                </div>
                
                <div>
                    <Label htmlFor="keySkillsForm">Key Skills (add one by one) <span className="text-destructive">*</span></Label>
                    <div className="flex items-center gap-2">
                        <Input 
                            id="keySkillsForm" 
                            placeholder="e.g., React, Node.js, Python" 
                            value={currentSkill} 
                            onChange={(e) => setCurrentSkill(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSkillAdd(); }}}
                            disabled={isSubmitting || isGeneratingICP}
                        />
                        <Button type="button" variant="outline" onClick={handleSkillAdd} disabled={isSubmitting || isGeneratingICP}>Add Skill</Button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                        {keySkills.map(skill => (
                            <Badge key={skill} variant="secondary" className="text-sm">
                                {skill}
                                <button type="button" onClick={() => handleSkillRemove(skill)} className="ml-1.5 text-muted-foreground hover:text-destructive text-xs font-bold" disabled={isSubmitting || isGeneratingICP}>
                                    &times;
                                </button>
                            </Badge>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label htmlFor="experienceLevelForm">Experience Level <span className="text-destructive">*</span></Label><Input id="experienceLevelForm" placeholder="e.g., 5+ years" value={experienceLevel} onChange={e => setExperienceLevel(e.target.value)} disabled={isSubmitting || isGeneratingICP}/></div>
                    <div><Label htmlFor="locationPreferencesForm">Location Preferences <span className="text-destructive">*</span></Label><Input id="locationPreferencesForm" placeholder="e.g., Remote (US)" value={locationPreferences} onChange={e => setLocationPreferences(e.target.value)} disabled={isSubmitting || isGeneratingICP}/></div>
                </div>

                <div><Label htmlFor="educationRequirementsForm">Education Requirements <span className="text-destructive">*</span></Label><Textarea id="educationRequirementsForm" placeholder="e.g., Bachelor's in CS" value={educationRequirements} onChange={e => setEducationRequirements(e.target.value)} disabled={isSubmitting || isGeneratingICP}/></div>
                <div><Label htmlFor="companyBackgroundForm">Preferred Company Background (Optional)</Label><Textarea id="companyBackgroundForm" placeholder="e.g., Experience in B2B SaaS" value={companyBackground} onChange={e => setCompanyBackground(e.target.value)} disabled={isSubmitting || isGeneratingICP}/></div>
                <div><Label htmlFor="culturalFitNotesForm">Cultural Fit Notes <span className="text-destructive">*</span></Label><Textarea id="culturalFitNotesForm" placeholder="Describe key cultural attributes..." value={culturalFitNotes} onChange={e => setCulturalFitNotes(e.target.value)} disabled={isSubmitting || isGeneratingICP}/></div>
             </CardContent>
             <CardFooter className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setShowForm(false); setEditingProfile(null); resetFormFields(); }} disabled={isSubmitting || isGeneratingICP}>Cancel</Button>
                <Button onClick={handleCreateOrUpdateProfile} disabled={isSubmitting || isGeneratingICP}>
                    {(isSubmitting || isGeneratingICP) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingProfile ? "Update Profile" : "Save Profile"}
                </Button>
             </CardFooter>
           </Card>
        )}

        <Card className="mt-8 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300"><Sparkles className="h-5 w-5"/>AI-Assisted Profile Generation</CardTitle>
            <CardDescription className="text-blue-600 dark:text-blue-400">Use AI to kickstart your Ideal Candidate Profile creation from a job description.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Paste a job description below, and our AI will attempt to extract key requirements and populate the form above for a new profile.
            </p>
            <div className="space-y-2 pt-2">
              <Label htmlFor="jdInputForAI" className="text-blue-700 dark:text-blue-300">Paste Job Description</Label>
              <Textarea 
                id="jdInputForAI" 
                placeholder="Paste the full job description here..." 
                rows={5} 
                value={jobDescriptionForICP}
                onChange={(e) => setJobDescriptionForICP(e.target.value)}
                disabled={isGeneratingICP || (showForm && !!editingProfile)} // Disable if AI is running or if editing an existing profile
              />
              <Button 
                onClick={handleGenerateICPWithAI} 
                disabled={isGeneratingICP || !jobDescriptionForICP.trim() || (showForm && !!editingProfile)} 
                className="w-full sm:w-auto"
              >
                {isGeneratingICP ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4" />}
                Generate with AI
              </Button>
               {(showForm && !!editingProfile) && (
                <p className="text-xs text-blue-600 dark:text-blue-400">AI generation is for creating new profiles. To edit, modify fields above and save.</p>
              )}
            </div>
            <ul className="list-disc list-inside space-y-1 text-sm text-blue-600 dark:text-blue-400 pl-4">
              <li>AI will suggest skills, experience levels, education, and more.</li>
              <li>You can then review, edit, and save the generated profile.</li>
              <li>Future enhancements: Analyze LinkedIn profiles of top performers.</li>
            </ul>
          </CardContent>
        </Card>

        <div className="space-y-4">
            <Input 
              placeholder="Search profiles by name, job title or skill..." 
              className="max-w-sm" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={showForm}
            />
        </div>
        
        {isLoading ? (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2">Loading profiles...</p>
            </div>
        ) : filteredProfiles.length === 0 && !showForm ? (
            <Card className="text-center py-12 shadow-md">
                <CardContent>
                    <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Ideal Candidate Profiles Yet</h3>
                    <p className="text-muted-foreground mb-4">Create your first profile to start defining your hiring blueprints, or use AI to generate one from a job description.</p>
                    <Button onClick={handleStartCreate} disabled={isSubmitting || isGeneratingICP}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Create Manually
                    </Button>
                </CardContent>
            </Card>
        ) : !showForm && (
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            {filteredProfiles.map((profile) => (
              <Card key={profile.id} className="flex flex-col shadow-md hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                      <div>
                          <CardTitle className="text-lg font-semibold">{profile.profileName}</CardTitle>
                          <CardDescription className="text-primary">{profile.jobTitle}</CardDescription>
                      </div>
                      <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleStartEdit(profile)} disabled={isSubmitting || isGeneratingICP}>
                              <Edit2 className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" disabled={isSubmitting || isGeneratingICP}>
                                  <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the ideal candidate profile "{profile.profileName}".
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteProfile(profile.id)} disabled={isSubmitting || isGeneratingICP}>
                                    {(isSubmitting || isGeneratingICP) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                      </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 flex-grow">
                  <div>
                      <h4 className="font-medium mb-1 text-sm">Key Skills:</h4>
                      <div className="flex flex-wrap gap-1.5">
                      {profile.keySkills.map(skill => <Badge key={skill} variant="secondary" className="px-2 py-0.5 text-xs">{skill}</Badge>)}
                      </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div><span className="font-medium">Experience:</span> {profile.experienceLevel}</div>
                      <div><span className="font-medium">Location:</span> {profile.locationPreferences}</div>
                  </div>
                  <div><span className="font-medium text-sm">Education:</span> <p className="text-sm text-muted-foreground">{profile.educationRequirements}</p></div>
                  {profile.companyBackground && <div><span className="font-medium text-sm">Company Background:</span> <p className="text-sm text-muted-foreground">{profile.companyBackground}</p></div>}
                  <div><span className="font-medium text-sm">Cultural Fit:</span> <p className="text-sm text-muted-foreground">{profile.culturalFitNotes}</p></div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

         <Card className="mt-8 bg-muted/50 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Lightbulb className="text-primary h-5 w-5"/>How This Feature Helps</CardTitle>
            <CardDescription>Defining ideal candidate profiles significantly improves your hiring process.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                    <h4 className="font-semibold flex items-center gap-1 mb-1"><BarChartHorizontalBig className="h-4 w-4"/>AI-Powered Matching</h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs">
                        <li>System scores real candidates against these ideal criteria.</li>
                        <li>Identifies the best matches automatically.</li>
                        <li>Provides percentage match scores for quick assessment.</li>
                    </ul>
                </div>
                 <div>
                    <h4 className="font-semibold flex items-center gap-1 mb-1"><Search className="h-4 w-4"/>Search & Sourcing Enhancement</h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs">
                        <li>Improves candidate sourcing from LinkedIn, GitHub, etc.</li>
                        <li>Enhances filtering and ranking of your existing candidates.</li>
                    </ul>
                </div>
                 <div>
                    <h4 className="font-semibold flex items-center gap-1 mb-1"><Info className="h-4 w-4"/>Clearer Requirements</h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs">
                        <li>Ensures alignment among hiring managers and recruiters.</li>
                        <li>Standardizes interview questions and evaluation criteria.</li>
                        <li>Helps attract more suitable candidates by refining job descriptions.</li>
                    </ul>
                </div>
                 <div>
                    <h4 className="font-semibold flex items-center gap-1 mb-1"><Target className="h-4 w-4"/>Your Hiring Blueprint</h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs">
                        <li>Create an ideal profile for each role you're hiring for.</li>
                        <li>System compares real candidates against these profiles.</li>
                        <li>Use profiles to guide your sourcing and interview strategies.</li>
                    </ul>
                </div>
            </div>
            <p className="text-xs text-center text-muted-foreground pt-2">
                This feature acts as your hiring blueprint - defining exactly what you're looking for so the AI can help you find and evaluate the best candidates more effectively.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
