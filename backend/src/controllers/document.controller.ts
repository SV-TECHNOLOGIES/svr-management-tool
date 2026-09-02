import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

export const getDocuments = async (req: Request, res: Response) => {
  try {
    const submissions = await prisma.submission.findMany({
      where: { fileLink: { not: null } },
      include: {
        student: { select: { name: true } },
        submissionTemplate: { select: { name: true } },
      },
    });

    const docs = submissions.map((sub) => ({
      id: sub.id,
      name: `${sub.student.name} - ${sub.submissionTemplate.name}`,
      url: sub.fileLink || '#',
      size: 1024 * 500,
      type: sub.fileLink?.includes('drive') ? 'G-Drive' : 'URL',
      createdAt: sub.updatedAt,
      studentName: sub.student.name,
    }));

    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
};

export const createDocument = async (req: Request, res: Response) => {
  res.status(200).json({ message: 'Document added' });
};

export const deleteDocument = async (req: Request, res: Response) => {
  res.status(200).json({ message: 'Document deleted' });
};
