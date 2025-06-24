
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getJobRequisitionByIdFromDB, saveJobRequisitionToDB, deleteJobRequisitionFromDB } from '@/lib/db';
import { JOB_REQUISITION_STATUSES, JOB_REQUISITION_PRIORITIES } from '@/lib/types';
import type { JobRequisition } from '@/lib/types';

// Re-using and extending the schema for updates.
// For PUT, all fields are optional as it's a partial update.
// However, our saveJobRequisitionToDB expects all core fields.
// So, the component calling this PUT should ensure it fetches the existing data first.
export const JobRequisitionUpdateSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  department: z.string().min(1, "Department is required").optional(),
  location: z.string().min(1, "Location is required").optional(),
  status: z.enum(JOB_REQUISITION_STATUSES).optional(),
  description: z.string().min(1, "Description is required").optional(),
  skillsRequired: z.array(z.string()).optional(),
  hiringManager: z.string().min(1, "Hiring Manager is required").optional(),
  priority: z.enum(JOB_REQUISITION_PRIORITIES).optional(),
});
export type JobRequisitionUpdateData = z.infer<typeof JobRequisitionUpdateSchema>;

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = params;
    const requisition = await getJobRequisitionByIdFromDB(id);
    if (!requisition) {
      return NextResponse.json({ message: 'Job requisition not found' }, { status: 404 });
    }
    return NextResponse.json(requisition);
  } catch (error) {
    console.error(`API GET /api/job-requisitions/${params.id} - Error:`, error);
    return NextResponse.json({ message: 'Failed to fetch job requisition', error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = params;
    const body = await request.json();
    
    // Fetch existing requisition to ensure all fields are present for saveJobRequisitionToDB
    const existingRequisition = await getJobRequisitionByIdFromDB(id);
    if (!existingRequisition) {
        return NextResponse.json({ message: 'Job requisition not found to update' }, { status: 404 });
    }

    // Validate the incoming partial data
    const validationResult = JobRequisitionUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ message: 'Invalid request data for update', errors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }

    // Merge validated partial data with existing data
    const dataToUpdate: Omit<JobRequisition, 'id' | 'datePosted' | 'createdAt' | 'updatedAt'> = {
      title: validationResult.data.title ?? existingRequisition.title,
      department: validationResult.data.department ?? existingRequisition.department,
      location: validationResult.data.location ?? existingRequisition.location,
      status: validationResult.data.status ?? existingRequisition.status,
      description: validationResult.data.description ?? existingRequisition.description,
      skillsRequired: validationResult.data.skillsRequired ?? existingRequisition.skillsRequired,
      hiringManager: validationResult.data.hiringManager ?? existingRequisition.hiringManager,
      priority: validationResult.data.priority ?? existingRequisition.priority,
    };

    const updatedRequisition = await saveJobRequisitionToDB(dataToUpdate, id);

    if (updatedRequisition) {
      return NextResponse.json(updatedRequisition);
    } else {
      return NextResponse.json({ message: 'Failed to update job requisition' }, { status: 500 });
    }
  } catch (error) {
    console.error(`API PUT /api/job-requisitions/${params.id} - Error:`, error);
    return NextResponse.json({ message: 'Failed to update job requisition', error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = params;
    const success = await deleteJobRequisitionFromDB(id);
    if (success) {
      return NextResponse.json({ message: 'Job requisition deleted successfully' }, { status: 200 });
    } else {
      // This might happen if the ID doesn't exist or DB operation fails silently in db.ts (though db.ts should throw)
      return NextResponse.json({ message: 'Failed to delete job requisition or requisition not found' }, { status: 404 });
    }
  } catch (error) {
    console.error(`API DELETE /api/job-requisitions/${params.id} - Error:`, error);
    return NextResponse.json({ message: 'Failed to delete job requisition', error: (error as Error).message }, { status: 500 });
  }
}
