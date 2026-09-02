import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

// Get finance overview, payments list, unpaid students ledger, and admin split calculations
export const getFinanceOverview = async (req: Request, res: Response) => {
  try {
    const { mscProjectId } = req.query;

    const whereClause: any = {};
    if (mscProjectId) whereClause.mscProjectId = String(mscProjectId);

    const mscProjects = await prisma.mscProject.findMany({
      where: whereClause,
      include: {
        adminSplits: { include: { admin: true } },
        students: {
          include: {
            payments: { include: { recordedByAdmin: true, submission: { include: { submissionTemplate: true } } } },
            outsourcings: true,
          },
        },
        outsourcings: true,
      },
    });

    let totalAgreedRevenue = 0;
    let totalReceivedPayments = 0;
    let totalPendingPayments = 0;
    let totalOutsourcingExpenses = 0;

    const studentLedger: any[] = [];
    const adminSplitsSummary: Record<string, { adminName: string; totalShareAmount: number; percentage: number }> = {};

    mscProjects.forEach((proj) => {
      // Process admin splits
      proj.adminSplits.forEach((split) => {
        const adminId = split.adminId;
        if (!adminSplitsSummary[adminId]) {
          adminSplitsSummary[adminId] = {
            adminName: split.admin.name,
            totalShareAmount: 0,
            percentage: Number(split.percentage),
          };
        }
      });

      // Process students
      proj.students.forEach((student) => {
        const agreed = Number(student.agreedAmount);
        totalAgreedRevenue += agreed;

        const paid = student.payments
          .filter((p) => p.status === 'RECEIVED')
          .reduce((sum, p) => sum + Number(p.amount), 0);

        const pending = student.payments
          .filter((p) => p.status === 'PENDING')
          .reduce((sum, p) => sum + Number(p.amount), 0);

        totalReceivedPayments += paid;
        totalPendingPayments += pending;

        const studentOutsourcing = student.outsourcings.reduce(
          (sum, o) => sum + Number(o.amount),
          0
        );

        totalOutsourcingExpenses += studentOutsourcing;

        const outstanding = agreed - paid;

        studentLedger.push({
          studentId: student.id,
          studentName: student.name,
          rollNo: student.rollNo,
          mobileNo: student.mobileNo,
          projectTitle: student.projectTitle,
          mscProjectName: proj.name,
          agreedAmount: agreed,
          totalPaid: paid,
          totalPending: pending,
          outstandingBalance: outstanding,
          isFullyPaid: outstanding <= 0,
          totalOutsourcing: studentOutsourcing,
          margin: agreed - studentOutsourcing,
          payments: student.payments,
        });
      });

      // Add project-wide outsourcing expenses
      proj.outsourcings.forEach((o) => {
        totalOutsourcingExpenses += Number(o.amount);
      });

      // Calculate Admin Splits based on Received Payments
      proj.adminSplits.forEach((split) => {
        const adminId = split.adminId;
        const projectReceived = proj.students.reduce((pSum, s) => {
          return (
            pSum +
            s.payments
              .filter((p) => p.status === 'RECEIVED')
              .reduce((rSum, p) => rSum + Number(p.amount), 0)
          );
        }, 0);

        const adminShare = (projectReceived * Number(split.percentage)) / 100;
        adminSplitsSummary[adminId].totalShareAmount += adminShare;
      });
    });

    res.json({
      summary: {
        totalAgreedRevenue,
        totalReceivedPayments,
        totalPendingPayments,
        outstandingBalance: totalAgreedRevenue - totalReceivedPayments,
        totalOutsourcingExpenses,
        netProfit: totalReceivedPayments - totalOutsourcingExpenses,
      },
      studentLedger,
      adminSplitsSummary: Object.values(adminSplitsSummary),
    });
  } catch (error) {
    console.error('Error fetching finance overview:', error);
    res.status(500).json({ error: 'Failed to fetch finance overview' });
  }
};

// Record a new payment for a student
export const recordPayment = async (req: Request, res: Response) => {
  try {
    const { studentId, submissionId, amount, status, notes, recordedByAdminId } = req.body;

    if (!studentId || amount === undefined) {
      return res.status(400).json({ error: 'studentId and amount are required.' });
    }

    const payment = await prisma.payment.create({
      data: {
        studentId,
        submissionId: submissionId || null,
        amount: Number(amount),
        status: status || 'RECEIVED',
        receivedAt: status === 'RECEIVED' ? new Date() : null,
        notes,
        recordedByAdminId: recordedByAdminId || null,
      },
      include: {
        student: true,
        submission: { include: { submissionTemplate: true } },
        recordedByAdmin: true,
      },
    });

    res.status(201).json(payment);
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
};

// Update payment status (e.g., mark PENDING as RECEIVED)
export const updatePayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, status, notes } = req.body;

    const existing = await prisma.payment.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Payment record not found.' });
    }

    const isNowReceived = status === 'RECEIVED' && existing.status !== 'RECEIVED';

    const updated = await prisma.payment.update({
      where: { id },
      data: {
        ...(amount !== undefined && { amount: Number(amount) }),
        ...(status && { status }),
        ...(notes && { notes }),
        ...(isNowReceived && { receivedAt: new Date() }),
      },
      include: {
        student: true,
        recordedByAdmin: true,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ error: 'Failed to update payment' });
  }
};
