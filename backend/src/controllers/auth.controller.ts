import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma';
import { generateToken } from '../utils/auth';
import { AuthRequest } from '../middleware/auth';
import { badRequest, handle, HttpError } from '../services/errors';

const publicAdmin = (a: { id: string; name: string; email: string; role: string }) => ({
  id: a.id,
  name: a.name,
  email: a.email,
  role: a.role,
});

export const login = handle('Login failed', async (req: AuthRequest) => {
  const { email, password } = req.body || {};
  if (!email || !password) throw badRequest('Email and password are required');

  const admin = await prisma.admin.findFirst({ where: { email: { equals: String(email).trim(), mode: 'insensitive' } } });
  if (!admin || !admin.password || !(await bcrypt.compare(String(password), admin.password))) {
    throw new HttpError(401, 'Invalid email or password');
  }
  return { token: generateToken(admin.id, admin.role), admin: publicAdmin(admin) };
});

export const me = handle('Failed to load profile', async (req: AuthRequest) => {
  const admin = await prisma.admin.findUnique({ where: { id: req.user!.userId } });
  if (!admin) throw new HttpError(401, 'Account no longer exists');
  return publicAdmin(admin);
});

export const changePassword = handle('Failed to change password', async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!newPassword || String(newPassword).length < 8) throw badRequest('New password must be at least 8 characters');
  const admin = await prisma.admin.findUnique({ where: { id: req.user!.userId } });
  if (!admin) throw new HttpError(401, 'Account no longer exists');
  if (admin.password && !(await bcrypt.compare(String(currentPassword || ''), admin.password))) {
    throw badRequest('Current password is incorrect');
  }
  await prisma.admin.update({ where: { id: admin.id }, data: { password: await bcrypt.hash(String(newPassword), 10) } });
  res.json({ ok: true });
});
