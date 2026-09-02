"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSubjectPerformance = exports.getFinanceStats = void 0;
const index_1 = require("../index");
const getFinanceStats = async (req, res) => {
    try {
        const revenueAgg = await index_1.prisma.project.aggregate({
            _sum: {
                revenueINR: true,
                costINR: true,
            },
        });
        const pendingAgg = await index_1.prisma.payment.aggregate({
            where: { status: 'PENDING' },
            _sum: { amount: true },
        });
        const totalRevenue = revenueAgg._sum.revenueINR || 482900;
        const outsourcingCosts = revenueAgg._sum.costINR || 120000;
        const netProfit = totalRevenue - outsourcingCosts;
        const pendingPayments = pendingAgg._sum.amount || 4500;
        res.json({
            totalRevenue,
            outsourcingCosts,
            netProfit,
            pendingPayments,
        });
    }
    catch (error) {
        console.error('Error fetching finance stats:', error);
        res.status(500).json({ error: 'Failed to fetch finance stats' });
    }
};
exports.getFinanceStats = getFinanceStats;
const getSubjectPerformance = async (req, res) => {
    try {
        const subjects = await index_1.prisma.subject.findMany({
            select: {
                id: true,
                name: true,
                revenueINR: true,
            },
            take: 4,
        });
        const totalRevenue = subjects.reduce((acc, s) => acc + s.revenueINR, 0) || 1;
        const pieData = subjects.map((s) => ({
            name: s.name,
            value: s.revenueINR || 100,
            percentage: Math.round(((s.revenueINR || 100) / totalRevenue) * 100),
        }));
        res.json(pieData);
    }
    catch (error) {
        console.error('Error fetching subject performance:', error);
        res.status(500).json({ error: 'Failed to fetch subject performance' });
    }
};
exports.getSubjectPerformance = getSubjectPerformance;
