import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ---------------------------------------------------------------------------
// Auth: attach the JWT and bounce to login on 401
// ---------------------------------------------------------------------------
export const TOKEN_KEY = 'pm_token';
export const USER_KEY = 'pm_user';

export type AuthUser = { id: string; name: string; email: string; role: string };

const safeStorage = {
  get: (k: string) => {
    try { return typeof window !== 'undefined' ? window.localStorage.getItem(k) : null; } catch { return null; }
  },
  set: (k: string, v: string) => {
    try { window.localStorage.setItem(k, v); } catch { /* ignore */ }
  },
  remove: (k: string) => {
    try { window.localStorage.removeItem(k); } catch { /* ignore */ }
  },
};

export const getToken = () => safeStorage.get(TOKEN_KEY);
export const getCurrentUser = (): AuthUser | null => {
  const raw = safeStorage.get(USER_KEY);
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
};
export const clearSession = () => {
  safeStorage.remove(TOKEN_KEY);
  safeStorage.remove(USER_KEY);
};

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const url: string = error.config?.url || '';
    if (error.response?.status === 401 && !url.includes('/auth/login') && typeof window !== 'undefined') {
      clearSession();
      if (window.location.pathname !== '/') window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export const login = async (email: string, password: string) => {
  const { data } = await api.post('/auth/login', { email, password });
  safeStorage.set(TOKEN_KEY, data.token);
  safeStorage.set(USER_KEY, JSON.stringify(data.admin));
  return data.admin as AuthUser;
};

export const getMe = async (): Promise<AuthUser> => (await api.get('/auth/me')).data;

export const changePassword = async (currentPassword: string, newPassword: string) =>
  (await api.post('/auth/change-password', { currentPassword, newPassword })).data;

/** Pull a readable message out of an axios error. */
export const errorMessage = (err: any, fallback = 'Something went wrong') =>
  err?.response?.data?.error || err?.message || fallback;

// ---------------------------------------------------------------------------
// Project workspace: brief, stages, checklist
// ---------------------------------------------------------------------------
export type LinkInput = { url: string; type?: string; label?: string };
export const LINK_TYPES = ['GITHUB', 'GOOGLE_DOC', 'PPT', 'COLAB', 'DATASET', 'DRIVE', 'REPORT', 'OTHER'] as const;

export const updateMscProject = async (id: string, data: any) => (await api.put(`/msc-projects/${id}`, data)).data;
export const addStageTemplate = async (projectId: string, data: any) =>
  (await api.post(`/msc-projects/${projectId}/templates`, data)).data;
export const updateStageTemplate = async (id: string, data: any) => (await api.put(`/templates/${id}`, data)).data;
export const deleteStageTemplate = async (id: string) => (await api.delete(`/templates/${id}`)).data;
export const addTaskTemplate = async (projectId: string, data: any) =>
  (await api.post(`/msc-projects/${projectId}/task-templates`, data)).data;
export const deleteTaskTemplate = async (id: string) => (await api.delete(`/task-templates/${id}`)).data;

// Student workspace
export const getStudentWorkspace = async (id: string) => (await api.get(`/students/${id}/workspace`)).data;
export const addStudentLink = async (studentId: string, link: LinkInput) =>
  (await api.post(`/students/${studentId}/links`, link)).data;
export const addStudentNote = async (studentId: string, content: string) =>
  (await api.post(`/students/${studentId}/notes`, { content })).data;
export const addSubmissionLink = async (submissionId: string, link: LinkInput) =>
  (await api.post(`/submissions/${submissionId}/links`, link)).data;
export const deleteLink = async (id: string) => (await api.delete(`/links/${id}`)).data;
export const deleteNote = async (id: string) => (await api.delete(`/notes/${id}`)).data;
export const setSubmissionDeadline = async (id: string, deadline: string) =>
  (await api.put(`/submissions/${id}/deadline`, { deadline })).data;

// Deliveries
export const getDeliveries = async (params?: { studentId?: string; status?: string; mscProjectId?: string }) =>
  (await api.get('/deliveries', { params })).data;
export const createDelivery = async (data: any) => (await api.post('/deliveries', data)).data;
export const updateDelivery = async (id: string, data: any) => (await api.put(`/deliveries/${id}`, data)).data;
export const deleteDelivery = async (id: string) => (await api.delete(`/deliveries/${id}`)).data;

// Tasks
export const createTask = async (data: any) => (await api.post('/tasks', data)).data;
export const updateTask = async (id: string, data: any) => (await api.put(`/tasks/${id}`, data)).data;
export const deleteTask = async (id: string) => (await api.delete(`/tasks/${id}`)).data;

// Enroll several existing students at once (amount defaults to the last enrolled student's amount)
export const enrollMany = async (
  projectId: string,
  data: { personIds: string[]; agreedAmount?: number; projectTitle?: string; advancePaid?: number }
) => (await api.post(`/msc-projects/${projectId}/enroll-many`, data)).data;

// People (a person can be enrolled in several projects)
export const getPeople = async (search?: string) => (await api.get('/people', { params: { search } })).data;

// Project deliverables (one per project, tracked per student)
export const getProjectDeliverables = async (projectId: string) =>
  (await api.get(`/msc-projects/${projectId}/deliverables`)).data;
export const createProjectDeliverable = async (projectId: string, data: any) =>
  (await api.post(`/msc-projects/${projectId}/deliverables`, data)).data;
export const updateProjectDeliverable = async (id: string, data: any) => (await api.put(`/deliverables/${id}`, data)).data;
export const deleteProjectDeliverable = async (id: string) => (await api.delete(`/deliverables/${id}`)).data;
export const markDeliverableSent = async (id: string, data: { studentIds?: string[]; channel?: string }) =>
  (await api.post(`/deliverables/${id}/mark-sent`, data)).data;

// Expenses / outsourcing
export const updateOutsourcingExpense = async (id: string, data: any) => (await api.put(`/outsourcing/${id}`, data)).data;

// Finance per project & admin split
export const getProjectFinance = async (mscProjectId?: string) =>
  (await api.get('/finance/projects', { params: { mscProjectId } })).data;
export const setProjectSplits = async (projectId: string, splits: { adminId: string; percentage: number }[]) =>
  (await api.put(`/msc-projects/${projectId}/splits`, { splits })).data;

// My work
export const getMyWork = async (scope: 'mine' | 'all' = 'mine') => (await api.get('/my-work', { params: { scope } })).data;

// Agenda
export const getAgenda = async (days = 14) => (await api.get('/agenda', { params: { days } })).data;

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
  personId?: string;
  name?: string;
  mobileNo?: string;
  rollNo?: string;
  email?: string;
  projectTitle?: string;
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
  data: { fileLink?: string; links?: LinkInput[]; submittedByAdminId?: string; deadline?: string; note?: string }
) => {
  const response = await api.put(`/submissions/${id}/file`, data);
  return response.data;
};

export const reviewSubmission = async (
  id: string,
  data: { reviewedByAdminId?: string; action: 'APPROVE' | 'REQUEST_CHANGES'; reviewNotes?: string }
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
  data: { adminId?: string; content: string }
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
  description?: string;
  amount: number;
  status?: 'PAID' | 'UNPAID';
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
