"use client";

import React, { useEffect, useState } from 'react';
import { 
  Wallet, 
  CircleDollarSign, 
  Receipt, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Loader2, 
  X,
  CreditCard,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getFinanceOverview, recordPayment, getProjectFinance } from '@/lib/api';
import Link from 'next/link';

export default function FinancePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'UNPAID' | 'PAID'>('ALL');

  // Modal State for Recording Payment
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState<number>(400);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [projFin, setProjFin] = useState<any>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [res, pf] = await Promise.all([getFinanceOverview(), getProjectFinance()]);
      setData(res);
      setProjFin(pf);
      if (res.studentLedger?.length > 0 && !selectedStudentId) {
        setSelectedStudentId(res.studentLedger[0].studentId);
      }
    } catch (err) {
      console.error('Failed to fetch finance overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedStudentId || !paymentAmount) {
      setErrorMsg('Please select student and enter payment amount.');
      return;
    }

    try {
      setSubmitting(true);
      await recordPayment({
        studentId: selectedStudentId,
        amount: Number(paymentAmount),
        status: 'RECEIVED',
        notes: paymentNotes || 'Payment recorded from finance portal.',
      });

      setShowPaymentModal(false);
      setPaymentAmount(400);
      setPaymentNotes('');
      await fetchData();
    } catch (err: any) {
      console.error('Failed to record payment:', err);
      setErrorMsg(err.response?.data?.error || 'Failed to record payment.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm font-semibold text-slate-500">Loading financial ledger & admin split data...</p>
      </div>
    );
  }

  const summary = data?.summary || {};
  const studentLedger = data?.studentLedger || [];
  
  const filteredLedger = studentLedger.filter((s: any) => {
    if (filter === 'UNPAID') return s.outstandingBalance > 0;
    if (filter === 'PAID') return s.outstandingBalance <= 0;
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Revenue, Payments & Admin Split
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Track paid vs unpaid balances, record stage payments, and view 2-admin split calculations.
          </p>
        </div>
        <button 
          onClick={() => setShowPaymentModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
        >
          <Plus size={20} />
          Record Payment
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6 rounded-2xl space-y-2">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl w-fit">
            <Wallet size={20} />
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Agreed Revenue</p>
          <h3 className="text-2xl font-bold text-slate-900">£{summary.totalAgreedRevenue}</h3>
        </div>

        <div className="glass-card p-6 rounded-2xl space-y-2">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl w-fit">
            <CircleDollarSign size={20} />
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Payments Received</p>
          <h3 className="text-2xl font-bold text-emerald-600">£{summary.totalReceivedPayments}</h3>
        </div>

        <div className="glass-card p-6 rounded-2xl space-y-2">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-xl w-fit">
            <AlertCircle size={20} />
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Outstanding Unpaid Balance</p>
          <h3 className="text-2xl font-bold text-amber-600">£{summary.outstandingBalance}</h3>
        </div>

        <div className="glass-card p-6 rounded-2xl space-y-2">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-xl w-fit">
            <TrendingUp size={20} />
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Net Profit Margin</p>
          <h3 className="text-2xl font-bold text-purple-600">£{summary.netProfit}</h3>
        </div>
      </div>

      {/* Per-project money & admin split */}
      <div className="glass-card p-6 md:p-8 rounded-2xl space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-xl font-bold text-slate-900">Money & admin split by project</h2>
          <p className="text-xs text-slate-500">Each project has its own split. Shares are calculated from money received on that project, and from profit after its expenses.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[860px]">
            <thead>
              <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-wide">
                <th className="px-3 py-2">Project</th>
                <th className="px-3 py-2">Received</th>
                <th className="px-3 py-2">Students owe</th>
                <th className="px-3 py-2">Expenses</th>
                <th className="px-3 py-2">Net profit so far</th>
                <th className="px-3 py-2">If fully paid</th>
                <th className="px-3 py-2">Split (so far → if fully paid)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(projFin?.perProject || []).map((p: any) => (
                <tr key={p.projectId} className="align-top">
                  <td className="px-3 py-3">
                    <Link href={`/subjects/${p.projectId}`} className="font-bold text-slate-900 hover:text-primary">{p.projectName}</Link>
                    <p className="text-xs text-slate-400">{p.students} students</p>
                  </td>
                  <td className="px-3 py-3 font-semibold text-emerald-700">£{p.received.toFixed(2)}</td>
                  <td className="px-3 py-3 text-amber-700">£{p.outstanding.toFixed(2)}</td>
                  <td className="px-3 py-3">
                    £{p.expenses.toFixed(2)}
                    {p.expensesUnpaid > 0 && <p className="text-xs text-amber-700">£{p.expensesUnpaid.toFixed(2)} unpaid</p>}
                  </td>
                  <td className="px-3 py-3 font-semibold text-violet-700">£{p.netProfit.toFixed(2)}</td>
                  <td className="px-3 py-3">
                    <span className="font-bold text-violet-800">£{p.projectedProfit.toFixed(2)}</span>
                    <p className="text-[11px] text-slate-400">£{p.agreedRevenue.toFixed(2)} agreed − expenses</p>
                  </td>
                  <td className="px-3 py-3">
                    {p.splits.length ? (
                      <ul className="space-y-0.5">
                        {p.splits.map((sp: any) => (
                          <li key={sp.adminId} className="text-xs">
                            <span className="font-semibold text-slate-800">{sp.adminName}</span> {sp.percentage}%: £{sp.shareOfProfit.toFixed(2)} → <span className="font-bold text-violet-800">£{sp.shareOfProjectedProfit.toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-xs text-slate-400">No split set</span>
                    )}
                    {p.splits.length > 0 && p.splitTotal !== 100 && <p className="text-xs text-rose-600 font-semibold">Split adds to {p.splitTotal}%</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {projFin?.perAdmin?.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3">Totals per admin (all projects)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {projFin.perAdmin.map((a: any) => (
                <div key={a.adminId} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <p className="text-sm font-bold text-slate-900">{a.adminName}</p>
                  <p className="text-xs text-slate-500 mb-2">{a.projects.map((x: any) => `${x.projectName}: ${x.percentage}%`).join(' · ')}</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Of received</span>
                    <span className="font-semibold">£{a.shareOfReceived.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Profit share so far</span>
                    <span className="font-bold text-violet-700">£{a.shareOfProfit.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">If everyone pays in full</span>
                    <span className="font-bold text-violet-800">£{a.shareOfProjectedProfit.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Student Payment Tracking Table */}
      <div className="glass-card p-8 rounded-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Student Payment Tracking Ledger</h2>
            <p className="text-xs text-slate-500">Requirement #8: Track who paid amount and who has unpaid balance</p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center bg-slate-100 p-1.5 rounded-xl gap-1">
            <button 
              onClick={() => setFilter('ALL')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                filter === 'ALL' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              All Students ({studentLedger.length})
            </button>
            <button 
              onClick={() => setFilter('UNPAID')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                filter === 'UNPAID' ? 'bg-amber-500 text-white shadow' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Unpaid Balance ({studentLedger.filter((s: any) => s.outstandingBalance > 0).length})
            </button>
            <button 
              onClick={() => setFilter('PAID')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                filter === 'PAID' ? 'bg-green-600 text-white shadow' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Fully Paid ({studentLedger.filter((s: any) => s.outstandingBalance <= 0).length})
            </button>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-widest border-b border-slate-200">
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">MSc Project</th>
                <th className="px-6 py-4">Agreed Price</th>
                <th className="px-6 py-4">Total Paid</th>
                <th className="px-6 py-4">Outstanding</th>
                <th className="px-6 py-4">Payment Status</th>
                <th className="px-6 py-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLedger.map((student: any) => (
                <tr key={student.studentId} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{student.studentName}</h4>
                      <p className="text-xs text-slate-400">{student.rollNo} • {student.mobileNo}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-semibold text-slate-700">
                    {student.mscProjectName}
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900 text-sm">
                    £{student.agreedAmount}
                  </td>
                  <td className="px-6 py-4 font-bold text-emerald-600 text-sm">
                    £{student.totalPaid}
                  </td>
                  <td className="px-6 py-4 font-bold text-amber-600 text-sm">
                    £{student.outstandingBalance}
                  </td>
                  <td className="px-6 py-4">
                    {student.isFullyPaid ? (
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full inline-flex items-center gap-1">
                        <CheckCircle2 size={12} /> FULLY PAID
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full inline-flex items-center gap-1">
                        <AlertCircle size={12} /> UNPAID BALANCE
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => {
                        setSelectedStudentId(student.studentId);
                        setShowPaymentModal(true);
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-colors"
                    >
                      + Record Payment
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl space-y-6 my-8"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Record Student Payment</h3>
                  <p className="text-xs text-slate-500">Log incoming installment / stage payment</p>
                </div>
                <button 
                  onClick={() => setShowPaymentModal(false)}
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

              <form onSubmit={handleRecordPayment} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Select Student *</label>
                  <select 
                    required
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                  >
                    {Array.from(new Set<string>(studentLedger.map((s: any) => s.mscProjectName))).map((proj) => (
                      <optgroup key={proj} label={`Project: ${proj}`}>
                        {studentLedger
                          .filter((s: any) => s.mscProjectName === proj)
                          .map((s: any) => (
                            <option key={s.studentId} value={s.studentId}>
                              {s.studentName} — owes £{s.outstandingBalance}
                            </option>
                          ))}
                      </optgroup>
                    ))}
                  </select>
                  {(() => {
                    const sel = studentLedger.find((s: any) => s.studentId === selectedStudentId);
                    return sel ? (
                      <p className="text-xs text-slate-500 mt-1">
                        Goes to project <span className="font-bold text-slate-800">{sel.mscProjectName}</span> · agreed £{sel.agreedAmount}, paid £{sel.totalPaid}
                      </p>
                    ) : null;
                  })()}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Payment Amount (£) *</label>
                  <input 
                    type="number" 
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    placeholder="400"
                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Notes / Reference</label>
                  <textarea 
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="e.g. Stage 2 midpoint payment received via bank transfer."
                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none h-20"
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="flex-1 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-dark shadow-lg shadow-primary/20 disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : 'Record Payment'}
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
