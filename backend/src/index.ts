import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { prisma } from './utils/prisma';
import { authenticate } from './middleware/auth';
import { login, me, changePassword } from './controllers/auth.controller';
import workspaceRoutes from './controllers/workspace.controller';
import { mcpHttpHandler } from './mcp/http';
import { oauthRouter, wellKnownRouter } from './oauth/oauth';

import {
  getMscProjects,
  createMscProject,
  getMscProjectById,
  getAdmins,
} from './controllers/mscProject.controller';

import {
  getStudents,
  createStudent,
  getStudentById,
} from './controllers/student.controller';

import {
  updateSubmissionFile,
  reviewSubmission,
  updateShareStatus,
  recordStudentFeedback,
  updateSubmissionStatus,
  addSubmissionNote,
  getSubmissionNotes,
} from './controllers/submission.controller';

import {
  getFinanceOverview,
  recordPayment,
  updatePayment,
} from './controllers/finance.controller';

import { deleteOutsourcingExpense } from './controllers/outsourcing.controller';

import {
  getDashboardStats,
  getUpcomingDeadlines,
  getRecentUpdates,
} from './controllers/dashboard.controller';

dotenv.config();

if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'secret')) {
  console.warn('WARNING: JWT_SECRET is not set to a strong value. Set it in the environment.');
}

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth (public)
app.post('/api/auth/login', login);

// OAuth 2.1 for MCP connectors (ChatGPT / Claude) — public
app.use('/.well-known', wellKnownRouter);
app.use('/api/oauth', oauthRouter);

// Remote MCP endpoint (own bearer-token / OAuth auth)
app.all('/api/mcp', mcpHttpHandler);

// Everything else under /api requires a logged-in admin
app.use('/api', authenticate);
app.get('/api/auth/me', me);
app.post('/api/auth/change-password', changePassword);

// Project brief/templates, student workspace, links, deliveries, tasks, notes, agenda
app.use('/api', workspaceRoutes);

// Admin endpoints
app.get('/api/admins', getAdmins);

// MSc Project endpoints
app.get('/api/msc-projects', getMscProjects);
app.post('/api/msc-projects', createMscProject);
app.get('/api/msc-projects/:id', getMscProjectById);

// Student endpoints
app.get('/api/students', getStudents);
app.post('/api/students', createStudent);
app.get('/api/students/:id', getStudentById);
// PUT /api/students/:id is served by workspaceRoutes (syncs person details)
// DELETE /api/students/:id is served by workspaceRoutes (unenroll)

// Submission endpoints (Lifecycle flow)
app.put('/api/submissions/:id/file', updateSubmissionFile);
app.put('/api/submissions/:id/review', reviewSubmission);
app.put('/api/submissions/:id/share', updateShareStatus);
app.put('/api/submissions/:id/feedback', recordStudentFeedback);
app.put('/api/submissions/:id/status', updateSubmissionStatus);
app.post('/api/submissions/:id/notes', addSubmissionNote);
app.get('/api/submissions/:id/notes', getSubmissionNotes);

// Finance & Payment endpoints
app.get('/api/finance/overview', getFinanceOverview);
app.post('/api/finance/payments', recordPayment);
app.put('/api/finance/payments/:id', updatePayment);

// Outsourcing endpoints
// GET/POST/PUT /api/outsourcing are served by workspaceRoutes (business.service)
app.delete('/api/outsourcing/:id', deleteOutsourcingExpense);

// Dashboard endpoints
app.get('/api/dashboard/stats', getDashboardStats);
app.get('/api/dashboard/deadlines', getUpcomingDeadlines);
app.get('/api/dashboard/updates', getRecentUpdates);

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
  });
}

export { app, prisma };
export default app;
