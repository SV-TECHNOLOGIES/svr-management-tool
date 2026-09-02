import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { SubmissionStatus } from '@prisma/client';

const formatSubmission = (sub: any) => {
  if (!sub) return null;
  return {
    ...sub,
    submittedByAdmin: sub.submittedByAdmin?.name || null,
    reviewedByAdmin: sub.reviewedByAdmin?.name || null,
  };
};

// 1. Upload or Update Drive / Code link for a submission
export const updateSubmissionFile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { fileLink, submittedByAdminId, deadline } = req.body;

    if (!fileLink) {
      return res.status(400).json({ error: 'fileLink is required.' });
    }

    const updated = await prisma.submission.update({
      where: { id },
      data: {
        fileLink,
        status: SubmissionStatus.SUBMITTED,
        submittedByAdminId: submittedByAdminId || null,
        submittedAt: new Date(),
        ...(deadline && { deadline: new Date(deadline) }),
      },
      include: {
        submissionTemplate: true,
        submittedByAdmin: true,
        reviewedByAdmin: true,
        notes: { include: { admin: true }, orderBy: { createdAt: 'desc' } },
      },
    });

    res.json(formatSubmission(updated));
  } catch (error) {
    console.error('Error updating submission file:', error);
    res.status(500).json({ error: 'Failed to update submission file link' });
  }
};

// 2. Peer review submission (Approve or Request Changes)
export const reviewSubmission = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reviewedByAdminId, action, reviewNotes } = req.body; // action: 'APPROVE' | 'REQUEST_CHANGES'

    if (!action || !['APPROVE', 'REQUEST_CHANGES'].includes(action)) {
      return res
        .status(400)
        .json({ error: "action must be either 'APPROVE' or 'REQUEST_CHANGES'." });
    }

    const existingSubmission = await prisma.submission.findUnique({
      where: { id },
    });

    if (!existingSubmission) {
      return res.status(404).json({ error: 'Submission not found.' });
    }

    // Peer review check requirement #4: another admin user should review submission
    if (
      reviewedByAdminId &&
      existingSubmission.submittedByAdminId &&
      reviewedByAdminId === existingSubmission.submittedByAdminId
    ) {
      // Check if there are multiple admins in the system
      const adminCount = await prisma.admin.count();
      if (adminCount > 1) {
        return res.status(400).json({
          error:
            'Peer review required: The admin reviewing this submission must be different from the admin who submitted it.',
        });
      }
    }

    const newStatus =
      action === 'APPROVE'
        ? SubmissionStatus.APPROVED
        : SubmissionStatus.CHANGES_REQUESTED;

    const updated = await prisma.submission.update({
      where: { id },
      data: {
        status: newStatus,
        reviewedByAdminId: reviewedByAdminId || null,
        reviewedAt: new Date(),
      },
      include: {
        submissionTemplate: true,
        submittedByAdmin: true,
        reviewedByAdmin: true,
        notes: { include: { admin: true }, orderBy: { createdAt: 'desc' } },
      },
    });

    // If review notes provided, add Note record
    if (reviewNotes && reviewedByAdminId) {
      await prisma.note.create({
        data: {
          submissionId: id,
          adminId: reviewedByAdminId,
          content: `[Peer Review - ${action}]: ${reviewNotes}`,
        },
      });
    }

    res.json(formatSubmission(updated));
  } catch (error) {
    console.error('Error reviewing submission:', error);
    res.status(500).json({ error: 'Failed to complete peer review' });
  }
};

// 3. Update status whether the file is shared with the student or not
export const updateShareStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { sharedWithStudent } = req.body;

    const existingSubmission = await prisma.submission.findUnique({
      where: { id },
    });

    if (!existingSubmission) {
      return res.status(404).json({ error: 'Submission not found.' });
    }

    const isShared = Boolean(sharedWithStudent);
    let nextStatus = existingSubmission.status;

    if (isShared && existingSubmission.status === SubmissionStatus.APPROVED) {
      nextStatus = SubmissionStatus.SHARED_WITH_STUDENT;
    }

    const updated = await prisma.submission.update({
      where: { id },
      data: {
        sharedWithStudent: isShared,
        sharedAt: isShared ? new Date() : null,
        status: nextStatus,
      },
      include: {
        submissionTemplate: true,
        submittedByAdmin: true,
        reviewedByAdmin: true,
        notes: { include: { admin: true }, orderBy: { createdAt: 'desc' } },
      },
    });

    res.json(formatSubmission(updated));
  } catch (error) {
    console.error('Error updating share status:', error);
    res.status(500).json({ error: 'Failed to update share status' });
  }
};

// 4. Record student feedback response
export const recordStudentFeedback = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { studentFeedback } = req.body;

    if (!studentFeedback) {
      return res.status(400).json({ error: 'studentFeedback text is required.' });
    }

    const updated = await prisma.submission.update({
      where: { id },
      data: {
        studentFeedback,
        feedbackReceivedAt: new Date(),
        status: SubmissionStatus.FEEDBACK_RECEIVED,
      },
      include: {
        submissionTemplate: true,
        submittedByAdmin: true,
        reviewedByAdmin: true,
        notes: { include: { admin: true }, orderBy: { createdAt: 'desc' } },
      },
    });

    res.json(formatSubmission(updated));
  } catch (error) {
    console.error('Error recording student feedback:', error);
    res.status(500).json({ error: 'Failed to record student feedback' });
  }
};

// 5. Update submission status (e.g. mark COMPLETED)
export const updateSubmissionStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !Object.values(SubmissionStatus).includes(status)) {
      return res.status(400).json({ error: 'Valid SubmissionStatus is required.' });
    }

    const updated = await prisma.submission.update({
      where: { id },
      data: { status },
      include: {
        submissionTemplate: true,
        submittedByAdmin: true,
        reviewedByAdmin: true,
        student: true,
        notes: { include: { admin: true }, orderBy: { createdAt: 'desc' } },
      },
    });

    // Check if this submission is the final stage (isFinal = true) and status is COMPLETED
    if (status === SubmissionStatus.COMPLETED) {
      if (updated.submissionTemplate.isFinal) {
        // Automatically mark student status as COMPLETED!
        await prisma.student.update({
          where: { id: updated.studentId },
          data: { status: 'COMPLETED' },
        });
      }
    }

    res.json(formatSubmission(updated));
  } catch (error) {
    console.error('Error updating submission status:', error);
    res.status(500).json({ error: 'Failed to update submission status' });
  }
};

// 6. Add Note to submission
export const addSubmissionNote = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { adminId, content } = req.body;

    if (!adminId || !content) {
      return res.status(400).json({ error: 'adminId and content are required.' });
    }

    const note = await prisma.note.create({
      data: {
        submissionId: id,
        adminId,
        content,
      },
      include: { admin: true },
    });

    res.status(201).json(note);
  } catch (error) {
    console.error('Error adding submission note:', error);
    res.status(500).json({ error: 'Failed to add submission note' });
  }
};

// 7. Get Notes for a submission
export const getSubmissionNotes = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const notes = await prisma.note.findMany({
      where: { submissionId: id },
      include: { admin: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(notes);
  } catch (error) {
    console.error('Error fetching submission notes:', error);
    res.status(500).json({ error: 'Failed to fetch submission notes' });
  }
};
