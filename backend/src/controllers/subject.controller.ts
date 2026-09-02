import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

export const getSubjects = async (req: Request, res: Response) => {
  try {
    const projects = await prisma.mscProject.findMany({
      include: { students: true, submissionTemplates: true },
    });
    const formatted = projects.map((p) => ({
      id: p.id,
      name: p.name,
      code: p.id.substring(0, 8).toUpperCase(),
      description: p.description,
      status: 'ACTIVE',
      studentCount: p.students.length,
      revenueGBP: p.students.reduce((sum, s) => sum + Number(s.agreedAmount), 0),
    }));
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
};

export const createSubject = async (req: Request, res: Response) => {
  res.status(400).json({ error: 'Use /api/msc-projects to create an MSc Project.' });
};

export const getSubjectDetails = async (req: Request, res: Response) => {
  const { id } = req.params;
  const project = await prisma.mscProject.findUnique({
    where: { id },
    include: { students: true, submissionTemplates: true },
  });
  if (!project) return res.status(404).json({ error: 'Not found' });
  res.json(project);
};

export const updateSubject = async (req: Request, res: Response) => {
  res.status(200).json({ message: 'Updated' });
};

export const deleteSubject = async (req: Request, res: Response) => {
  res.status(200).json({ message: 'Deleted' });
};
