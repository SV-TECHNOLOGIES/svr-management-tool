"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteVendor = exports.updateVendor = exports.getVendorById = exports.createVendor = exports.getVendors = void 0;
const index_1 = require("../index");
const getVendors = async (req, res) => {
    try {
        const { search } = req.query;
        const whereClause = search
            ? {
                OR: [
                    { name: { contains: String(search), mode: 'insensitive' } },
                    { email: { contains: String(search), mode: 'insensitive' } },
                ],
            }
            : {};
        const vendors = await index_1.prisma.vendor.findMany({
            where: whereClause,
            include: {
                projects: true,
                payments: true,
                _count: {
                    select: { projects: true, payments: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        const formattedVendors = vendors.map((vendor) => {
            const totalPayout = vendor.projects.reduce((acc, p) => acc + p.costINR, 0);
            return {
                id: vendor.id,
                name: vendor.name,
                email: vendor.email,
                phone: vendor.phone,
                rating: vendor.rating,
                status: vendor.status,
                projectsCount: vendor.projects.length,
                cost: totalPayout || 45000,
                type: vendor.name.includes('Solutions') ? 'Full Service' : vendor.name.includes('Writers') ? 'Academic' : 'Technical',
            };
        });
        res.json(formattedVendors);
    }
    catch (error) {
        console.error('Error fetching vendors:', error);
        res.status(500).json({ error: 'Failed to fetch vendors' });
    }
};
exports.getVendors = getVendors;
const createVendor = async (req, res) => {
    try {
        const { name, email, phone, rating, status } = req.body;
        if (!name || !email) {
            return res.status(400).json({ error: 'Name and Email are required' });
        }
        const vendor = await index_1.prisma.vendor.create({
            data: {
                name,
                email,
                phone: phone || '',
                rating: Number(rating) || 4.5,
                status: status || 'ACTIVE',
            },
        });
        res.status(201).json(vendor);
    }
    catch (error) {
        console.error('Error creating vendor:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Vendor email already exists' });
        }
        res.status(500).json({ error: 'Failed to create vendor' });
    }
};
exports.createVendor = createVendor;
const getVendorById = async (req, res) => {
    const { id } = req.params;
    try {
        const vendor = await index_1.prisma.vendor.findUnique({
            where: { id },
            include: {
                projects: true,
                payments: true,
            },
        });
        if (!vendor)
            return res.status(404).json({ error: 'Vendor not found' });
        res.json(vendor);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch vendor' });
    }
};
exports.getVendorById = getVendorById;
const updateVendor = async (req, res) => {
    const { id } = req.params;
    try {
        const { name, email, phone, rating, status } = req.body;
        const vendor = await index_1.prisma.vendor.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(email && { email }),
                ...(phone !== undefined && { phone }),
                ...(rating !== undefined && { rating: Number(rating) }),
                ...(status && { status }),
            },
        });
        res.json(vendor);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update vendor' });
    }
};
exports.updateVendor = updateVendor;
const deleteVendor = async (req, res) => {
    const { id } = req.params;
    try {
        await index_1.prisma.vendor.delete({ where: { id } });
        res.json({ message: 'Vendor deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete vendor' });
    }
};
exports.deleteVendor = deleteVendor;
