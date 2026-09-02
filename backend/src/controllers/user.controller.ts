import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

export const getProfile = async (req: Request, res: Response) => {
  try {
    const admin = await prisma.admin.findFirst();
    res.json(admin || { name: 'James Wilson', email: 'james.wilson@svr.com', role: 'ADMIN' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  res.json({ message: 'Profile updated' });
};
