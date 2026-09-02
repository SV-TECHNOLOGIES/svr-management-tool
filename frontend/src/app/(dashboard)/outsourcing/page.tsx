"use client";

import React, { useEffect, useState } from 'react';
import { 
  ExternalLink, 
  Plus, 
  CircleDollarSign, 
  UserCheck, 
  Layers, 
  Loader2, 
  X,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getOutsourcingExpenses, 
  createOutsourcingExpense, 
  deleteOutsourcingExpense, 
  getMscProjects, 
  getStudents 
} from '@/lib/api';

export default function OutsourcingPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [totalOutsourcing, setTotalOutsourcing] = useState(0);
  const [mscProjects, setMscProjects] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scopeFilter, setScopeFilter] = useState<'ALL' | 'STUDENT' | 'PROJECT_WIDE'>('ALL');

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [form, setForm] = useState({
    mscProjectId: '',
    studentId: '', // Empty for project-wide
    paidTo: '',
    description: '',
    amount: 150,
    notes: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [outData, projData, studData] = await Promise.all([
        getOutsourcingExpenses(),
        getMscProjects(),
        getStudents(),
      ]);
      setExpenses(outData.expenses || []);
      setTotalOutsourcing(outData.totalOutsourcing || 0);
      setMscProjects(projData);
      setStudents(studData);
      if (projData.length > 0) {
        setForm((prev) => ({ ...prev, mscProjectId: projData[0].id }));
      }
    } catch (err) {
      console.error('Failed to fetch outsourcing data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!form.mscProjectId || !form.paidTo || !form.description || !form.amount) {
      setErrorMsg('mscProjectId, paidTo, description, and amount are required.');
      return;
    }

    try {
      setSubmitting(true);
      await createOutsourcingExpense({
        mscProjectId: form.mscProjectId,
        studentId: form.studentId || undefined,
        paidTo: form.paidTo,
        description: form.description,
        amount: Number(form.amount),
        notes: form.notes,
      });

      setShowAddModal(false);
      setForm({
        mscProjectId: mscProjects[0]?.id || '',
        studentId: '',
        paidTo: '',
        description: '',
        amount: 150,
        notes: '',
      });
      await fetchData();
    } catch (err: any) {
      console.error('Failed to create outsourcing expense:', err);
      setErrorMsg(err.response?.data?.error || 'Failed to record expense.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Are you sure you want to delete this outsourcing record?')) return;
    try {
      await deleteOutsourcingExpense(id);
      await fetchData();
    } catch (err) {
      console.error('Failed to delete outsourcing record:', err);
    }
  };

  const filteredExpenses = expenses.filter((e) => {
    if (scopeFilter === 'STUDENT') return Boolean(e.studentId);
    if (scopeFilter === 'PROJECT_WIDE') return !e.studentId;
    return true;
  });

  const studentScopedTotal = expenses
    .filter((e) => Boolean(e.studentId))
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const projectWideTotal = expenses
    .filter((e) => !e.studentId)
    .reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Outsourcing & Expense Tracking
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Requirement #9: Track outsourcing expenses per student & project-wide.
          </p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
        >
          <Plus size={20} />
          Log Outsourcing Expense
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-2xl space-y-2">
          <div className="p-3 bg-rose-100 text-rose-600 rounded-xl w-fit">
            <CircleDollarSign size={20} />
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Project Outsourcing Cost</p>
          <h3 className="text-2xl font-bold text-slate-900">£{totalOutsourcing}</h3>
        </div>

        <div className="glass-card p-6 rounded-2xl space-y-2">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl w-fit">
            <UserCheck size={20} />
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Per-Student Direct Expenses</p>
          <h3 className="text-2xl font-bold text-blue-600">£{studentScopedTotal}</h3>
        </div>

        <div className="glass-card p-6 rounded-2xl space-y-2">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-xl w-fit">
            <Layers size={20} />
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Shared Project-Wide Expenses</p>
          <h3 className="text-2xl font-bold text-purple-600">£{projectWideTotal}</h3>
        </div>
      </div>

      {/* Main Expense Table Card */}
      <div className="glass-card p-8 rounded-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Outsourcing Expense Log</h2>
            <p className="text-xs text-slate-500">Breakdown of freelancer payouts, GPU compute, and software licenses</p>
          </div>

          {/* Scope Filters */}
          <div className="flex items-center bg-slate-100 p-1.5 rounded-xl gap-1">
            <button 
              onClick={() => setScopeFilter('ALL')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                scopeFilter === 'ALL' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              All Expenses ({expenses.length})
            </button>
            <button 
              onClick={() => setScopeFilter('STUDENT')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                scopeFilter === 'STUDENT' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Per Student
            </button>
            <button 
              onClick={() => setScopeFilter('PROJECT_WIDE')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                scopeFilter === 'PROJECT_WIDE' ? 'bg-purple-600 text-white shadow' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Project-Wide Shared
            </button>
          </div>
        </div>

        {/* Expense Table */}
        {loading ? (
          <div className="p-12 flex justify-center items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-sm font-medium text-slate-500">Loading outsourcing log...</span>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No outsourcing expenses logged under this filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-widest border-b border-slate-200">
                  <th className="px-6 py-4">Paid To / Vendor</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Scope</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.map((exp: any) => (
                  <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 text-sm">{exp.paidTo}</div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-700 font-medium">
                      {exp.description}
                    </td>
                    <td className="px-6 py-4">
                      {exp.student ? (
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg">
                          Student: {exp.student.name} ({exp.student.rollNo})
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-lg">
                          PROJECT-WIDE SHARED
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-bold text-rose-600 text-sm">
                      £{exp.amount}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {new Date(exp.paidAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Outsourcing Expense Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl space-y-6 my-8"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Log Outsourcing Expense</h3>
                  <p className="text-xs text-slate-500">Record cost for freelancer or project subscription</p>
                </div>
                <button 
                  onClick={() => setShowAddModal(false)}
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

              <form onSubmit={handleCreateExpense} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">MSc Project *</label>
                  <select 
                    required
                    value={form.mscProjectId}
                    onChange={(e) => setForm({ ...form, mscProjectId: e.target.value })}
                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                  >
                    {mscProjects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Attributed Student (Optional)</label>
                  <select 
                    value={form.studentId}
                    onChange={(e) => setForm({ ...form, studentId: e.target.value })}
                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                  >
                    <option value="">None — Project-Wide Shared Cost</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.rollNo})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Paid To (Freelancer / Vendor) *</label>
                  <input 
                    type="text" 
                    required
                    value={form.paidTo}
                    onChange={(e) => setForm({ ...form, paidTo: e.target.value })}
                    placeholder="e.g. RunPod GPU Cloud"
                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Description *</label>
                  <input 
                    type="text" 
                    required
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="e.g. GPU compute for Model Training"
                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Amount (£) *</label>
                  <input 
                    type="number" 
                    required
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                    placeholder="150"
                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Notes</label>
                  <textarea 
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Additional details..."
                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none h-20"
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="flex-1 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-dark shadow-lg shadow-primary/20 disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : 'Save Expense'}
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
