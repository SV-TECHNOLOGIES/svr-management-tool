import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Admins
export const getAdmins = async () => {
  const response = await api.get('/admins');
  return response.data;
};

// MSc Projects
export const getMscProjects = async () => {
  const response = await api.get('/msc-projects');
  return response.data;
};

export const getMscProjectById = async (id: string) => {
  const response = await api.get(`/msc-projects/${id}`);
  return response.data;
};

export const createMscProject = async (data: any) => {
  const response = await api.post('/msc-projects', data);
  return response.data;
};

// Students
export const getStudents = async (params?: { mscProjectId?: string; status?: string }) => {
  const response = await api.get('/students', { params });
  return response.data;
};

export const createStudent = async (data: {
  mscProjectId: string;
  name: string;
  mobileNo: string;
  rollNo: string;
  projectTitle: string;
  agreedAmount: number;
  advancePaid?: number;
  recordedByAdminId?: string;
}) => {
  const response = await api.post('/students', data);
  return response.data;
};

export const getStudentById = async (id: string) => {
  const response = await api.get(`/students/${id}`);
  return response.data;
};

export const updateStudent = async (id: string, data: any) => {
  const response = await api.put(`/students/${id}`, data);
  return response.data;
};

export const deleteStudent = async (id: string) => {
  const response = await api.delete(`/students/${id}`);
  return response.data;
};

// Submissions Lifecycle
export const updateSubmissionFile = async (
  id: string,
  data: { fileLink: string; submittedByAdminId?: string; deadline?: string }
) => {
  const response = await api.put(`/submissions/${id}/file`, data);
  return response.data;
};

export const reviewSubmission = async (
  id: string,
  data: { reviewedByAdminId: string; action: 'APPROVE' | 'REQUEST_CHANGES'; reviewNotes?: string }
) => {
  const response = await api.put(`/submissions/${id}/review`, data);
  return response.data;
};

export const updateShareStatus = async (
  id: string,
  data: { sharedWithStudent: boolean }
) => {
  const response = await api.put(`/submissions/${id}/share`, data);
  return response.data;
};

export const recordStudentFeedback = async (
  id: string,
  data: { studentFeedback: string }
) => {
  const response = await api.put(`/submissions/${id}/feedback`, data);
  return response.data;
};

export const updateSubmissionStatus = async (
  id: string,
  data: { status: string }
) => {
  const response = await api.put(`/submissions/${id}/status`, data);
  return response.data;
};

export const addSubmissionNote = async (
  id: string,
  data: { adminId: string; content: string }
) => {
  const response = await api.post(`/submissions/${id}/notes`, data);
  return response.data;
};

export const getSubmissionNotes = async (id: string) => {
  const response = await api.get(`/submissions/${id}/notes`);
  return response.data;
};

// Finance & Payments
export const getFinanceOverview = async (mscProjectId?: string) => {
  const response = await api.get('/finance/overview', { params: { mscProjectId } });
  return response.data;
};

export const recordPayment = async (data: {
  studentId: string;
  submissionId?: string;
  amount: number;
  status?: string;
  notes?: string;
  recordedByAdminId?: string;
}) => {
  const response = await api.post('/finance/payments', data);
  return response.data;
};

export const updatePayment = async (id: string, data: any) => {
  const response = await api.put(`/finance/payments/${id}`, data);
  return response.data;
};

// Outsourcing Expenses
export const getOutsourcingExpenses = async (params?: { mscProjectId?: string; studentId?: string }) => {
  const response = await api.get('/outsourcing', { params });
  return response.data;
};

export const createOutsourcingExpense = async (data: {
  mscProjectId: string;
  studentId?: string;
  paidTo: string;
  description: string;
  amount: number;
  notes?: string;
  recordedByAdminId?: string;
}) => {
  const response = await api.post('/outsourcing', data);
  return response.data;
};

export const deleteOutsourcingExpense = async (id: string) => {
  const response = await api.delete(`/outsourcing/${id}`);
  return response.data;
};

// Dashboard Stats
export const getDashboardStats = async () => {
  const response = await api.get('/dashboard/stats');
  return response.data;
};

export const getUpcomingDeadlines = async () => {
  const response = await api.get('/dashboard/deadlines');
  return response.data;
};

export const getRecentUpdates = async () => {
  const response = await api.get('/dashboard/updates');
  return response.data;
};

// Legacy compatibility stubs
export const getSubjects = getMscProjects;
export const getSubjectDetails = getMscProjectById;
export const createSubject = createMscProject;
export const getVendors = getOutsourcingExpenses;
export const createVendor = createOutsourcingExpense;
export const getProjects = getStudents;
export const createProject = createStudent;
export const getFinanceStats = getFinanceOverview;
export const getSubjectPerformance = getMscProjects;
export const getDocuments = getStudents;
export const createDocument = createStudent;
export const getReportAnalytics = getDashboardStats;
export const getUserProfile = getAdmins;
export const updateUserProfile = async (data: any) => data;

export default api;
