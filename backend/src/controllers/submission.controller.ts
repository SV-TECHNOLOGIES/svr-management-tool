import { AuthRequest } from '../middleware/auth';
import { handle } from '../services/errors';
import { prisma } from '../utils/prisma';
import * as ws from '../services/workspace.service';

const actor = (req: AuthRequest, ref?: string | null) => ws.resolveAdminId(ref, req.user?.userId || null);

const flatten = (sub: any) => ({
  ...sub,
  submittedByAdmin: sub.submittedByAdmin?.name || null,
  reviewedByAdmin: sub.reviewedByAdmin?.name || null,
});

// 1. Attach work link(s) and mark SUBMITTED. Accepts { fileLink } or { links: [{url,type,label}] }.
export const updateSubmissionFile = handle('Failed to update submission links', async (req: AuthRequest) => {
  const { fileLink, links, submittedByAdminId, deadline, note } = req.body || {};
  const adminId = await actor(req, submittedByAdminId);
  return flatten(await ws.submitWork(req.params.id, { fileLink, links, adminId, deadline, note }));
});

// 2. Peer review (APPROVE | REQUEST_CHANGES)
export const reviewSubmission = handle('Failed to complete peer review', async (req: AuthRequest) => {
  const { reviewedByAdminId, action, reviewNotes } = req.body || {};
  const adminId = await actor(req, reviewedByAdminId);
  return flatten(await ws.reviewWork(req.params.id, { action, adminId, notes: reviewNotes }));
});

// 3. Shared with student toggle
export const updateShareStatus = handle('Failed to update share status', async (req: AuthRequest) =>
  flatten(await ws.setShared(req.params.id, Boolean(req.body?.sharedWithStudent)))
);

// 4. Student feedback
export const recordStudentFeedback = handle('Failed to record student feedback', async (req: AuthRequest) =>
  flatten(await ws.recordFeedback(req.params.id, req.body?.studentFeedback))
);

// 5. Set status directly (e.g. COMPLETED)
export const updateSubmissionStatus = handle('Failed to update submission status', async (req: AuthRequest) =>
  flatten(await ws.setSubmissionStatus(req.params.id, req.body?.status, req.body?.deadline))
);

// 6. Add note
export const addSubmissionNote = handle('Failed to add submission note', async (req: AuthRequest, res) => {
  const adminId = await actor(req, req.body?.adminId);
  const note = await ws.addNote({ submissionId: req.params.id }, req.body?.content, adminId);
  res.status(201).json(note);
});

// 7. List notes
export const getSubmissionNotes = handle('Failed to fetch submission notes', (req: AuthRequest) =>
  prisma.note.findMany({
    where: { submissionId: req.params.id },
    include: { admin: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  })
);
