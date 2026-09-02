"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteStudent = exports.updateStudent = exports.getStudentById = exports.createStudent = exports.getStudents = void 0;
const index_1 = require("../index");
const getStudents = async (req, res) => {
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
        const students = await index_1.prisma.student.findMany({
            where: whereClause,
            include: {
                _count: {
                    select: { subjects: true, projects: true, payments: true, documents: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(students);
    }
    catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ error: 'Failed to fetch students' });
    }
};
exports.getStudents = getStudents;
const createStudent = async (req, res) => {
    try {
        const { name, email, phone, status } = req.body;
        if (!name || !email) {
            return res.status(400).json({ error: 'Name and Email are required' });
        }
        const student = await index_1.prisma.student.create({
            data: {
                name,
                email,
                phone: phone || '',
                status: status || 'ACTIVE',
            },
        });
        res.status(201).json(student);
    }
    catch (error) {
        console.error('Error creating student:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Student with this email already exists' });
        }
        res.status(500).json({ error: 'Failed to create student' });
    }
};
exports.createStudent = createStudent;
const getStudentById = async (req, res) => {
    const { id } = req.params;
    try {
        const student = await index_1.prisma.student.findUnique({
            where: { id },
            include: {
                subjects: true,
                projects: true,
                payments: true,
                documents: true,
            },
        });
        if (!student)
            return res.status(404).json({ error: 'Student not found' });
        res.json(student);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch student' });
    }
};
exports.getStudentById = getStudentById;
const updateStudent = async (req, res) => {
    const { id } = req.params;
    try {
        const { name, email, phone, status } = req.body;
        const student = await index_1.prisma.student.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(email && { email }),
                ...(phone !== undefined && { phone }),
                ...(status && { status }),
            },
        });
        res.json(student);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update student' });
    }
};
exports.updateStudent = updateStudent;
const deleteStudent = async (req, res) => {
    const { id } = req.params;
    try {
        await index_1.prisma.student.delete({ where: { id } });
        res.json({ message: 'Student deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete student' });
    }
};
exports.deleteStudent = deleteStudent;
