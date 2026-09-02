import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

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

// Create a new student enrollment and auto-instantiate stage submissions
export const createStudent = async (req: Request, res: Response) => {
  try {
    const {
      mscProjectId,
      name,
      mobileNo,
      rollNo,
      projectTitle,
      agreedAmount,
      advancePaid, // Optional initial advance payment
      recordedByAdminId,
    } = req.body;

    if (!mscProjectId || !name || !mobileNo || !rollNo || !projectTitle || agreedAmount === undefined) {
      return res.status(400).json({
        error: 'mscProjectId, name, mobileNo, rollNo, projectTitle, and agreedAmount are required.',
      });
    }

    // Verify project exists & get submission templates
    const project = await prisma.mscProject.findUnique({
      where: { id: mscProjectId },
      include: { submissionTemplates: { orderBy: { order: 'asc' } } },
    });

    if (!project) {
      return res.status(404).json({ error: 'MSc Project not found' });
    }

    // Create Student
    const student = await prisma.student.create({
      data: {
        mscProjectId,
        name,
        mobileNo,
        rollNo,
        projectTitle,
        agreedAmount,
        status: 'ACTIVE',
      },
    });

    // Auto-instantiate Submission records for each stage template
    const now = new Date();
    const submissionCreations = project.submissionTemplates.map((template) => {
      const offsetDays = template.deadlineOffsetDays || 14;
      const deadline = new Date(now.getTime() + offsetDays * 24 * 60 * 60 * 1000);

      return prisma.submission.create({
        data: {
          studentId: student.id,
          submissionTemplateId: template.id,
          deadline,
          status: 'PENDING',
        },
      });
    });

    await Promise.all(submissionCreations);

    // If advance payment was provided, create initial Payment record
    if (advancePaid && Number(advancePaid) > 0) {
      await prisma.payment.create({
        data: {
          studentId: student.id,
          amount: Number(advancePaid),
          status: 'RECEIVED',
          receivedAt: now,
          recordedByAdminId,
          notes: 'Initial advance payment upon enrollment.',
        },
      });
    }

    // Return created student with generated submissions
    const createdStudent = await prisma.student.findUnique({
      where: { id: student.id },
      include: {
        mscProject: true,
        submissions: { include: { submissionTemplate: true } },
        payments: true,
      },
    });

    res.status(201).json(createdStudent);
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({ error: 'Failed to enroll student' });
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

// Update student details or status
export const updateStudent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, mobileNo, rollNo, projectTitle, agreedAmount, status } = req.body;

    const updated = await prisma.student.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(mobileNo && { mobileNo }),
        ...(rollNo && { rollNo }),
        ...(projectTitle && { projectTitle }),
        ...(agreedAmount !== undefined && { agreedAmount }),
        ...(status && { status }),
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ error: 'Failed to update student' });
  }
};

// Delete student
export const deleteStudent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.student.delete({ where: { id } });
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ error: 'Failed to delete student' });
  }
};
