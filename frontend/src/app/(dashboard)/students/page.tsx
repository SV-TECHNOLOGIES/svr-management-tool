"use client";

import React from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  MoreVertical, 
  Mail, 
  Phone,
  ArrowUpRight,
  Download,
  GraduationCap
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const students = [
  { id: "S1", name: "Rahul Sharma", email: "rahul.s@example.com", subjects: 4, projects: 12, status: "Active", lastActivity: "2 hours ago" },
  { id: "S2", name: "Priya Patel", email: "priya.p@example.com", subjects: 2, projects: 6, status: "Active", lastActivity: "5 hours ago" },
  { id: "S3", name: "Amit Kumar", email: "amit.k@example.com", subjects: 5, projects: 18, status: "Pending", lastActivity: "1 day ago" },
  { id: "S4", name: "Sneha Reddy", email: "sneha.r@example.com", subjects: 3, projects: 9, status: "Active", lastActivity: "3 days ago" },
  { id: "S5", name: "Vikram Singh", email: "vikram.s@example.com", subjects: 1, projects: 3, status: "Inactive", lastActivity: "1 week ago" },
];

export default function StudentsPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Student Directory</h1>
          <p className="text-slate-500 mt-1">Manage student profiles, assignments, and payments</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
            <Download size={18} />
            Export List
          </button>
          <button className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20">
            <Plus size={20} />
            Add Student
          </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden rounded-2xl">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search students by name or ID..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
            <Filter size={18} />
            Advanced Filters
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-widest">
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Subjects</th>
                <th className="px-6 py-4">Total Projects</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Last Activity</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((student, i) => (
                <motion.tr 
                  key={student.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-primary font-bold">
                        {student.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 group-hover:text-primary transition-colors">{student.name}</h4>
                        <p className="text-xs text-slate-400">{student.id} • {student.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold">
                      {student.subjects} Subjects
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-slate-700">{student.projects} Projects</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      student.status === 'Active' ? "bg-emerald-100 text-emerald-600" : 
                      student.status === 'Pending' ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-500"
                    )}>
                      {student.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {student.lastActivity}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                        <Mail size={16} />
                      </button>
                      <button className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-6 border-t border-slate-100 flex items-center justify-between">
          <p className="text-sm text-slate-500">Showing 5 of 1,284 students</p>
          <div className="flex gap-2">
            <button className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold disabled:opacity-50" disabled>Previous</button>
            <button className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
