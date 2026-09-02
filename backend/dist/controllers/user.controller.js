"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfile = exports.getProfile = void 0;
const index_1 = require("../index");
const getProfile = async (req, res) => {
    try {
        const user = await index_1.prisma.user.findFirst({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
            },
        });
        if (!user) {
            return res.json({
                id: '1',
                name: 'James Wilson',
                email: 'james@outsourcepro.com',
                role: 'ADMIN',
            });
        }
        res.json(user);
    }
    catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: 'Failed to fetch user profile' });
    }
};
exports.getProfile = getProfile;
const updateProfile = async (req, res) => {
    try {
        const { name, email } = req.body;
        const user = await index_1.prisma.user.findFirst();
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const updatedUser = await index_1.prisma.user.update({
            where: { id: user.id },
            data: {
                ...(name && { name }),
                ...(email && { email }),
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
            },
        });
        res.json(updatedUser);
    }
    catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ error: 'Failed to update user profile' });
    }
};
exports.updateProfile = updateProfile;
