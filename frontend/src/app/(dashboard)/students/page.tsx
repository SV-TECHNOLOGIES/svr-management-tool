"use client";

import React, { useEffect, useState } from 'react';
import { 
  Search, 
  UserPlus, 
  Phone, 
  ChevronRight, 
  Loader2, 
  X,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getStudents, createStudent, getMscProjects } from '@/lib/api';
import Link from 'next/link';

export default function StudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [mscProjects, setMscProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Multi-Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [mscProjectFilter, setMscProjectFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [stageProgressFilter, setStageProgressFilter] = useState('ALL');

  // Selected student for detailed card view modal
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  // Modal State for Student Enrollment
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [form, setForm] = useState({
    mscProjectId: '',
    name: '',
    mobileNo: '',
    rollNo: '',
    projectTitle: '',
    agreedAmount: 2000,
    advancePaid: 400,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [studentData, projectData] = await Promise.all([
        getStudents(),
        getMscProjects(),
      ]);
      setStudents(studentData);
      setMscProjects(projectData);
      if (projectData.length > 0) {
        setForm((prev) => ({ ...prev, mscProjectId: projectData[0].id }));
      }
    } catch (err) {
      console.error('Failed to fetch students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!form.mscProjectId || !form.name || !form.mobileNo || !form.rollNo || !form.projectTitle) {
      setErrorMsg('All fields marked with * are required.');
      return;
    }

    try {
      setSubmitting(true);
      await createStudent({
        mscProjectId: form.mscProjectId,
        name: form.name,
        mobileNo: form.mobileNo,
        rollNo: form.rollNo,
        projectTitle: form.projectTitle,
        agreedAmount: Number(form.agreedAmount),
        advancePaid: Number(form.advancePaid),
      });

      setShowEnrollModal(false);
      setForm({
        mscProjectId: mscProjects[0]?.id || '',
        name: '',
        mobileNo: '',
        rollNo: '',
        projectTitle: '',
        agreedAmount: 2000,
        advancePaid: 400,
      });
      await fetchData();
    } catch (err: any) {
      console.error('Failed to enroll student:', err);
      setErrorMsg(err.response?.data?.error || 'Failed to enroll student');
    } finally {
      setSubmitting(false);
    }
  };

  // Multi-Filter Logic (Status, MSc Project, Paid/Outstanding, Stage Progress)
  const filteredStudents = students.filter((s) => {
    // 1. Search Query
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.projectTitle.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    // 2. Status Filter
    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;

    // 3. MSc Project Filter
    if (mscProjectFilter !== 'ALL' && s.mscProjectId !== mscProjectFilter) return false;

    // 4. Paid / Outstanding Filter
    if (paymentFilter === 'FULLY_PAID' && s.outstandingBalance > 0) return false;
    if (paymentFilter === 'HAS_OUTSTANDING' && s.outstandingBalance <= 0) return false;
    if (paymentFilter === 'ZERO_PAID' && s.totalPaid > 0) return false;

    // 5. Stage Progress Filter
    if (stageProgressFilter === 'NO_STAGES_DONE' && s.completedSubmissions > 0) return false;
    if (
      stageProgressFilter === 'IN_PROGRESS_STAGES' && 
      (s.completedSubmissions === 0 || s.completedSubmissions === s.totalSubmissions)
    ) return false;
    if (
      stageProgressFilter === 'ALL_STAGES_COMPLETED' && 
      (s.completedSubmissions < s.totalSubmissions || s.totalSubmissions === 0)
    ) return false;

    return true;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Enrolled Students Directory
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Student details, negotiated prices, stage progress, and payment status.
          </p>
        </div>
        <button 
          onClick={() => setShowEnrollModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
        >
          <UserPlus size={20} />
          Enroll New Student
        </button>
      </div>

      {/* Multi-Filters Bar (Status, MSc Project, Paid/Outstanding, Stage Progress) */}
      <div className="glass-card p-5 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <Filter size={16} className="text-primary" /> Filter Students Directory
          </h3>
          <div className="text-xs font-semibold text-slate-500">
            Showing {filteredStudents.length} of {students.length} Students
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, roll..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          {/* MSc Project Filter */}
          <div>
            <select
              value={mscProjectFilter}
              onChange={(e) => setMscProjectFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="ALL">All MSc Projects</option>
              {mscProjects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Paid / Outstanding Filter */}
          <div>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="ALL">All Payment States</option>
              <option value="FULLY_PAID">Fully Paid (£0 Due)</option>
              <option value="HAS_OUTSTANDING">Has Outstanding Balance</option>
              <option value="ZERO_PAID">Zero Paid (£0 Advance)</option>
            </select>
          </div>

          {/* Stage Progress Filter */}
          <div>
            <select
              value={stageProgressFilter}
              onChange={(e) => setStageProgressFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="ALL">All Stage Progress</option>
              <option value="NO_STAGES_DONE">No Stages Completed (0)</option>
              <option value="IN_PROGRESS_STAGES">In Progress (1+ Stage Done)</option>
              <option value="ALL_STAGES_COMPLETED">All Stages Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Students High-Density Table */}
      <div className="glass-card overflow-hidden rounded-2xl">
        {loading ? (
          <div className="p-12 flex justify-center items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-sm font-medium text-slate-500">Loading student directory...</span>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No students found matching your selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-widest border-b border-slate-200">
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Roll No & Mobile</th>
                  <th className="px-6 py-4">MSc Project</th>
                  <th className="px-6 py-4">Chosen Topic</th>
                  <th className="px-6 py-4">Agreed Price</th>
                  <th className="px-6 py-4">Paid / Outstanding</th>
                  <th className="px-6 py-4">Stage Progress</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                          {s.name.split(' ').map((n: string) => n[0]).join('')}
                        </div>
                        <div className="font-bold text-slate-900 text-sm">{s.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-700">
                      <div>{s.rollNo}</div>
                      <div className="text-slate-400 font-normal">{s.mobileNo}</div>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-800">
                      {s.mscProjectName}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-700 font-medium max-w-[200px] truncate">
                      {s.projectTitle}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900 text-sm">
                      £{s.agreedAmount}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <span className="font-bold text-emerald-600">£{s.totalPaid}</span>
                      <span className="text-slate-400"> / £{s.outstandingBalance}</span>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-800 font-bold rounded-lg">
                        {s.completedSubmissions} / {s.totalSubmissions} Done
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                        s.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => setSelectedStudent(s)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                      >
                        View Card <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAILED STUDENT CARD MODAL */}
      <AnimatePresence>
        {selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-3xl w-full p-8 shadow-2xl space-y-6 my-8"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                    {selectedStudent.name.split(' ').map((n: string) => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">{selectedStudent.name}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <Phone size={12} /> {selectedStudent.mobileNo} | Roll No: {selectedStudent.rollNo} | {selectedStudent.mscProjectName}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedStudent(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Price & Payment Breakdown */}
              <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Agreed Negotiated Price</p>
                  <p className="text-lg font-bold text-slate-900">£{selectedStudent.agreedAmount}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Total Received Payments</p>
                  <p className="text-lg font-bold text-emerald-600">£{selectedStudent.totalPaid}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Outstanding Balance</p>
                  <p className="text-lg font-bold text-amber-600">£{selectedStudent.outstandingBalance}</p>
                </div>
              </div>

              {/* Chosen Dissertation Topic */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Chosen Dissertation Topic
                </h4>
                <p className="text-sm font-bold text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                  {selectedStudent.projectTitle}
                </p>
              </div>

              {/* Submissions Pipeline Stages */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Submission Lifecycle Stages ({selectedStudent.completedSubmissions} / {selectedStudent.totalSubmissions} Completed)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {selectedStudent.submissions?.map((sub: any) => (
                    <div key={sub.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-800">Stage {sub.order}: {sub.stageName}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase ${
                          sub.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                          sub.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                          sub.status === 'SUBMITTED' || sub.status === 'IN_REVIEW' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-200 text-slate-600'
                        }`}>
                          {sub.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Deadline: {new Date(sub.deadline).toLocaleDateString()}
                      </p>
                      {sub.fileLink && (
                        <a 
                          href={sub.fileLink} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-[11px] font-semibold text-primary hover:underline block truncate"
                        >
                          {sub.fileLink}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <Link
                  href="/documents"
                  className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-dark shadow-md flex items-center gap-1"
                >
                  Go to Submissions Board <ChevronRight size={14} />
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Enroll Student Modal */}
      <AnimatePresence>
        {showEnrollModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl space-y-6 my-8"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Enroll Student into MSc Project</h3>
                  <p className="text-xs text-slate-500">Auto-instantiates submission stages for student</p>
                </div>
                <button 
                  onClick={() => setShowEnrollModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 text-rose-600 text-xs font-semibold rounded-xl">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleEnrollStudent} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Select MSc Project *</label>
                  <select 
                    required
                    value={form.mscProjectId}
                    onChange={(e) => setForm({ ...form, mscProjectId: e.target.value })}
                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {mscProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Range: £{p.amountRangeLow} - £{p.amountRangeHigh})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Student Name *</label>
                  <input 
                    type="text" 
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Alex Turner"
                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Mobile No *</label>
                    <input 
                      type="text" 
                      required
                      value={form.mobileNo}
                      onChange={(e) => setForm({ ...form, mobileNo: e.target.value })}
                      placeholder="+44 7911 123456"
                      className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Roll No *</label>
                    <input 
                      type="text" 
                      required
                      value={form.rollNo}
                      onChange={(e) => setForm({ ...form, rollNo: e.target.value })}
                      placeholder="MSC2026-004"
                      className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Chosen Project Title *</label>
                  <input 
                    type="text" 
                    required
                    value={form.projectTitle}
                    onChange={(e) => setForm({ ...form, projectTitle: e.target.value })}
                    placeholder="e.g. Autonomous Drone Navigation using Reinforcement Learning"
                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Agreed Negotiated Amount (£) *</label>
                    <input 
                      type="number" 
                      required
                      value={form.agreedAmount}
                      onChange={(e) => setForm({ ...form, agreedAmount: Number(e.target.value) })}
                      className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Initial Advance Paid (£)</label>
                    <input 
                      type="number" 
                      value={form.advancePaid}
                      onChange={(e) => setForm({ ...form, advancePaid: Number(e.target.value) })}
                      className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => setShowEnrollModal(false)}
                    className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="flex-1 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-dark shadow-lg shadow-primary/20 disabled:opacity-50"
                  >
                    {submitting ? 'Enrolling...' : 'Enroll Student'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
