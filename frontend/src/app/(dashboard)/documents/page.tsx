"use client";

import React from 'react';
import { 
  Search, 
  Plus, 
  Folder, 
  File, 
  Download, 
  MoreVertical,
  ChevronRight,
  HardDrive,
  FileText,
  FileImage,
  FileCode
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const files = [
  { name: "Business_Law_Final.pdf", size: "2.4 MB", type: "PDF", date: "2 hours ago", icon: FileText },
  { name: "Student_Profiles_May.xlsx", size: "1.1 MB", type: "Excel", date: "5 hours ago", icon: File },
  { name: "Logo_Assets.zip", size: "15.8 MB", type: "Archive", date: "1 day ago", icon: HardDrive },
  { name: "Contract_Draft_V2.docx", size: "850 KB", type: "Word", date: "3 days ago", icon: FileText },
];

export default function DocumentsPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Document Management</h1>
          <p className="text-slate-500 mt-1">Centralized storage for all project files and student documents</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20">
          <Plus size={20} />
          Upload File
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "Total Storage", value: "128 GB", icon: HardDrive, color: "text-blue-600", bg: "bg-blue-100" },
          { label: "Files Uploaded", value: "1,284", icon: FileText, color: "text-emerald-600", bg: "bg-emerald-100" },
          { label: "Pending Review", value: "24", icon: File, color: "text-orange-600", bg: "bg-orange-100" },
          { label: "Shared Files", value: "56", icon: FileCode, color: "text-purple-600", bg: "bg-purple-100" },
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

      <div className="glass-card p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <span>Root</span> <ChevronRight size={14} /> <span>Projects</span>
          </div>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search files..." 
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {["Subjects", "Students", "Vendors", "Finance"].map((folder, i) => (
            <motion.div 
              key={i}
              whileHover={{ y: -5 }}
              className="p-6 rounded-2xl border border-slate-100 bg-white hover:border-primary/20 transition-all cursor-pointer group"
            >
              <Folder size={40} className="text-primary mb-4" />
              <h4 className="font-bold text-slate-900 group-hover:text-primary transition-colors">{folder}</h4>
              <p className="text-xs text-slate-500 mt-1">24 files • 1.2 GB</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-12">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Recent Uploads</h3>
          <div className="space-y-4">
            {files.map((file, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded-xl text-primary shadow-sm">
                    <file.icon size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{file.name}</h4>
                    <p className="text-xs text-slate-500">{file.size} • {file.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-slate-400 font-medium">{file.date}</span>
                  <div className="flex gap-2">
                    <button className="p-2 hover:bg-white rounded-lg text-slate-400 transition-colors">
                      <Download size={16} />
                    </button>
                    <button className="p-2 hover:bg-white rounded-lg text-slate-400 transition-colors">
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
