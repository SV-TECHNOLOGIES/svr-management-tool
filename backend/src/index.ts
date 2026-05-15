import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Basic health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Authentication Routes
// TODO: Implement Auth

// Dashboard Stats
app.get('/api/dashboard/stats', async (req: Request, res: Response) => {
  try {
    const totalProjects = await prisma.project.count();
    const activeProjects = await prisma.project.count({ where: { status: 'ACTIVE' } });
    const upcomingDeadlines = await prisma.deadline.count({
      where: { date: { gte: new Date() } }
    });
    
    // Revenue aggregates (Mocked for now as we don't have many records)
    const stats = {
      totalProjects,
      activeProjects,
      upcomingDeadlines,
      totalRevenueINR: 482900, // Matching Figma for demonstration
      totalRevenueGBP: 4800,
      outsourcingCosts: 120000,
      netProfit: 362900,
      pendingInvoices: 28
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export { app, prisma };
