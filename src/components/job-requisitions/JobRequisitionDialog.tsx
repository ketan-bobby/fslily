

"use client";

import React, { useState, useEffect, useCallback, ChangeEvent } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { JobRequisition, JobRequisitionStatus, JobPriority, ManagedListItem } from '@/lib/types';
import { JOB_REQUISITION_STATUSES, JOB_REQUISITION_PRIORITIES } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Edit, Loader2, Sparkles, Trash2, Eye, UploadCloud, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { generateJobDescriptionFromSkills } from '@/ai/flows/generate-job-description-from-skills';
import { parseJobDescription } from '@/ai/flows/parse-job-description';
import { getDepartments, getLocations, getCompanyHiringManagers } from '@/lib/db';
import { Card } from "@/components/ui/card";

interface JobRequisitionDialogProps {
  requisition?: JobRequisition | null;
  onSave?: (requisition: Omit<JobRequisition, 'id' | 'datePosted' | 'createdAt' | 'updatedAt'>, id?: string) => Promise<void> | void;
  triggerButton?: React.ReactNode;
  viewOnly?: boolean;
  customOpen?: boolean;
  customOnOpenChange?: (open: boolean) => void;
}

const readFileAsDataURL = (fileToRead: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(fileToRead);
  });
};

export const JobRequisitionDialog: React.FC<JobRequisitionDialogProps> = ({
  requisition,
  onSave,
  triggerButton,
  viewOnly = false,
  customOpen,
  customOnOpenChange,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = customOpen !== undefined ? customOpen : internalOpen;
  const setIsOpen = customOnOpenChange || setInternalOpen;

  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<JobRequisitionStatus>(JOB_REQUISITION_STATUSES[0]);
  const [description, setDescription] = useState('');
  const [skillsRequired, setSkillsRequired] = useState<string[]>([]);
  const [currentSkill, setCurrentSkill] = useState('');
  const [hiringManager, setHiringManager] = useState('');
  const [priority, setPriority] = useState<JobPriority | undefined>(JOB_REQUISITION_PRIORITIES[1]);

  const [departments, setDepartments] = useState<ManagedListItem[]>([]);
  const [locations, setLocations] = useState<ManagedListItem[]>([]);
  const [hiringManagers, setHiringManagers] = useState<ManagedListItem[]>([]);
  const [isLoadingDropdownData, setIsLoadingDropdownData] = useState(false);

  const [jdFile, setJdFile] = useState<File | null>(null);
  const [jdFileName, setJdFileName] = useState('');
  const [isParsingJD, setIsParsingJD] = useState(false);
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { toast } = useToast();
  const isEditing = !!requisition && !viewOnly;

  const fetchDropdownData = useCallback(async () => {
    if (viewOnly) return; 
    setIsLoadingDropdownData(true);
    try {
      const [deptData, locData, hmData] = await Promise.all([
        getDepartments(),
        getLocations(),
        getCompanyHiringManagers()
      ]);
      setDepartments(deptData);
      setLocations(locData);
      setHiringManagers(hmData);
    } catch (error) {
      console.error("Failed to fetch dropdown data", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load selection options." });
    } finally {
      setIsLoadingDropdownData(false);
    }
  }, [toast, viewOnly]);

  const resetFormFields = useCallback(() => {
    setTitle('');
    setDepartment('');
    setLocation('');
    setStatus(JOB_REQUISITION_STATUSES[0]);
    setDescription('');
    setSkillsRequired([]);
    setCurrentSkill('');
    setHiringManager('');
    setPriority(JOB_REQUISITION_PRIORITIES[1]);
    setJdFile(null);
    setJdFileName('');
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (!viewOnly) {
        fetchDropdownData();
      }
      if (requisition) {
        setTitle(requisition.title);
        setDepartment(requisition.department);
        setLocation(requisition.location);
        setStatus(requisition.status);
        setDescription(requisition.description);
        setSkillsRequired(requisition.skillsRequired || []);
        setHiringManager(requisition.hiringManager || '');
        setPriority(requisition.priority || JOB_REQUISITION_PRIORITIES[1]);
        setJdFile(null);
        setJdFileName('');
      } else if (!viewOnly) {
        resetFormFields();
      }
    }
  }, [requisition, isOpen, fetchDropdownData, viewOnly, resetFormFields]);

  const handleSkillAdd = () => {
    if (currentSkill.trim() && !skillsRequired.includes(currentSkill.trim())) {
      setSkillsRequired([...skillsRequired, currentSkill.trim()]);
      setCurrentSkill('');
    }
  };

  const handleSkillRemove = (skillToRemove: string) => {
    setSkillsRequired(skillsRequired.filter(skill => skill !== skillToRemove));
  };

  const handleGenerateDescriptionWithAI = useCallback(async () => {
    if (viewOnly) return;
    if (!title.trim()) {
      toast({ variant: "destructive", title: "Job Title Required", description: "Please enter a job title before generating a description." });
      return;
    }
    if (skillsRequired.length === 0) {
      toast({ variant: "destructive", title: "Skills Required", description: "Please add some skills before generating a description." });
      return;
    }
    setIsGeneratingDesc(true);
    try {
      const result = await generateJobDescriptionFromSkills({
        skills: skillsRequired,
        jobTitle: title,
        companyName: "IntelliAssistant Corp.", 
        tone: "formal",
      });
      setDescription(result.jobDescription);
      toast({ title: "Description Generated", description: "AI has drafted a job description based on skills." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Generation Failed", description: error.message || "Could not generate description." });
    } finally {
      setIsGeneratingDesc(false);
    }
  }, [skillsRequired, title, toast, viewOnly]);

  const handleJDFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (viewOnly) return;
    const file = event.target.files?.[0];
    if (file) {
      const allowedMimeTypes = ['application/pdf', 'text/plain', 'text/markdown'];
      if (!allowedMimeTypes.includes(file.type)) {
         toast({ variant: "destructive", title: "Unsupported File Type", description: "Please upload a PDF, TXT, or MD file." });
         setJdFile(null);
         setJdFileName('');
         if (event.target) event.target.value = ""; // Clear the file input
         return;
      }
      if (file.size > 5 * 1024 * 1024) { 
          toast({ variant: "destructive", title: "File Too Large", description: "Please upload a file smaller than 5MB." });
          setJdFile(null);
          setJdFileName('');
          if (event.target) event.target.value = "";
          return;
      }
      setJdFile(file);
      setJdFileName(file.name);
      setIsParsingJD(true);
      toast({ title: "Processing JD...", description: `Reading ${file.name}...` });

      try {
        const dataUri = await readFileAsDataURL(file);
        const parsedData = await parseJobDescription({ jobDescriptionDataUri: dataUri });

        if (parsedData.title) setTitle(parsedData.title);
        if (parsedData.description) setDescription(parsedData.description);
        if (parsedData.skillsRequired && parsedData.skillsRequired.length > 0) setSkillsRequired(parsedData.skillsRequired);
        if (parsedData.location) setLocation(parsedData.location);
        if (parsedData.department) setDepartment(parsedData.department);
        
        toast({ title: "JD Parsed Successfully", description: "Fields have been populated from the uploaded job description." });
      } catch (error: any) {
        console.error("Error parsing JD file:", error);
        toast({ variant: "destructive", title: "JD Parsing Failed", description: error.message || "Could not parse the job description file." });
      } finally {
        setIsParsingJD(false);
      }
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (viewOnly || !onSave) return;

    if (!title || !department || !location || !hiringManager) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please fill in Title, Department, Location, and Hiring Manager.",
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave({ title, department, location, status, description, skillsRequired, hiringManager, priority }, requisition?.id);
      setIsOpen(false);
    } catch (error) {
      console.error("Error in dialog submit:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const defaultTrigger = (
    <Button>
      <PlusCircle className="mr-2 h-4 w-4" /> Create Requisition
    </Button>
  );

  const editTriggerButton = (
     <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
      <Edit className="h-4 w-4" />
      <span className="sr-only">Edit Requisition</span>
    </Button>
  );
  
  const renderSelectOrInput = (
    label: string,
    idSuffix: string,
    value: string,
    onValueChange: (val: string) => void,
    options: ManagedListItem[],
    placeholder: string,
    required: boolean = false
  ) => {
    if (viewOnly) {
      return (
        <div>
          <Label htmlFor={`${label.toLowerCase().replace(/\s+/g, '-')}-${idSuffix}`}>{label}</Label>
          <Input id={`${label.toLowerCase().replace(/\s+/g, '-')}-${idSuffix}`} value={value} disabled className="mt-1 bg-muted/50 cursor-default" />
        </div>
      );
    }
    return (
      <div>
        <Label htmlFor={`${label.toLowerCase().replace(/\s+/g, '-')}-select-${idSuffix}`}>{label}</Label>
        <Select value={value} onValueChange={onValueChange} disabled={isSaving || (isLoadingDropdownData && !viewOnly) || isParsingJD} required={required}>
          <SelectTrigger id={`${label.toLowerCase().replace(/\s+/g, '-')}-select-${idSuffix}`}>
            <SelectValue placeholder={isLoadingDropdownData ? "Loading..." : placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map(opt => <SelectItem key={opt.id || opt.name} value={opt.name}>{opt.name}</SelectItem>)}
            {!options.find(opt => opt.name === value) && value && <SelectItem value={value}>{value} (Current)</SelectItem>}
          </SelectContent>
        </Select>
      </div>
    );
  };


  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!isSaving && !isGeneratingDesc && !isParsingJD) setIsOpen(open);
    }}>
      <DialogTrigger asChild>
        {triggerButton ? triggerButton : (isEditing ? editTriggerButton : (viewOnly && requisition ? <Button variant="outline" size="xs"><Eye className="mr-1.5 h-3 w-3"/> View Job</Button> : defaultTrigger))}
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{viewOnly ? 'View Job Requisition' : (isEditing ? 'Edit Job Requisition' : 'Create Job Requisition')}</DialogTitle>
          <DialogDescription>
            {viewOnly ? 'Details of the job requisition.' : 'Fill in the details for the job requisition. You can upload a JD file or generate a description with AI.'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto pr-2 space-y-4">
            {!viewOnly && (
                 <Card className="bg-muted/30 p-4">
                    <Label htmlFor="jdFile" className="text-sm font-medium">Upload Job Description File (Optional)</Label>
                    <div className="flex items-center gap-2 mt-1">
                        <Input 
                            id="jdFile" 
                            type="file" 
                            accept="application/pdf,text/plain,text/markdown"
                            onChange={handleJDFileChange} 
                            disabled={isSaving || isGeneratingDesc || isParsingJD || viewOnly}
                            className="file:mr-2 file:py-1 file:px-2 file:rounded-md file:border file:border-input file:bg-transparent file:text-xs file:font-medium file:text-foreground hover:file:bg-accent hover:file:text-accent-foreground"
                        />
                        {isParsingJD && <Loader2 className="h-4 w-4 animate-spin" />}
                    </div>
                    {jdFileName && !isParsingJD && <p className="text-xs text-muted-foreground mt-1">File: {jdFileName} <FileText className="inline h-3 w-3 ml-1"/></p>}
                    <p className="text-xs text-muted-foreground mt-1">Upload a supported file (PDF, TXT, MD) to auto-fill fields.</p>
                 </Card>
            )}

            <form id={`job-requisition-form-${requisition?.id || 'new'}`} onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                <Label htmlFor={`title-${requisition?.id || 'new'}`}>Title</Label>
                <Input id={`title-${requisition?.id || 'new'}`} value={title} onChange={(e) => setTitle(e.target.value)} required disabled={isSaving || viewOnly || isParsingJD}/>
                </div>
                {renderSelectOrInput("Department", requisition?.id || 'new', department, setDepartment, departments, "Select department", true)}
                {renderSelectOrInput("Location", requisition?.id || 'new', location, setLocation, locations, "Select location", true)}
                
                <div>
                <Label htmlFor={`status-${requisition?.id || 'new'}`}>Status</Label>
                {viewOnly ? (
                    <Input value={status} disabled className="mt-1 bg-muted/50 cursor-default" />
                ) : (
                    <Select value={status} onValueChange={(value: JobRequisitionStatus) => setStatus(value)} disabled={isSaving || isParsingJD}>
                        <SelectTrigger id={`status-${requisition?.id || 'new'}`}>
                        <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                        {JOB_REQUISITION_STATUSES.map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                )}
                </div>
                {renderSelectOrInput("Hiring Manager", requisition?.id || 'new', hiringManager, setHiringManager, hiringManagers, "Select hiring manager", true)}
                <div>
                <Label htmlFor={`priority-${requisition?.id || 'new'}`}>Priority</Label>
                {viewOnly ? (
                    <Input value={priority || 'N/A'} disabled className="mt-1 bg-muted/50 cursor-default" />
                ) : (
                    <Select value={priority} onValueChange={(value: JobPriority) => setPriority(value)} disabled={isSaving || isParsingJD}>
                        <SelectTrigger id={`priority-${requisition?.id || 'new'}`}>
                        <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                        {JOB_REQUISITION_PRIORITIES.map(p => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                )}
                </div>
            </div>
            
            <div>
                <Label htmlFor={`skills-${requisition?.id || 'new'}`}>Skills Required</Label>
                {!viewOnly && (
                    <div className="flex items-center gap-2">
                        <Input
                            id={`skills-${requisition?.id || 'new'}`}
                            value={currentSkill}
                            onChange={(e) => setCurrentSkill(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ',') {
                                    e.preventDefault();
                                    handleSkillAdd();
                                }
                            }}
                            placeholder="e.g., React, Node.js then Enter"
                            disabled={isSaving || viewOnly || isParsingJD}
                        />
                        <Button type="button" variant="outline" onClick={handleSkillAdd} disabled={isSaving || viewOnly || isParsingJD}>Add Skill</Button>
                    </div>
                )}
                <div className="mt-2 flex flex-wrap gap-2 min-h-[2.5rem] p-2 border rounded-md bg-muted/10">
                    {skillsRequired.length === 0 && <p className="text-sm text-muted-foreground">{(viewOnly || isParsingJD) ? 'No skills listed or parsed yet.' : 'Add skills one by one.'}</p>}
                    {skillsRequired.map(skill => (
                        <Badge key={skill} variant="secondary">
                            {skill}
                            {!viewOnly && (
                                <button type="button" onClick={() => handleSkillRemove(skill)} className="ml-2 text-muted-foreground hover:text-destructive text-xs font-bold" disabled={isSaving || viewOnly || isParsingJD}>
                                    <Trash2 className="h-3 w-3" />
                                </button>
                            )}
                        </Badge>
                    ))}
                </div>
            </div>

            <div>
                <div className="flex justify-between items-center mb-1">
                    <Label htmlFor={`description-${requisition?.id || 'new'}`}>Description</Label>
                    {!viewOnly && (
                        <Button type="button" size="sm" variant="outline" onClick={handleGenerateDescriptionWithAI} disabled={isGeneratingDesc || skillsRequired.length === 0 || !title.trim() || isSaving || viewOnly || isParsingJD}>
                            {isGeneratingDesc ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                            AI Gen (Skills)
                        </Button>
                    )}
                </div>
                <Textarea
                id={`description-${requisition?.id || 'new'}`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={viewOnly ? 10 : 8} 
                placeholder="Enter job description, upload a JD file, or generate with AI using skills and title."
                className="resize-y min-h-[150px]"
                disabled={isSaving || viewOnly || isParsingJD}
                readOnly={viewOnly}
                />
            </div>
            </form>
        </div>
        <DialogFooter className="mt-auto pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isGeneratingDesc || isSaving || isParsingJD}>
            {viewOnly ? "Close" : "Cancel"}
          </Button>
          {!viewOnly && (
            <Button type="submit" form={`job-requisition-form-${requisition?.id || 'new'}`} disabled={isGeneratingDesc || isSaving || isParsingJD}>
              {(isGeneratingDesc || isSaving || isParsingJD) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSaving ? (isEditing ? "Saving..." : "Creating...") : (isEditing ? "Save Changes" : "Save Requisition")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
