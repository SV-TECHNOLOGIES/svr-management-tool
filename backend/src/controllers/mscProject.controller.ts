import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

// List all MSc Projects with details
export const getMscProjects = async (req: Request, res: Response) => {
  try {
    const projects = await prisma.mscProject.findMany({
      include: {
        submissionTemplates: {
          orderBy: { order: 'asc' },
        },
        adminSplits: {
          include: { admin: true },
        },
        students: {
          include: {
            submissions: true,
            payments: true,
            outsourcings: true,
          },
        },
        outsourcings: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = projects.map((p) => {
      const totalAgreedRevenue = p.students.reduce(
        (sum, s) => sum + Number(s.agreedAmount),
        0
      );

      const totalReceivedPayments = p.students.reduce((sum, s) => {
        const studentPaid = s.payments
          .filter((pay) => pay.status === 'RECEIVED')
          .reduce((pSum, pay) => pSum + Number(pay.amount), 0);
        return sum + studentPaid;
      }, 0);

      const studentOutsourcingCost = p.students.reduce((sum, s) => {
        const sOut = s.outsourcings.reduce(
          (oSum, out) => oSum + Number(out.amount),
          0
        );
        return sum + sOut;
      }, 0);

      const projectWideOutsourcingCost = p.outsourcings.reduce(
        (sum, out) => sum + Number(out.amount),
        0
      );

      const totalOutsourcingCost =
        studentOutsourcingCost + projectWideOutsourcingCost;

      const completedStudentCount = p.students.filter((s) => s.status === 'COMPLETED').length;
      let status = 'PENDING_ENROLLMENT';
      if (p.students.length > 0) {
        if (completedStudentCount === p.students.length) {
          status = 'COMPLETED';
        } else {
          status = 'IN_PROGRESS';
        }
      }

      return {
        id: p.id,
        name: p.name,
        description: p.description,
        amountRangeLow: Number(p.amountRangeLow),
        amountRangeHigh: Number(p.amountRangeHigh),
        currency: p.currency,
        createdAt: p.createdAt,
        submissionTemplates: p.submissionTemplates,
        adminSplits: p.adminSplits.map((as) => ({
          id: as.id,
          adminId: as.adminId,
          adminName: as.admin.name,
          adminEmail: as.admin.email,
          percentage: Number(as.percentage),
        })),
        studentCount: p.students.length,
        completedStudentCount,
        status,
        totalAgreedRevenue,
        totalReceivedPayments,
        outstandingBalance: totalAgreedRevenue - totalReceivedPayments,
        totalOutsourcingCost,
        netProfit: totalReceivedPayments - totalOutsourcingCost,
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching MSc Projects:', error);
    res.status(500).json({ error: 'Failed to fetch MSc Projects' });
  }
};

// Create a new MSc Project with submission templates and admin splits
export const createMscProject = async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      amountRangeLow,
      amountRangeHigh,
      currency,
      adminSplits, // Array of { adminId, percentage }
      submissionTemplates, // Array of { name, order, isFinal, templateFileUrl, deadlineOffsetDays, paymentPercentage, instructions }
    } = req.body;

    if (!name || amountRangeLow === undefined || amountRangeHigh === undefined) {
      return res
        .status(400)
        .json({ error: 'Name and valid amount range (low & high) are required.' });
    }

    const createdProject = await prisma.mscProject.create({
      data: {
        name,
        description,
        amountRangeLow,
        amountRangeHigh,
        currency: currency || 'GBP',
        adminSplits: {
          create: (adminSplits || []).map((as: { adminId: string; percentage: number }) => ({
            adminId: as.adminId,
            percentage: as.percentage,
          })),
        },
        submissionTemplates: {
          create: (submissionTemplates || []).map(
            (st: {
              name: string;
              order: number;
              isFinal?: boolean;
              templateFileUrl?: string;
              deadlineOffsetDays?: number;
              paymentPercentage: number;
              instructions?: string;
            }) => ({
              name: st.name,
              order: st.order,
              isFinal: st.isFinal || false,
              templateFileUrl: st.templateFileUrl,
              deadlineOffsetDays: st.deadlineOffsetDays || 14,
              paymentPercentage: st.paymentPercentage,
              instructions: st.instructions,
            })
          ),
        },
      },
      include: {
        submissionTemplates: true,
        adminSplits: { include: { admin: true } },
      },
    });

    res.status(201).json(createdProject);
  } catch (error) {
    console.error('Error creating MSc Project:', error);
    res.status(500).json({ error: 'Failed to create MSc Project' });
  }
};

// Get single MSc Project by ID
export const getMscProjectById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const project = await prisma.mscProject.findUnique({
      where: { id },
      include: {
        submissionTemplates: { orderBy: { order: 'asc' } },
        adminSplits: { include: { admin: true } },
        students: {
          include: {
            submissions: {
              include: {
                submissionTemplate: true,
                submittedByAdmin: true,
                reviewedByAdmin: true,
                notes: { include: { admin: true } },
              },
            },
            payments: true,
            outsourcings: true,
          },
        },
        outsourcings: { include: { recordedByAdmin: true, student: true } },
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'MSc Project not found' });
    }

    res.json(project);
  } catch (error) {
    console.error('Error fetching MSc Project details:', error);
    res.status(500).json({ error: 'Failed to fetch MSc Project details' });
  }
};

// List available Admins
export const getAdmins = async (req: Request, res: Response) => {
  try {
    const admins = await prisma.admin.findMany({
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    });
    res.json(admins);
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({ error: 'Failed to fetch admins' });
  }
};
