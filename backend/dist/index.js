"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const client_1 = require("@prisma/client");
const dashboard_controller_1 = require("./controllers/dashboard.controller");
const subject_controller_1 = require("./controllers/subject.controller");
const student_controller_1 = require("./controllers/student.controller");
const vendor_controller_1 = require("./controllers/vendor.controller");
const project_controller_1 = require("./controllers/project.controller");
const finance_controller_1 = require("./controllers/finance.controller");
const document_controller_1 = require("./controllers/document.controller");
const report_controller_1 = require("./controllers/report.controller");
const user_controller_1 = require("./controllers/user.controller");
dotenv_1.default.config();
const app = (0, express_1.default)();
exports.app = app;
const prisma = new client_1.PrismaClient();
exports.prisma = prisma;
const PORT = process.env.PORT || 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Basic health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Dashboard Endpoints
app.get('/api/dashboard/stats', dashboard_controller_1.getDashboardStats);
app.get('/api/dashboard/deadlines', dashboard_controller_1.getUpcomingDeadlines);
app.get('/api/dashboard/updates', dashboard_controller_1.getRecentOutsourcingUpdates);
app.get('/api/dashboard/revenue-analytics', dashboard_controller_1.getRevenueAnalytics);
// Subject Endpoints
app.get('/api/subjects', subject_controller_1.getSubjects);
app.post('/api/subjects', subject_controller_1.createSubject);
app.get('/api/subjects/:id', subject_controller_1.getSubjectDetails);
app.put('/api/subjects/:id', subject_controller_1.updateSubject);
app.delete('/api/subjects/:id', subject_controller_1.deleteSubject);
// Student Endpoints
app.get('/api/students', student_controller_1.getStudents);
app.post('/api/students', student_controller_1.createStudent);
app.get('/api/students/:id', student_controller_1.getStudentById);
app.put('/api/students/:id', student_controller_1.updateStudent);
app.delete('/api/students/:id', student_controller_1.deleteStudent);
// Vendor Endpoints
app.get('/api/vendors', vendor_controller_1.getVendors);
app.post('/api/vendors', vendor_controller_1.createVendor);
app.get('/api/vendors/:id', vendor_controller_1.getVendorById);
app.put('/api/vendors/:id', vendor_controller_1.updateVendor);
app.delete('/api/vendors/:id', vendor_controller_1.deleteVendor);
// Project Endpoints
app.get('/api/projects', project_controller_1.getProjects);
app.post('/api/projects', project_controller_1.createProject);
// Finance Endpoints
app.get('/api/finance/stats', finance_controller_1.getFinanceStats);
app.get('/api/finance/subject-performance', finance_controller_1.getSubjectPerformance);
// Document Endpoints
app.get('/api/documents', document_controller_1.getDocuments);
app.post('/api/documents', document_controller_1.createDocument);
app.delete('/api/documents/:id', document_controller_1.deleteDocument);
// Report Endpoints
app.get('/api/reports/analytics', report_controller_1.getReportAnalytics);
// User Profile Endpoints
app.get('/api/users/profile', user_controller_1.getProfile);
app.put('/api/users/profile', user_controller_1.updateProfile);
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
