"use client";

import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  CircleDollarSign, 
  Receipt,
  Download,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useCurrencyStore } from '@/store/useCurrencyStore';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const barData = [
  { month: 'Jan', revenue: 45000, cost: 32000 },
  { month: 'Feb', revenue: 52000, cost: 35000 },
  { month: 'Mar', revenue: 48000, cost: 31000 },
  { month: 'Apr', revenue: 61000, cost: 42000 },
  { month: 'May', revenue: 55000, cost: 38000 },
  { month: 'Jun', revenue: 67000, cost: 45000 },
];

const pieData = [
  { name: 'Subject A', value: 400 },
  { name: 'Subject B', value: 300 },
  { name: 'Subject C', value: 300 },
  { name: 'Subject D', value: 200 },
];

const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444'];

export default function FinancePage() {
  const { formatPrice } = useCurrencyStore();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Revenue & Finance</h1>
          <p className="text-slate-500 mt-1">Detailed financial analytics and transaction tracking</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
            <Calendar size={18} />
            May 2026
          </button>
          <button className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20">
            <Download size={20} />
            Export Statement
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total Revenue", value: formatPrice(482900), trend: "+12.5%", isUp: true, icon: Wallet, color: "text-blue-600", bg: "bg-blue-100" },
          { label: "Outsourcing Costs", value: formatPrice(120000), trend: "-2.4%", isUp: false, icon: Receipt, color: "text-rose-600", bg: "bg-rose-100" },
          { label: "Net Profit", value: formatPrice(362900), trend: "+18.2%", isUp: true, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-100" },
          { label: "Pending Payments", value: formatPrice(4500), trend: "Critical", isUp: false, icon: CircleDollarSign, color: "text-orange-600", bg: "bg-orange-100" },
        ].map((stat, i) => (
          <div key={i} className="glass-card p-6 rounded-2xl">
            <div className="flex justify-between items-start mb-4">
              <div className={cn("p-3 rounded-xl", stat.bg, stat.color)}>
                <stat.icon size={20} />
              </div>
              <div className={cn(
                "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg",
                stat.isUp ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
              )}>
                {stat.isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {stat.trend}
              </div>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-card p-8 rounded-2xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Revenue vs Profit</h2>
              <p className="text-sm text-slate-500">Comparison of monthly income and expenses</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-primary rounded-full"></div>
                <span className="text-xs font-medium text-slate-500">Revenue</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                <span className="text-xs font-medium text-slate-500">Profit</span>
              </div>
            </div>
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94A3B8', fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94A3B8', fontSize: 12 }}
                />
                <Tooltip 
                  cursor={{ fill: '#F1F5F9' }}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="revenue" fill="#2563EB" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cost" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-8 rounded-2xl">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Subject Performance</h2>
          <p className="text-sm text-slate-500 mb-8">Revenue distribution by subject</p>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-4 mt-6">
            {pieData.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }}></div>
                  <span className="text-sm font-medium text-slate-700">{item.name}</span>
                </div>
                <span className="text-sm font-bold text-slate-900">30%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
