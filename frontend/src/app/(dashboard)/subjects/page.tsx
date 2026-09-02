"use client";

import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Layers, 
  Loader2, 
  X,
  FileText,
  Trash2,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMscProjects, createMscProject, getAdmins } from '@/lib/api';

export default function MscProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected project for detailed card modal
  const [selectedProj, setSelectedProj] = useState<any>(null);

  // Modal state for creating MSc Project (2-step wizard)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const defaultTemplates = [
    { name: 'Proposal & Literature Review', order: 1, isFinal: false, deadlineOffsetDays: 14, paymentPercentage: 20, templateFileUrl: '' },
    { name: 'Midpoint Progress & Model Implementation', order: 2, isFinal: false, deadlineOffsetDays: 35, paymentPercentage: 30, templateFileUrl: '' },
    { name: 'Final Thesis & Code Repository', order: 3, isFinal: true, deadlineOffsetDays: 60, paymentPercentage: 50, templateFileUrl: '' },
  ];

  const [form, setForm] = useState({
    name: '',
    description: '',
    amountRangeLow: 1500,
    amountRangeHigh: 2500,
    currency: 'GBP',
    adminSplit1: 50,
    adminId1: '',
    adminId2: '',
    templates: defaultTemplates,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [projData, adminData] = await Promise.all([
        getMscProjects(),
        getAdmins(),
      ]);
      setProjects(projData);
      setAdmins(adminData);
      if (adminData.length >= 2) {
        setForm((prev) => ({
          ...prev,
          adminId1: adminData[0].id,
          adminId2: adminData[1].id,
        }));
      }
    } catch (err) {
      console.error('Failed to fetch MSc projects data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openModal = () => {
    setStep(1);
    setErrorMsg('');
    setShowCreateModal(true);
  };

  // Add new submission stage template dynamically
  const handleAddTemplate = () => {
    const nextOrder = form.templates.length + 1;
    setForm((prev) => ({
      ...prev,
      templates: [
        ...prev.templates,
        {
          name: `Submission Stage ${nextOrder}`,
          order: nextOrder,
          isFinal: false,
          deadlineOffsetDays: 14,
          paymentPercentage: 0,
          templateFileUrl: '',
        },
      ],
    }));
  };

  // Remove submission stage template
  const handleRemoveTemplate = (indexToRemove: number) => {
    if (form.templates.length <= 1) return;
    const updated = form.templates
      .filter((_, idx) => idx !== indexToRemove)
      .map((t, idx) => ({ ...t, order: idx + 1 }));
    setForm({ ...form, templates: updated });
  };

  // Update specific template property
  const updateTemplate = (index: number, key: string, value: any) => {
    const updated = [...form.templates];
    updated[index] = { ...updated[index], [key]: value };
    setForm({ ...form, templates: updated });
  };

  // Step 1 -> Step 2 validation
  const handleNextStep = () => {
    setErrorMsg('');
    if (!form.name.trim()) {
      setErrorMsg('MSc Project Name is required.');
      return;
    }
    if (form.amountRangeLow >= form.amountRangeHigh) {
      setErrorMsg('Acceptable Price Min must be strictly less than Max.');
      return;
    }
    setStep(2);
  };

  // Final Form Submission
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!form.name.trim()) {
      setErrorMsg('MSc Project Name is required.');
      return;
    }

    if (form.templates.length === 0) {
      setErrorMsg('At least 1 submission stage template is required.');
      return;
    }

    const totalPaymentPercentage = form.templates.reduce(
      (sum, t) => sum + Number(t.paymentPercentage || 0),
      0
    );

    if (totalPaymentPercentage !== 100) {
      setErrorMsg(
        `Submission template payment percentages must sum to 100% (Currently ${totalPaymentPercentage}%).`
      );
      return;
    }

    try {
      setSubmitting(true);
      const split1 = Number(form.adminSplit1);
      const split2 = 100 - split1;
      const adminSplits = [
        { adminId: form.adminId1 || admins[0]?.id, percentage: split1 },
        { adminId: form.adminId2 || admins[1]?.id || admins[0]?.id, percentage: split2 },
      ].filter((as) => as.adminId);

      await createMscProject({
        name: form.name,
        description: form.description,
        amountRangeLow: Number(form.amountRangeLow),
        amountRangeHigh: Number(form.amountRangeHigh),
        currency: form.currency,
        adminSplits,
        submissionTemplates: form.templates,
      });

      setShowCreateModal(false);
      setForm({
        name: '',
        description: '',
        amountRangeLow: 1500,
        amountRangeHigh: 2500,
        currency: 'GBP',
        adminSplit1: 50,
        adminId1: admins[0]?.id || '',
        adminId2: admins[1]?.id || '',
        templates: defaultTemplates,
      });
      await fetchData();
    } catch (err: any) {
      console.error('Failed to create MSc Project:', err);
      setErrorMsg(err.response?.data?.error || 'Failed to create MSc Project');
    } finally {
      setSubmitting(false);
    }
  };

  const currentTotalPaymentPercentage = form.templates.reduce(
    (sum, t) => sum + Number(t.paymentPercentage || 0),
    0
  );

  const admin1Share = Number(form.adminSplit1);
  const admin2Share = 100 - admin1Share;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            MSc Umbrella Projects & Templates
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Define MSc Project templates, price ranges, admin revenue splits, and submission stage rules.
          </p>
        </div>
        <button 
          onClick={openModal}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
        >
          <Plus size={20} />
          Create MSc Project
        </button>
      </div>

      {/* MSc Projects High-Density Table */}
      <div className="glass-card overflow-hidden rounded-2xl">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen size={20} className="text-primary" /> Master Projects Directory
          </h2>
          <span className="text-xs font-semibold text-slate-500">
            Total Projects: {projects.length}
          </span>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-sm font-medium text-slate-500">Loading MSc Projects...</span>
          </div>
        ) : projects.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No MSc Projects created yet. Click "Create MSc Project" to define your first umbrella project.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-widest border-b border-slate-200">
                  <th className="px-6 py-4">MSc Project Name</th>
                  <th className="px-6 py-4">Project Status</th>
                  <th className="px-6 py-4">Acceptable Price Range</th>
                  <th className="px-6 py-4">Enrolled Students</th>
                  <th className="px-6 py-4">Submission Stages</th>
                  <th className="px-6 py-4">Admin Revenue Split</th>
                  <th className="px-6 py-4">Total Revenue</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projects.map((proj) => (
                  <tr key={proj.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{proj.name}</h4>
                        <p className="text-xs text-slate-400 line-clamp-1">{proj.description || 'No description'}</p>
                      </div>
                    </td>
                    {/* Project Status Column (Dynamic based on student completion state) */}
                    <td className="px-6 py-4">
                      {proj.status === 'COMPLETED' ? (
                        <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                          COMPLETED (All {proj.studentCount} Finished)
                        </span>
                      ) : proj.status === 'IN_PROGRESS' ? (
                        <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                          IN PROGRESS ({proj.completedStudentCount}/{proj.studentCount} Finished)
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                          PENDING ENROLLMENT
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800 text-xs">
                      £{proj.amountRangeLow} - £{proj.amountRangeHigh}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-primary/10 text-primary font-bold text-xs rounded-full">
                        {proj.studentCount} Students
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-slate-100 text-slate-700 font-bold text-xs rounded-lg">
                        {proj.submissionTemplates?.length || 0} Stages
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {proj.adminSplits?.map((as: any) => (
                        <span key={as.id} className="mr-2 font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          {as.adminName}: <strong>{as.percentage}%</strong>
                        </span>
                      ))}
                    </td>
                    <td className="px-6 py-4 font-bold text-emerald-600 text-sm">
                      £{proj.totalAgreedRevenue}
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => setSelectedProj(proj)}
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

      {/* DETAILED PROJECT CARD MODAL */}
      <AnimatePresence>
        {selectedProj && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-3xl w-full p-8 shadow-2xl space-y-6 my-8"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-bold text-slate-900">{selectedProj.name}</h3>
                    <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                      selectedProj.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                      selectedProj.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {selectedProj.status === 'COMPLETED' ? `COMPLETED (${selectedProj.studentCount} Finished)` :
                       selectedProj.status === 'IN_PROGRESS' ? `IN PROGRESS (${selectedProj.completedStudentCount}/${selectedProj.studentCount})` :
                       'PENDING ENROLLMENT'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{selectedProj.description}</p>
                </div>
                <button 
                  onClick={() => setSelectedProj(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Price & Revenue Pills */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-700">
                  Acceptable Range: £{selectedProj.amountRangeLow} - £{selectedProj.amountRangeHigh}
                </div>
                <div className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold">
                  Agreed Revenue: £{selectedProj.totalAgreedRevenue}
                </div>
                <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold">
                  Received Payments: £{selectedProj.totalReceivedPayments}
                </div>
              </div>

              {/* Submission Stage Templates */}
              <div>
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Layers size={16} className="text-primary" /> Defined Submission Stage Templates ({selectedProj.submissionTemplates?.length || 0} Stages)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {selectedProj.submissionTemplates?.map((st: any) => (
                    <div key={st.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] font-bold">
                          Stage {st.order}
                        </span>
                        {st.isFinal && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded">
                            FINAL
                          </span>
                        )}
                      </div>
                      <h5 className="font-bold text-slate-900 text-sm">{st.name}</h5>
                      <p className="text-xs text-slate-600">Payment: {st.paymentPercentage}% | Offset: {st.deadlineOffsetDays} days</p>
                      {st.templateFileUrl && (
                        <a href={st.templateFileUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary hover:underline block truncate">
                          Template File Link
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Admin Split */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-700 uppercase mr-2">Admin Revenue Splits:</span>
                  {selectedProj.adminSplits?.map((as: any) => (
                    <span key={as.id} className="mr-3 font-semibold text-slate-800 bg-white px-2.5 py-1 rounded border border-slate-200">
                      {as.adminName}: {as.percentage}%
                    </span>
                  ))}
                </div>
                <span className="font-bold text-slate-900">
                  Outsourcing Cost: £{selectedProj.totalOutsourcingCost} | Net Profit: £{selectedProj.netProfit}
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2-STAGE COMPACT CREATE MSC PROJECT MODAL WITH DUAL-KNOB SLIDER */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8 border border-slate-100"
            >
              {/* Modal Header & Progress Indicator */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full uppercase ${
                      step === 1 ? 'bg-primary text-white' : 'bg-green-100 text-green-700'
                    }`}>
                      Stage {step} of 2
                    </span>
                    <h3 className="text-xl font-bold text-slate-900">
                      {step === 1 ? 'General & Revenue Setup' : 'Submission Stage Templates'}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {step === 1 ? 'Project name, dual-knob price slider & admin split slider' : 'Define submission stages (>6 supported) & deadlines'}
                  </p>
                </div>
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: step === 1 ? '50%' : '100%' }}
                />
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 text-rose-600 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <AlertTriangle size={16} /> {errorMsg}
                </div>
              )}

              {/* STAGE 1: GENERAL & REVENUE DETAILS (WITH DUAL-KNOB SLIDER) */}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase">MSc Project Name *</label>
                    <input 
                      type="text" 
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. MSc Cyber Security & AI Thesis 2026"
                      className="w-full mt-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase">Description</label>
                    <textarea 
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="General project details & requirements..."
                      className="w-full mt-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 h-20"
                    />
                  </div>

                  {/* Dual-Knob Acceptable Price Range Slider */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-700 uppercase">
                        Acceptable Price Range (Dual-Knob Slider)
                      </h4>
                      <span className="text-xs font-bold text-primary px-3 py-1 bg-white border border-slate-200 rounded-lg">
                        £{form.amountRangeLow} — £{form.amountRangeHigh}
                      </span>
                    </div>

                    <div className="pt-2 pb-1 relative">
                      <div className="relative w-full h-8 flex items-center">
                        {/* Base Track */}
                        <div className="absolute w-full h-2 bg-slate-200 rounded-lg" />
                        
                        {/* Active Filled Track between Min and Max Knobs */}
                        <div 
                          className="absolute h-2 bg-primary rounded-lg"
                          style={{
                            left: `${((form.amountRangeLow - 500) / (10000 - 500)) * 100}%`,
                            width: `${((form.amountRangeHigh - form.amountRangeLow) / (10000 - 500)) * 100}%`,
                          }}
                        />

                        {/* Min Knob Slider */}
                        <input 
                          type="range" 
                          min="500" 
                          max="10000" 
                          step="100"
                          value={form.amountRangeLow}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            if (val < form.amountRangeHigh) {
                              setForm({ ...form, amountRangeLow: val });
                            }
                          }}
                          className="absolute w-full appearance-none bg-transparent pointer-events-none z-10 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer"
                        />

                        {/* Max Knob Slider */}
                        <input 
                          type="range" 
                          min="500" 
                          max="10000" 
                          step="100"
                          value={form.amountRangeHigh}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            if (val > form.amountRangeLow) {
                              setForm({ ...form, amountRangeHigh: val });
                            }
                          }}
                          className="absolute w-full appearance-none bg-transparent pointer-events-none z-20 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer"
                        />
                      </div>

                      <div className="flex justify-between text-[11px] text-slate-400 font-medium px-1">
                        <span>£500 (Min)</span>
                        <span>£10,000 (Max)</span>
                      </div>
                    </div>
                  </div>

                  {/* Admin Revenue Split Single Slider */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-700 uppercase">Admin Revenue Split Slider</h4>
                      <span className="text-xs font-bold text-emerald-700 px-3 py-1 bg-emerald-50 rounded-lg">
                        Total: 100%
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-blue-700">{admins[0]?.name || 'Admin 1'}: {admin1Share}%</span>
                        <span className="text-purple-700">{admins[1]?.name || 'Admin 2'}: {admin2Share}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        step="5"
                        value={form.adminSplit1}
                        onChange={(e) => setForm({ ...form, adminSplit1: Number(e.target.value) })}
                        className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>0% / 100%</span>
                        <span>50% / 50%</span>
                        <span>100% / 0%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-3 border-t border-slate-100">
                    <button 
                      type="button" 
                      onClick={() => setShowCreateModal(false)}
                      className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button 
                      type="button" 
                      onClick={handleNextStep}
                      className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-dark shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                    >
                      Next: Submission Stages <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* STAGE 2: SUBMISSION STAGE TEMPLATES */}
              {step === 2 && (
                <form onSubmit={handleCreateProject} className="space-y-4">
                  {/* Total Payment % Summary Header */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <span className="font-bold text-slate-700">Total Submission Stages: {form.templates.length}</span>
                    <span className={`px-3 py-1 rounded-lg font-bold ${
                      currentTotalPaymentPercentage === 100 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      Payment Total: {currentTotalPaymentPercentage}% / 100%
                    </span>
                  </div>

                  {/* Scrollable Stage Templates List */}
                  <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-2">
                    {form.templates.map((st, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 relative group">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 bg-white border border-slate-200 px-2.5 py-0.5 rounded-md">
                            Stage {st.order}
                          </span>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={st.isFinal}
                                onChange={(e) => updateTemplate(idx, 'isFinal', e.target.checked)}
                                className="rounded text-primary focus:ring-primary"
                              />
                              Is Final Thesis Stage
                            </label>

                            {form.templates.length > 1 && (
                              <button 
                                type="button" 
                                onClick={() => handleRemoveTemplate(idx)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-200 transition-colors"
                                title="Remove Stage"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="md:col-span-1">
                            <label className="text-[11px] font-semibold text-slate-500">Stage Name *</label>
                            <input 
                              type="text" 
                              required
                              placeholder="e.g. Proposal"
                              value={st.name}
                              onChange={(e) => updateTemplate(idx, 'name', e.target.value)}
                              className="w-full mt-0.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-slate-500">Deadline (Days Offset) *</label>
                            <input 
                              type="number" 
                              required
                              placeholder="Days e.g. 14"
                              value={st.deadlineOffsetDays}
                              onChange={(e) => updateTemplate(idx, 'deadlineOffsetDays', Number(e.target.value))}
                              className="w-full mt-0.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-slate-500">Payment Due (%) *</label>
                            <input 
                              type="number" 
                              required
                              placeholder="e.g. 20"
                              value={st.paymentPercentage}
                              onChange={(e) => updateTemplate(idx, 'paymentPercentage', Number(e.target.value))}
                              className="w-full mt-0.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-slate-500">
                            Blank Template Link / File URL <span className="text-slate-400 font-normal">(Optional)</span>
                          </label>
                          <input 
                            type="text" 
                            placeholder="https://drive.google.com/... (Optional)"
                            value={st.templateFileUrl || ''}
                            onChange={(e) => updateTemplate(idx, 'templateFileUrl', e.target.value)}
                            className="w-full mt-0.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Stage Button */}
                  <button 
                    type="button" 
                    onClick={handleAddTemplate}
                    className="w-full py-2.5 border-2 border-dashed border-primary/40 hover:border-primary bg-primary/5 hover:bg-primary/10 text-primary font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    <Plus size={16} /> Add Submission Stage (Stage {form.templates.length + 1})
                  </button>

                  <div className="flex gap-3 pt-3 border-t border-slate-100">
                    <button 
                      type="button" 
                      onClick={() => setStep(1)}
                      className="py-2.5 px-5 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50 flex items-center gap-2"
                    >
                      <ArrowLeft size={16} /> Back
                    </button>
                    <button 
                      type="submit" 
                      disabled={submitting}
                      className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-dark shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {submitting ? 'Saving MSc Project...' : 'Save MSc Project'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
