"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDocument = exports.createDocument = exports.getDocuments = void 0;
const index_1 = require("../index");
const getDocuments = async (req, res) => {
    try {
        const { search } = req.query;
        const whereClause = search
            ? { name: { contains: String(search), mode: 'insensitive' } }
            : {};
        const documents = await index_1.prisma.document.findMany({
            where: whereClause,
            include: {
                subject: true,
                student: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(documents);
    }
    catch (error) {
        console.error('Error fetching documents:', error);
        res.status(500).json({ error: 'Failed to fetch documents' });
    }
};
exports.getDocuments = getDocuments;
const createDocument = async (req, res) => {
    try {
        const { name, url, size, type, subjectId, studentId } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Document name is required' });
        }
        const document = await index_1.prisma.document.create({
            data: {
                name,
                url: url || `/documents/${name}`,
                size: Number(size) || 1024000,
                type: type || 'PDF',
                subjectId: subjectId || null,
                studentId: studentId || null,
            },
        });
        res.status(201).json(document);
    }
    catch (error) {
        console.error('Error creating document:', error);
        res.status(500).json({ error: 'Failed to create document' });
    }
};
exports.createDocument = createDocument;
const deleteDocument = async (req, res) => {
    const { id } = req.params;
    try {
        await index_1.prisma.document.delete({ where: { id } });
        res.json({ message: 'Document deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete document' });
    }
};
exports.deleteDocument = deleteDocument;
