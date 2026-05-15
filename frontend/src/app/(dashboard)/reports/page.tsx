"use client";

import React from 'react';
import { 
  BarChart3, 
  PieChart as PieChartIcon, 
  TrendingUp, 
  Download, 
  Filter,
  Calendar,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const reports = [
  { title: "Monthly Revenue Report", desc: "Detailed breakdown of income by region and subject.", type: "Financial", date: "May 2026" },
  { title: "Vendor Performance Audit", desc: "Rating and delivery speed analytics for all outsourcing partners.", type: "Performance", date: "Q2 2026" },
  { title: "Student Completion Metrics", desc: "Project success rates and deadline compliance tracking.", type: "Academic", date: "Monthly" },
  { title: "Profitability Analysis", desc: "Deep dive into margins and cost optimization opportunities.", type: "Financial", date: "Yearly" },
];

export default function ReportsPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Reports & Analytics</h1>
          <p className="text-slate-500 mt-1">Generate and export comprehensive business reports</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20">
          <BarChart3 size={20} />
          Generate New Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Reports Generated", value: "156", icon: BarChart3, color: "text-blue-600", bg: "bg-blue-100" },
          { label: "Active Monitors", value: "12", icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-100" },
          { label: "Scheduled", value: "5", icon: Calendar, color: "text-orange-600", bg: "bg-orange-100" },
          { label: "Data Quality", value: "99.8%", icon: PieChartIcon, color: "text-purple-600", bg: "bg-purple-100" },
        ].map((stat, i) => (
          <div key={i} className="glass-card p-6 rounded-2xl">
            <div className={cn("p-3 rounded-xl inline-flex mb-4", stat.bg, stat.color)}>
              <stat.icon size={20} />
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
            <h3 className="text-xl font-bold text-slate-900 mt-1">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {reports.map((report, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-8 rounded-2xl bg-white border border-slate-100 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all group cursor-pointer"
          >
            <div className="flex justify-between items-start mb-6">
              <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                {report.type}
              </span>
              <span className="text-xs font-semibold text-slate-400">{report.date}</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 group-hover:text-primary transition-colors mb-2">{report.title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-8">{report.desc}</p>
            
            <div className="flex items-center justify-between pt-6 border-t border-slate-50">
              <div className="flex gap-4">
                <button className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-primary transition-colors">
                  <Download size={14} /> PDF
                </button>
                <button className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-primary transition-colors">
                  <Download size={14} /> CSV
                </button>
              </div>
              <button className="flex items-center gap-2 text-primary text-sm font-bold group/btn">
                Run Now
                <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
