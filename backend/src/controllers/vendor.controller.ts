import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

export const getVendors = async (req: Request, res: Response) => {
  try {
    const outsourcings = await prisma.outsourcing.findMany({
      select: { paidTo: true, amount: true, paidAt: true },
    });
    // Group by paidTo
    const vendorMap: Record<string, { name: string; totalPaid: number; count: number }> = {};
    outsourcings.forEach((o) => {
      if (!vendorMap[o.paidTo]) {
        vendorMap[o.paidTo] = { name: o.paidTo, totalPaid: 0, count: 0 };
      }
      vendorMap[o.paidTo].totalPaid += Number(o.amount);
      vendorMap[o.paidTo].count += 1;
    });

    const vendors = Object.values(vendorMap).map((v, i) => ({
      id: `v-${i + 1}`,
      name: v.name,
      rating: 4.8,
      status: 'ACTIVE',
      totalPaid: v.totalPaid,
      projectCount: v.count,
    }));

    res.json(vendors);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
};

export const createVendor = async (req: Request, res: Response) => {
  res.status(200).json({ message: 'Vendor added' });
};

export const getVendorById = async (req: Request, res: Response) => {
  res.json({ id: req.params.id, name: 'Sample Vendor', rating: 5.0 });
};

export const updateVendor = async (req: Request, res: Response) => {
  res.json({ message: 'Vendor updated' });
};

export const deleteVendor = async (req: Request, res: Response) => {
  res.json({ message: 'Vendor deleted' });
};
