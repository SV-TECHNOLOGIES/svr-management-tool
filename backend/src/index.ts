import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { prisma } from './utils/prisma';

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
  updateStudent,
  deleteStudent,
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

import {
  getOutsourcingExpenses,
  createOutsourcingExpense,
  deleteOutsourcingExpense,
} from './controllers/outsourcing.controller';

import {
  getDashboardStats,
  getUpcomingDeadlines,
  getRecentUpdates,
} from './controllers/dashboard.controller';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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
app.put('/api/students/:id', updateStudent);
app.delete('/api/students/:id', deleteStudent);

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
app.get('/api/outsourcing', getOutsourcingExpenses);
app.post('/api/outsourcing', createOutsourcingExpense);
app.delete('/api/outsourcing/:id', deleteOutsourcingExpense);

// Dashboard endpoints
app.get('/api/dashboard/stats', getDashboardStats);
app.get('/api/dashboard/deadlines', getUpcomingDeadlines);
app.get('/api/dashboard/updates', getRecentUpdates);

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});

export { app, prisma };
