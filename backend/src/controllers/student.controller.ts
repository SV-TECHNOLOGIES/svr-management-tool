import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { sendError } from '../services/errors';
import { enrollStudent, resolveAdminId } from '../services/workspace.service';

// List students with full financial breakdown, current stage progress, and submissions
export const getStudents = async (req: Request, res: Response) => {
  try {
    const { mscProjectId, status } = req.query;

    const whereClause: any = {};
    if (mscProjectId) whereClause.mscProjectId = String(mscProjectId);
    if (status) whereClause.status = String(status);

    const students = await prisma.student.findMany({
      where: whereClause,
      include: {
        mscProject: {
          select: { id: true, name: true, currency: true },
        },
        submissions: {
          include: {
            submissionTemplate: true,
            submittedByAdmin: { select: { id: true, name: true } },
            reviewedByAdmin: { select: { id: true, name: true } },
            notes: {
              include: { admin: { select: { id: true, name: true } } },
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { submissionTemplate: { order: 'asc' } },
        },
        payments: {
          orderBy: { receivedAt: 'desc' },
        },
        outsourcings: {
          orderBy: { paidAt: 'desc' },
        },
        links: true,
        tasks: { select: { status: true } },
        deliveries: { select: { status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = students.map((s) => {
      const agreedAmount = Number(s.agreedAmount);
      const totalPaid = s.payments
        .filter((p) => p.status === 'RECEIVED')
        .reduce((sum, p) => sum + Number(p.amount), 0);
      const outstandingBalance = agreedAmount - totalPaid;

      const totalOutsourcing = s.outsourcings.reduce(
        (sum, o) => sum + Number(o.amount),
        0
      );

      const completedSubmissions = s.submissions.filter(
        (sub) => sub.status === 'COMPLETED'
      ).length;
      const totalSubmissions = s.submissions.length;

      // Identify active/current submission stage
      const activeSubmission =
        s.submissions.find((sub) => sub.status !== 'COMPLETED') ||
        s.submissions[s.submissions.length - 1];

      return {
        id: s.id,
        mscProjectId: s.mscProjectId,
        mscProjectName: s.mscProject.name,
        name: s.name,
        mobileNo: s.mobileNo,
        rollNo: s.rollNo,
        projectTitle: s.projectTitle,
        email: s.email,
        meetingDay: s.meetingDay,
        links: s.links,
        tasksDone: s.tasks.filter((t) => t.status === 'DONE').length,
        tasksTotal: s.tasks.length,
        deliveriesSent: s.deliveries.filter((d) => d.status !== 'PLANNED').length,
        deliveriesPlanned: s.deliveries.filter((d) => d.status === 'PLANNED').length,
        agreedAmount,
        totalPaid,
        outstandingBalance,
        totalOutsourcing,
        margin: agreedAmount - totalOutsourcing,
        status: s.status,
        createdAt: s.createdAt,
        completedSubmissions,
        totalSubmissions,
        activeSubmissionStage: activeSubmission
          ? activeSubmission.submissionTemplate.name
          : 'None',
        submissions: s.submissions.map((sub) => ({
          id: sub.id,
          submissionTemplateId: sub.submissionTemplateId,
          stageName: sub.submissionTemplate.name,
          order: sub.submissionTemplate.order,
          isFinal: sub.submissionTemplate.isFinal,
          paymentPercentage: Number(sub.submissionTemplate.paymentPercentage),
          deadline: sub.deadline,
          fileLink: sub.fileLink,
          status: sub.status,
          submittedByAdmin: sub.submittedByAdmin?.name || null,
          submittedByAdminId: sub.submittedByAdminId,
          submittedAt: sub.submittedAt,
          reviewedByAdmin: sub.reviewedByAdmin?.name || null,
          reviewedByAdminId: sub.reviewedByAdminId,
          reviewedAt: sub.reviewedAt,
          sharedWithStudent: sub.sharedWithStudent,
          sharedAt: sub.sharedAt,
          studentFeedback: sub.studentFeedback,
          feedbackReceivedAt: sub.feedbackReceivedAt,
          notesCount: sub.notes.length,
          notes: sub.notes,
        })),
        payments: s.payments,
        outsourcings: s.outsourcings,
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
};

// Create a new student enrollment: auto-instantiates stage submissions and the sprint checklist
export const createStudent = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = await resolveAdminId(req.body?.recordedByAdminId, req.user?.userId || null);
    const student = await enrollStudent(req.body, adminId);
    const created = await prisma.student.findUnique({
      where: { id: student.id },
      include: { mscProject: true, submissions: { include: { submissionTemplate: true } }, payments: true, tasks: true, links: true },
    });
    res.status(201).json(created);
  } catch (error) {
    sendError(res, error, 'Failed to enroll student');
  }
};

// Get student details by ID
export const getStudentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        mscProject: true,
        submissions: {
          include: {
            submissionTemplate: true,
            submittedByAdmin: true,
            reviewedByAdmin: true,
            notes: {
              include: { admin: true },
              orderBy: { createdAt: 'desc' },
            },
            payments: true,
          },
          orderBy: { submissionTemplate: { order: 'asc' } },
        },
        payments: { orderBy: { id: 'desc' } },
        outsourcings: { orderBy: { paidAt: 'desc' } },
      },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(student);
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({ error: 'Failed to fetch student details' });
  }
};
