import { Router } from 'express';
import { AuthRequest } from '../middleware/auth';
import { handle } from '../services/errors';
import * as ws from '../services/workspace.service';
import * as biz from '../services/business.service';

/**
 * Routes for project brief/templates, student workspace, links, deliveries,
 * tasks, notes and the agenda. Mounted under /api (after authentication).
 */
const r = Router();
const me = (req: AuthRequest) => req.user?.userId || null;
const actor = (req: AuthRequest, ref?: string | null) => ws.resolveAdminId(ref, me(req));

// --- Project brief & templates -------------------------------------------
r.put('/msc-projects/:id', handle('Failed to update project', (req) => ws.updateProject(req.params.id, req.body)));
r.post('/msc-projects/:id/templates', handle('Failed to add stage', (req) => ws.addSubmissionTemplate(req.params.id, req.body)));
r.put('/templates/:id', handle('Failed to update stage', (req) => ws.updateSubmissionTemplate(req.params.id, req.body)));
r.delete('/templates/:id', handle('Failed to delete stage', (req) => ws.deleteSubmissionTemplate(req.params.id)));
r.post(
  '/msc-projects/:id/task-templates',
  handle('Failed to add checklist item', (req) => ws.addTaskTemplate(req.params.id, req.body, Boolean(req.body?.applyToExisting)))
);
r.put('/task-templates/:id', handle('Failed to update checklist item', (req) => ws.updateTaskTemplate(req.params.id, req.body)));
r.delete('/task-templates/:id', handle('Failed to delete checklist item', (req) => ws.deleteTaskTemplate(req.params.id)));

// --- Student workspace ------------------------------------------------------
r.get('/students/:id/workspace', handle('Failed to load workspace', (req) => ws.getStudentWorkspace(req.params.id)));
r.post(
  '/students/:id/links',
  handle('Failed to add link', (req) => ws.addLink({ studentId: req.params.id }, req.body))
);
r.post(
  '/students/:id/notes',
  handle('Failed to add note', async (req) => ws.addNote({ studentId: req.params.id }, req.body?.content, await actor(req, req.body?.adminId)))
);

// --- Links ------------------------------------------------------------------
r.post('/submissions/:id/links', handle('Failed to add link', (req) => ws.addLink({ submissionId: req.params.id }, req.body)));
r.post('/deliveries/:id/links', handle('Failed to add link', (req) => ws.addLink({ deliveryId: req.params.id }, req.body)));
r.put('/links/:id', handle('Failed to update link', (req) => ws.updateLink(req.params.id, req.body)));
r.delete('/links/:id', handle('Failed to delete link', (req) => ws.deleteLink(req.params.id)));
r.delete('/notes/:id', handle('Failed to delete note', (req) => ws.deleteNote(req.params.id)));
r.put('/submissions/:id/deadline', handle('Failed to update deadline', (req) => ws.setSubmissionDeadline(req.params.id, req.body?.deadline)));

// --- Deliveries ---------------------------------------------------------------
r.get(
  '/deliveries',
  handle('Failed to load deliveries', (req) =>
    ws.listDeliveries({ studentId: req.query.studentId, status: req.query.status, mscProjectId: req.query.mscProjectId })
  )
);
r.post('/deliveries', handle('Failed to log delivery', async (req) => ws.createDelivery(req.body, await actor(req, req.body?.adminId))));
r.put('/deliveries/:id', handle('Failed to update delivery', async (req) => ws.updateDelivery(req.params.id, req.body, await actor(req, req.body?.adminId))));
r.delete('/deliveries/:id', handle('Failed to delete delivery', (req) => ws.deleteDelivery(req.params.id)));

// --- Tasks ------------------------------------------------------------------
r.post('/tasks', handle('Failed to create task', (req) => ws.createTask(req.body)));
r.put('/tasks/:id', handle('Failed to update task', (req) => ws.updateTask(req.params.id, req.body)));
r.delete('/tasks/:id', handle('Failed to delete task', (req) => ws.deleteTask(req.params.id)));

// --- People / enrollments -----------------------------------------------------
r.get('/people', handle('Failed to load students', (req) => biz.listPeople(req.query.search as string | undefined)));
r.put('/students/:id', handle('Failed to update student', (req) => biz.updateEnrollment(req.params.id, req.body)));

r.post(
  '/msc-projects/:id/enroll-many',
  handle('Failed to enroll students', async (req) =>
    biz.enrollMany(req.params.id, req.body?.personIds, req.body || {}, await actor(req))
  )
);
r.delete('/students/:id', handle('Failed to remove student', (req) => biz.unenrollStudent(req.params.id)));
r.delete('/msc-projects/:id', handle('Failed to delete project', (req) => biz.deleteProject(req.params.id)));
r.get('/payments', handle('Failed to load payments', (req) => biz.listPayments({ mscProjectId: req.query.mscProjectId as string, studentId: req.query.studentId as string })));
r.delete('/finance/payments/:id', handle('Failed to delete payment', (req) => biz.deletePayment(req.params.id)));

// --- Project deliverables -----------------------------------------------------
r.get('/msc-projects/:id/deliverables', handle('Failed to load deliverables', (req) => biz.listProjectDeliverables(req.params.id)));
r.post(
  '/msc-projects/:id/deliverables',
  handle('Failed to add deliverable', async (req) => biz.createProjectDeliverable(req.params.id, req.body, await actor(req)))
);
r.put('/deliverables/:id', handle('Failed to update deliverable', (req) => biz.updateProjectDeliverable(req.params.id, req.body)));
r.delete('/deliverables/:id', handle('Failed to delete deliverable', (req) => biz.deleteProjectDeliverable(req.params.id)));
r.post(
  '/deliverables/:id/mark-sent',
  handle('Failed to mark deliverable sent', async (req) => biz.markDeliverableSent(req.params.id, req.body || {}, await actor(req)))
);

// --- Outsourcing / expenses -----------------------------------------------------
r.get(
  '/outsourcing',
  handle('Failed to load expenses', (req) =>
    biz.listExpenses({
      mscProjectId: req.query.mscProjectId as string,
      studentId: req.query.studentId as string,
      status: req.query.status as string,
      paidTo: req.query.paidTo as string,
    })
  )
);
r.post('/outsourcing', handle('Failed to log expense', async (req, res) => {
  res.status(201);
  return biz.createExpense(req.body, await actor(req, req.body?.recordedByAdminId));
}));
r.put('/outsourcing/:id', handle('Failed to update expense', (req) => biz.updateExpense(req.params.id, req.body)));

// --- Finance per project & admin split ------------------------------------------
r.get('/finance/projects', handle('Failed to load project finance', (req) => biz.projectFinance(req.query.mscProjectId as string | undefined)));
r.put('/msc-projects/:id/splits', handle('Failed to update split', (req) => biz.setAdminSplits(req.params.id, req.body?.splits)));

// --- My work ----------------------------------------------------------------------
r.get('/my-work', handle('Failed to load your work', (req) => biz.getMyWork(me(req)!, { scope: req.query.scope === 'all' ? 'all' : 'mine' })));

// --- Agenda -------------------------------------------------------------------
r.get(
  '/agenda',
  handle('Failed to load agenda', (req) => ws.getAgenda(Number(req.query.days) || 14, req.query.mscProjectId as string | undefined))
);

export default r;
