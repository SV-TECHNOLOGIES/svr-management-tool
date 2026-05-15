"use client";

import React from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Star, 
  ExternalLink, 
  TrendingUp,
  CircleDollarSign,
  ShieldCheck,
  MoreVertical
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useCurrencyStore } from '@/store/useCurrencyStore';

const vendors = [
  { id: "V1", name: "Quantum Solutions", projects: 48, rating: 4.8, cost: 45000, status: "Active", type: "Full Service" },
  { id: "V2", name: "Elite Writers Hub", projects: 32, rating: 4.5, cost: 28000, status: "Active", type: "Academic" },
  { id: "V3", name: "Alpha Analytics", projects: 12, rating: 4.9, cost: 15000, status: "Pending", type: "Technical" },
  { id: "V4", name: "Global Research Co", projects: 64, rating: 4.2, cost: 58000, status: "Active", type: "General" },
];

export default function OutsourcingPage() {
  const { formatPrice } = useCurrencyStore();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Vendor Management</h1>
          <p className="text-slate-500 mt-1">Track outsourcing partners, costs, and performance</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20">
          <Plus size={20} />
          Add New Vendor
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Total Vendors", value: "42", icon: ShieldCheck, color: "text-blue-600", bg: "bg-blue-100" },
          { label: "Active Projects", value: "156", icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-100" },
          { label: "Total Outsourcing Cost", value: formatPrice(120000), icon: CircleDollarSign, color: "text-rose-600", bg: "bg-rose-100" },
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
              placeholder="Search vendors..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
            <Filter size={18} />
            Filters
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {vendors.map((vendor, i) => (
            <motion.div 
              key={vendor.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="p-6 rounded-2xl border border-slate-100 bg-white hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all group"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-xl">
                    {vendor.name[0]}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary transition-colors">{vendor.name}</h3>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-widest mt-1">{vendor.type}</p>
                  </div>
                </div>
                <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
                  <MoreVertical size={18} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 py-4 border-y border-slate-50">
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Projects</p>
                  <p className="font-bold text-slate-700">{vendor.projects}</p>
                </div>
                <div className="text-center border-x border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Rating</p>
                  <p className="font-bold text-slate-700 flex items-center justify-center gap-1">
                    {vendor.rating} <Star size={12} className="fill-amber-400 text-amber-400" />
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                    vendor.status === 'Active' ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                  )}>
                    {vendor.status}
                  </span>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Total Payout</p>
                  <p className="text-lg font-bold text-primary">{formatPrice(vendor.cost)}</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold hover:bg-primary hover:text-white transition-all group/btn">
                  View Profile
                  <ExternalLink size={14} className="group-hover/btn:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
