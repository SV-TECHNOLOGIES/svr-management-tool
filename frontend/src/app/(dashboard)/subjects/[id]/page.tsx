"use client";

import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  Calendar, 
  Users, 
  CircleDollarSign, 
  ExternalLink, 
  FileText, 
  BarChart3,
  Clock,
  MoreVertical,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useCurrencyStore } from '@/store/useCurrencyStore';
import Link from 'next/link';

const tabs = [
  { id: 'overview', name: 'Overview', icon: BarChart3 },
  { id: 'students', name: 'Students', icon: Users },
  { id: 'payments', name: 'Payments', icon: CircleDollarSign },
  { id: 'outsourcing', name: 'Outsourcing', icon: ExternalLink },
  { id: 'documents', name: 'Documents', icon: FileText },
  { id: 'analytics', name: 'Analytics', icon: BarChart3 },
];

export default function SubjectDetailsPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState('overview');
  const { formatPrice } = useCurrencyStore();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/subjects" className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
              Subjects <ChevronRight size={12} /> BL-2024
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mt-1">Business Law Research</h1>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
            Manage Files
          </button>
          <button className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20">
            <Plus size={20} />
            Assign Project
          </button>
        </div>
      </div>

      <div className="flex items-center border-b border-slate-200 gap-8 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 py-4 px-2 border-b-2 transition-all font-semibold text-sm whitespace-nowrap",
              activeTab === tab.id 
                ? "border-primary text-primary" 
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            <tab.icon size={18} />
            {tab.name}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <div className="glass-card p-8 rounded-2xl">
                  <h3 className="text-lg font-bold text-slate-900 mb-6">Subject Statistics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 bg-blue-50 rounded-2xl">
                      <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">Total Revenue</p>
                      <h4 className="text-2xl font-bold text-blue-900">{formatPrice(125000)}</h4>
                    </div>
                    <div className="p-6 bg-emerald-50 rounded-2xl">
                      <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-2">Completion Rate</p>
                      <h4 className="text-2xl font-bold text-emerald-900">84%</h4>
                    </div>
                    <div className="p-6 bg-rose-50 rounded-2xl">
                      <p className="text-xs font-bold text-rose-600 uppercase tracking-widest mb-2">Pending Tasks</p>
                      <h4 className="text-2xl font-bold text-rose-900">12</h4>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-8 rounded-2xl">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-900">Active Students</h3>
                    <button className="text-primary text-xs font-bold hover:underline">View All</button>
                  </div>
                  <div className="space-y-4">
                    {[1, 2, 3].map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-bold text-primary">RS</div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">Rahul Sharma</p>
                            <p className="text-xs text-slate-500">Assignment: Corporate Law Review</p>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-lg text-[10px] font-bold uppercase">On Track</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="glass-card p-8 rounded-2xl bg-navy text-white">
                  <h3 className="text-lg font-bold mb-6">Upcoming Deadlines</h3>
                  <div className="space-y-6">
                    {[
                      { title: "Final Submission", date: "May 20, 2026", type: "CRITICAL" },
                      { title: "Peer Review", date: "May 25, 2026", type: "NORMAL" },
                      { title: "Subject Report", date: "June 02, 2026", type: "NORMAL" },
                    ].map((deadline, i) => (
                      <div key={i} className="flex gap-4">
                        <div className={cn(
                          "w-1 h-12 rounded-full",
                          deadline.type === 'CRITICAL' ? "bg-rose-500" : "bg-slate-700"
                        )}></div>
                        <div>
                          <p className="text-sm font-bold">{deadline.title}</p>
                          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                            <Clock size={12} /> {deadline.date}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="w-full mt-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold transition-all">
                    Sync to Calendar
                  </button>
                </div>

                <div className="glass-card p-8 rounded-2xl">
                  <h3 className="text-lg font-bold text-slate-900 mb-6">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button className="p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all text-center">
                      <FileText size={20} className="mx-auto mb-2 text-primary" />
                      <span className="text-xs font-bold">New File</span>
                    </button>
                    <button className="p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all text-center">
                      <Users size={20} className="mx-auto mb-2 text-primary" />
                      <span className="text-xs font-bold">Add Student</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab !== 'overview' && (
            <div className="glass-card p-12 rounded-2xl text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FileText size={40} className="text-slate-300" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">{tabs.find(t => t.id === activeTab)?.name} Module</h2>
              <p className="text-slate-500 max-w-md mx-auto">
                Detailed {activeTab} management for this subject. Real-time data sync and collaborative tools.
              </p>
              <button className="mt-8 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-all">
                Access Module
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
