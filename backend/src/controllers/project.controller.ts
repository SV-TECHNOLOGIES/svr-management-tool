import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

export const getProjects = async (req: Request, res: Response) => {
  try {
    const students = await prisma.student.findMany({
      include: {
        mscProject: true,
        submissions: { include: { submissionTemplate: true } },
      },
    });

    const formatted = students.map((s) => ({
      id: s.id,
      title: s.projectTitle,
      studentName: s.name,
      mscProjectName: s.mscProject.name,
      status: s.status,
      agreedAmount: Number(s.agreedAmount),
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
};

export const createProject = async (req: Request, res: Response) => {
  res.status(400).json({ error: 'Use /api/students to enroll a student and project.' });
};
