"use client";

import React, { useEffect, useState } from 'react';
import { 
  Users, 
  BookOpen, 
  Wallet, 
  Clock, 
  ArrowUpRight, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Loader2,
  FileCheck
} from 'lucide-react';
import { KPICard } from '@/components/dashboard/kpi-card';
import { useCurrencyStore } from '@/store/useCurrencyStore';
import { 
  getDashboardStats, 
  getUpcomingDeadlines, 
  getMscProjects,
  getStudents
} from '@/lib/api';
import Link from 'next/link';

export default function DashboardPage() {
  const { formatPrice } = useCurrencyStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProjects: 1,
    totalStudents: 3,
    activeStudents: 3,
    pendingReviews: 1,
    totalAgreedRevenue: 6000,
    totalReceivedPayments: 1500,
    outstandingBalance: 4500,
    totalOutsourcing: 1100,
    netProfit: 400,
  });
  const [deadlines, setDeadlines] = useState<any[]>([]);
  const [mscProjects, setMscProjects] = useState<any[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, deadlinesRes, projectsRes] = await Promise.allSettled([
        getDashboardStats(),
        getUpcomingDeadlines(),
        getMscProjects(),
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      if (deadlinesRes.status === 'fulfilled') setDeadlines(deadlinesRes.value);
      if (projectsRes.status === 'fulfilled') setMscProjects(projectsRes.value);
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm font-semibold text-slate-500">Loading MSc Management Portal...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            MSc Project Management System
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Umbrella Template & Student Submission Lifecycle Tracker
          </p>
        </div>
        <div className="flex gap-3">
          <Link 
            href="/students"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
          >
            <Users size={18} />
            Enroll Student
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          label="Total Agreed Revenue" 
          value={formatPrice(stats.totalAgreedRevenue)} 
          icon={Wallet} 
          trend={`Received: ${formatPrice(stats.totalReceivedPayments)}`} 
          trendType="info"
          variant="blue"
        />
        <KPICard 
          label="Outstanding Balance" 
          value={formatPrice(stats.outstandingBalance)} 
          icon={Clock} 
          trend="Payment Pending" 
          trendType="pending"
          variant="orange"
        />
        <KPICard 
          label="Active Enrolled Students" 
          value={String(stats.totalStudents)} 
          icon={Users} 
          trend="In Cohort" 
          trendType="active"
          variant="green"
        />
        <KPICard 
          label="Submissions In Review" 
          value={String(stats.pendingReviews)} 
          icon={FileCheck} 
          trend="Peer Review Action Needed" 
          trendType="critical"
          variant="navy"
        />
      </div>

      {/* Main Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* MSc Projects Overview */}
        <div className="lg:col-span-2 glass-card p-8 rounded-2xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Umbrella MSc Projects</h2>
              <p className="text-sm text-slate-500">Master templates & stage rules</p>
            </div>
            <Link href="/subjects" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
              Manage Templates <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="space-y-4">
            {mscProjects.map((proj) => (
              <div key={proj.id} className="p-6 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">{proj.name}</h3>
                    <p className="text-xs text-slate-500">{proj.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg">
                      Price Range: £{proj.amountRangeLow} - £{proj.amountRangeHigh}
                    </span>
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-lg">
                      {proj.studentCount} Enrolled
                    </span>
                  </div>
                </div>

                {/* Stages Pills */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Defined Submission Stages
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {proj.submissionTemplates?.map((st: any) => (
                      <div key={st.id} className="p-3 bg-white border border-slate-200 rounded-xl">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                          <span>Stage {st.order}: {st.name}</span>
                          <span className="text-primary">{st.paymentPercentage}% Due</span>
                        </div>
                        <p className="text-[11px] text-slate-500">Offset: {st.deadlineOffsetDays} days</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Admin Splits */}
                <div className="flex items-center justify-between text-xs text-slate-600 pt-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Admin Split:</span>
                    {proj.adminSplits?.map((split: any, idx: number) => (
                      <span key={split.id} className="bg-slate-200 px-2 py-0.5 rounded font-medium">
                        {split.adminName} ({split.percentage}%)
                      </span>
                    ))}
                  </div>
                  <div className="font-bold text-slate-900">
                    Net Margin: {formatPrice(proj.netProfit)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Submissions Deadlines */}
        <div className="glass-card p-8 rounded-2xl space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Upcoming Submissions</h2>
            <Link href="/documents" className="text-xs font-bold text-primary hover:underline">
              View Stage Board
            </Link>
          </div>

          <div className="space-y-4">
            {deadlines.length === 0 ? (
              <p className="text-sm text-slate-400">No active pending submissions.</p>
            ) : (
              deadlines.map((sub) => (
                <div key={sub.id} className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 text-sm">{sub.studentName}</h4>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded">
                      {sub.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    {sub.stageName} ({sub.rollNo})
                  </p>
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                    <span>Deadline: {new Date(sub.deadline).toLocaleDateString()}</span>
                    {sub.fileLink ? (
                      <a 
                        href={sub.fileLink} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-primary hover:underline flex items-center gap-1 font-semibold"
                      >
                        View File <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span className="text-slate-400 italic">No link added</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
