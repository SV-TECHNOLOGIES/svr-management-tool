import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

export const getReportAnalytics = async (req: Request, res: Response) => {
  try {
    const totalStudents = await prisma.student.count();
    const completedStudents = await prisma.student.count({ where: { status: 'COMPLETED' } });
    const submissionsCount = await prisma.submission.count();
    const completedSubmissions = await prisma.submission.count({ where: { status: 'COMPLETED' } });

    res.json({
      totalStudents,
      completedStudents,
      submissionsCount,
      completedSubmissions,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch report analytics' });
  }
};
