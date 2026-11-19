import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

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
