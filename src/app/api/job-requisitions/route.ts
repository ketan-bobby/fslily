
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getJobRequisitionsFromDB, saveJobRequisitionToDB } from '@/lib/db';
import { JOB_REQUISITION_STATUSES, JOB_REQUISITION_PRIORITIES } from '@/lib/types';
import type { JobRequisition } from '@/lib/types';

export const JobRequisitionCreateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  department: z.string().min(1, "Department is required"),
  location: z.string().min(1, "Location is required"),
  status: z.enum(JOB_REQUISITION_STATUSES),
  description: z.string().min(1, "Description is required"),
  skillsRequired: z.array(z.string()).optional().default([]),
  hiringManager: z.string().min(1, "Hiring Manager is required"),
  priority: z.enum(JOB_REQUISITION_PRIORITIES).optional(),
});
export type JobRequisitionCreateData = z.infer<typeof JobRequisitionCreateSchema>;


export async function GET() {
  try {
    const requisitions = await getJobRequisitionsFromDB();
    return NextResponse.json(requisitions);
  } catch (error) {
    console.error('API GET /api/job-requisitions - Error fetching job requisitions:', error);
    return NextResponse.json({ message: 'Failed to fetch job requisitions', error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validationResult = JobRequisitionCreateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({ message: 'Invalid request data', errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    const newRequisitionData = validationResult.data as Omit<JobRequisition, 'id' | 'datePosted' | 'createdAt' | 'updatedAt'>;
    const savedRequisition = await saveJobRequisitionToDB(newRequisitionData);

    if (savedRequisition) {
      return NextResponse.json(savedRequisition, { status: 201 });
    } else {
      return NextResponse.json({ message: 'Failed to create job requisition' }, { status: 500 });
    }
  } catch (error) {
    console.error('API POST /api/job-requisitions - Error creating job requisition:', error);
    return NextResponse.json({ message: 'Failed to create job requisition', error: (error as Error).message }, { status: 500 });
  }
}
