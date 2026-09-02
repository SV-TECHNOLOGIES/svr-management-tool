"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProject = exports.getProjects = void 0;
const index_1 = require("../index");
const getProjects = async (req, res) => {
    try {
        const projects = await index_1.prisma.project.findMany({
            include: {
                subject: true,
                student: true,
                vendor: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(projects);
    }
    catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
};
exports.getProjects = getProjects;
const createProject = async (req, res) => {
    try {
        const { title, description, status, deadline, costINR, revenueINR, subjectId, studentId, vendorId } = req.body;
        if (!title || !subjectId) {
            return res.status(400).json({ error: 'Title and Subject ID are required' });
        }
        const project = await index_1.prisma.project.create({
            data: {
                title,
                description: description || '',
                status: status || 'PENDING',
                deadline: deadline ? new Date(deadline) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                costINR: Number(costINR) || 0,
                costGBP: Math.round((Number(costINR) || 0) / 100),
                revenueINR: Number(revenueINR) || 0,
                revenueGBP: Math.round((Number(revenueINR) || 0) / 100),
                subjectId,
                studentId: studentId || null,
                vendorId: vendorId || null,
            },
            include: {
                subject: true,
                student: true,
                vendor: true,
            },
        });
        res.status(201).json(project);
    }
    catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ error: 'Failed to create project' });
    }
};
exports.createProject = createProject;
