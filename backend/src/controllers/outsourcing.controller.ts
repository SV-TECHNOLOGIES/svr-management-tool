import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

// Get outsourcing list & breakdowns
export const getOutsourcingExpenses = async (req: Request, res: Response) => {
  try {
    const { mscProjectId, studentId } = req.query;

    const whereClause: any = {};
    if (mscProjectId) whereClause.mscProjectId = String(mscProjectId);
    if (studentId) whereClause.studentId = String(studentId);

    const expenses = await prisma.outsourcing.findMany({
      where: whereClause,
      include: {
        mscProject: { select: { id: true, name: true } },
        student: { select: { id: true, name: true, rollNo: true, projectTitle: true } },
        recordedByAdmin: { select: { id: true, name: true } },
      },
      orderBy: { paidAt: 'desc' },
    });

    const totalOutsourcing = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    res.json({
      totalOutsourcing,
      expenses,
    });
  } catch (error) {
    console.error('Error fetching outsourcing expenses:', error);
    res.status(500).json({ error: 'Failed to fetch outsourcing expenses' });
  }
};

// Record an outsourcing expense
export const createOutsourcingExpense = async (req: Request, res: Response) => {
  try {
    const {
      mscProjectId,
      studentId, // Optional (null for project-wide)
      paidTo,
      description,
      amount,
      notes,
      recordedByAdminId,
    } = req.body;

    if (!mscProjectId || !paidTo || !description || amount === undefined) {
      return res.status(400).json({
        error: 'mscProjectId, paidTo, description, and amount are required.',
      });
    }

    const created = await prisma.outsourcing.create({
      data: {
        mscProjectId,
        studentId: studentId || null,
        paidTo,
        description,
        amount: Number(amount),
        notes,
        recordedByAdminId: recordedByAdminId || null,
      },
      include: {
        mscProject: true,
        student: true,
        recordedByAdmin: true,
      },
    });

    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating outsourcing expense:', error);
    res.status(500).json({ error: 'Failed to record outsourcing expense' });
  }
};

// Delete outsourcing expense
export const deleteOutsourcingExpense = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.outsourcing.delete({ where: { id } });
    res.json({ message: 'Outsourcing record deleted successfully' });
  } catch (error) {
    console.error('Error deleting outsourcing expense:', error);
    res.status(500).json({ error: 'Failed to delete outsourcing expense' });
  }
};
