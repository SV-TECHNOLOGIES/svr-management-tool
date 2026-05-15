"use client";

import React from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  MoreVertical, 
  Clock, 
  CircleDollarSign, 
  Users,
  LayoutGrid,
  List as ListIcon
} from 'lucide-react';
import { useCurrencyStore } from '@/store/useCurrencyStore';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const subjects = [
  { id: 1, name: "Business Law Research", students: 42, projects: 128, revenue: 12500, deadline: "Tomorrow", color: "bg-blue-500" },
  { id: 2, name: "Advanced Econometrics", students: 28, projects: 94, revenue: 8400, deadline: "2 Days", color: "bg-emerald-500" },
  { id: 3, name: "Moral Philosophy & Ethics", students: 15, projects: 45, revenue: 3200, deadline: "5 Days", color: "bg-orange-500" },
  { id: 4, name: "Global Event Management", students: 56, projects: 182, revenue: 18900, deadline: "8 Days", color: "bg-purple-500" },
  { id: 5, name: "Entrepreneurship 101", students: 34, projects: 112, revenue: 11000, deadline: "12 Days", color: "bg-rose-500" },
  { id: 6, name: "Digital Marketing Strategy", students: 48, projects: 156, revenue: 14500, deadline: "15 Days", color: "bg-indigo-500" },
];

export default function SubjectsPage() {
  const { formatPrice } = useCurrencyStore();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Subjects Management</h1>
          <p className="text-slate-500 mt-1">Track and manage project subjects and assignments</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20">
          <Plus size={20} />
          Create Subject
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Active Subjects", value: "24", icon: LayoutGrid, color: "text-blue-600", bg: "bg-blue-100" },
          { label: "Total Students", value: "1,284", icon: Users, color: "text-emerald-600", bg: "bg-emerald-100" },
          { label: "Total Revenue", value: formatPrice(245000), icon: CircleDollarSign, color: "text-orange-600", bg: "bg-orange-100" },
        ].map((stat, i) => (
          <div key={i} className="glass-card p-6 rounded-2xl flex items-center gap-4">
            <div className={cn("p-4 rounded-xl", stat.bg, stat.color)}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card p-6 rounded-2xl">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-8">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search subjects..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
              <Filter size={18} />
              Filters
            </button>
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button className="p-1.5 bg-white shadow-sm rounded-lg text-primary">
                <LayoutGrid size={18} />
              </button>
              <button className="p-1.5 text-slate-500">
                <ListIcon size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((subject, i) => (
            <motion.div 
              key={subject.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -5 }}
              className="group glass-card p-6 rounded-2xl border-slate-200 hover:border-primary/30 transition-all cursor-pointer"
            >
              <div className="flex justify-between items-start mb-6">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white", subject.color)}>
                  <LayoutGrid size={24} />
                </div>
                <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
                  <MoreVertical size={18} />
                </button>
              </div>

              <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary transition-colors">{subject.name}</h3>
              
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Students</p>
                  <p className="text-sm font-bold text-slate-700">{subject.students}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Revenue</p>
                  <p className="text-sm font-bold text-slate-700">{formatPrice(subject.revenue)}</p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-500">
                  <Clock size={14} className="text-orange-500" />
                  <span className="text-xs font-semibold">Deadline: {subject.deadline}</span>
                </div>
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((_, i) => (
                    <div key={i} className="w-7 h-7 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold">
                      {String.fromCharCode(65 + i)}
                    </div>
                  ))}
                  <div className="w-7 h-7 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">
                    +5
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
