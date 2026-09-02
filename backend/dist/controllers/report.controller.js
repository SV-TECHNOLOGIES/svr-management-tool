"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReportAnalytics = void 0;
const index_1 = require("../index");
const getReportAnalytics = async (req, res) => {
    try {
        const totalProjects = await index_1.prisma.project.count();
        const activeProjects = await index_1.prisma.project.count({ where: { status: 'ACTIVE' } });
        const totalStudents = await index_1.prisma.student.count();
        const totalVendors = await index_1.prisma.vendor.count();
        res.json({
            reportsGenerated: totalProjects + 150,
            activeMonitors: activeProjects + 5,
            scheduled: 5,
            dataQuality: '99.8%',
            metrics: {
                students: totalStudents,
                vendors: totalVendors,
                projects: totalProjects,
            },
        });
    }
    catch (error) {
        console.error('Error fetching report analytics:', error);
        res.status(500).json({ error: 'Failed to fetch report analytics' });
    }
};
exports.getReportAnalytics = getReportAnalytics;
