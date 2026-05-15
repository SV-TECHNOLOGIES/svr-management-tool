import { Request, Response } from 'express';
import { prisma } from '../index';

export const getSubjects = async (req: Request, res: Response) => {
  try {
    const subjects = await prisma.subject.findMany({
      include: {
        _count: {
          select: { students: true, projects: true }
        }
      }
    });
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
};

export const createSubject = async (req: Request, res: Response) => {
  const { name, code, description } = req.body;
  try {
    const subject = await prisma.subject.create({
      data: { name, code, description }
    });
    res.status(201).json(subject);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create subject' });
  }
};

export const getSubjectDetails = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const subject = await prisma.subject.findUnique({
      where: { id },
      include: {
        students: true,
        projects: true,
        deadlines: true,
        documents: true
      }
    });
    if (!subject) return res.status(404).json({ error: 'Subject not found' });
    res.json(subject);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch subject details' });
  }
};
