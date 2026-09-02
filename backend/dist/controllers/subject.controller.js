"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSubject = exports.updateSubject = exports.getSubjectDetails = exports.createSubject = exports.getSubjects = void 0;
const index_1 = require("../index");
const getSubjects = async (req, res) => {
    try {
        const { search } = req.query;
        const whereClause = search
            ? {
                OR: [
                    { name: { contains: String(search), mode: 'insensitive' } },
                    { code: { contains: String(search), mode: 'insensitive' } },
                ],
            }
            : {};
        const subjects = await index_1.prisma.subject.findMany({
            where: whereClause,
            include: {
                _count: {
                    select: { students: true, projects: true, documents: true, deadlines: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(subjects);
    }
    catch (error) {
        console.error('Error fetching subjects:', error);
        res.status(500).json({ error: 'Failed to fetch subjects' });
    }
};
exports.getSubjects = getSubjects;
const createSubject = async (req, res) => {
    try {
        const { name, code, description, revenueINR } = req.body;
        if (!name || !code) {
            return res.status(400).json({ error: 'Name and Code are required' });
        }
        const subject = await index_1.prisma.subject.create({
            data: {
                name,
                code,
                description: description || '',
                revenueINR: Number(revenueINR) || 0,
                revenueGBP: Math.round((Number(revenueINR) || 0) / 100),
            },
        });
        res.status(201).json(subject);
    }
    catch (error) {
        console.error('Error creating subject:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Subject code already exists' });
        }
        res.status(500).json({ error: 'Failed to create subject' });
    }
};
exports.createSubject = createSubject;
const getSubjectDetails = async (req, res) => {
    const { id } = req.params;
    try {
        const subject = await index_1.prisma.subject.findUnique({
            where: { id },
            include: {
                students: true,
                projects: {
                    include: {
                        vendor: true,
                        student: true,
                    },
                },
                deadlines: true,
                documents: true,
            },
        });
        if (!subject)
            return res.status(404).json({ error: 'Subject not found' });
        res.json(subject);
    }
    catch (error) {
        console.error('Error fetching subject details:', error);
        res.status(500).json({ error: 'Failed to fetch subject details' });
    }
};
exports.getSubjectDetails = getSubjectDetails;
const updateSubject = async (req, res) => {
    const { id } = req.params;
    try {
        const { name, code, description, status, revenueINR } = req.body;
        const subject = await index_1.prisma.subject.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(code && { code }),
                ...(description !== undefined && { description }),
                ...(status && { status }),
                ...(revenueINR !== undefined && {
                    revenueINR: Number(revenueINR),
                    revenueGBP: Math.round(Number(revenueINR) / 100)
                }),
            },
        });
        res.json(subject);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update subject' });
    }
};
exports.updateSubject = updateSubject;
const deleteSubject = async (req, res) => {
    const { id } = req.params;
    try {
        await index_1.prisma.subject.delete({ where: { id } });
        res.json({ message: 'Subject deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete subject' });
    }
};
exports.deleteSubject = deleteSubject;
