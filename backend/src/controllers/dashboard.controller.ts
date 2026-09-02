import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const totalProjects = await prisma.mscProject.count();
    const totalStudents = await prisma.student.count();
    const activeStudents = await prisma.student.count({
      where: { status: 'ACTIVE' },
    });

    const pendingReviews = await prisma.submission.count({
      where: { status: { in: ['SUBMITTED', 'IN_REVIEW'] } },
    });

    const students = await prisma.student.findMany({
      include: {
        payments: true,
        outsourcings: true,
      },
    });

    let totalAgreedRevenue = 0;
    let totalReceivedPayments = 0;
    let totalOutsourcing = 0;

    students.forEach((s) => {
      totalAgreedRevenue += Number(s.agreedAmount);
      s.payments.forEach((p) => {
        if (p.status === 'RECEIVED') {
          totalReceivedPayments += Number(p.amount);
        }
      });
      s.outsourcings.forEach((o) => {
        totalOutsourcing += Number(o.amount);
      });
    });

    const projectWideOutsourcing = await prisma.outsourcing.findMany({
      where: { studentId: null },
    });

    projectWideOutsourcing.forEach((o) => {
      totalOutsourcing += Number(o.amount);
    });

    res.json({
      totalProjects,
      totalStudents,
      activeStudents,
      pendingReviews,
      totalAgreedRevenue,
      totalReceivedPayments,
      outstandingBalance: totalAgreedRevenue - totalReceivedPayments,
      totalOutsourcing,
      netProfit: totalReceivedPayments - totalOutsourcing,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};

export const getUpcomingDeadlines = async (req: Request, res: Response) => {
  try {
    const submissions = await prisma.submission.findMany({
      where: {
        status: { not: 'COMPLETED' },
      },
      include: {
        student: { select: { name: true, rollNo: true, projectTitle: true } },
        submissionTemplate: { select: { name: true, order: true } },
      },
      orderBy: { deadline: 'asc' },
      take: 10,
    });

    const formatted = submissions.map((sub) => ({
      id: sub.id,
      studentName: sub.student.name,
      rollNo: sub.student.rollNo,
      projectTitle: sub.student.projectTitle,
      stageName: sub.submissionTemplate.name,
      deadline: sub.deadline,
      status: sub.status,
      fileLink: sub.fileLink,
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching upcoming deadlines:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming deadlines' });
  }
};

export const getRecentUpdates = async (req: Request, res: Response) => {
  try {
    const notes = await prisma.note.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        admin: { select: { name: true } },
        submission: {
          include: {
            student: { select: { name: true } },
            submissionTemplate: { select: { name: true } },
          },
        },
      },
    });

    res.json(notes);
  } catch (error) {
    console.error('Error fetching recent updates:', error);
    res.status(500).json({ error: 'Failed to fetch recent updates' });
  }
};
