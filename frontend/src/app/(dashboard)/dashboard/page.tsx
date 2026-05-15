"use client";

import React from 'react';
import { 
  Plus, 
  Download, 
  Wallet, 
  ClipboardCheck, 
  CalendarClock, 
  Receipt,
  ArrowUpRight,
  UserCheck,
  Zap
} from 'lucide-react';
import { KPICard } from '@/components/dashboard/kpi-card';
import { RevenueChart } from '@/components/dashboard/revenue-chart';
import { useCurrencyStore } from '@/store/useCurrencyStore';
import { motion } from 'framer-motion';

export default function DashboardPage() {
  const { formatPrice } = useCurrencyStore();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Portfolio Overview</h1>
          <p className="text-slate-500 mt-1">Welcome back, James Wilson</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
            <Download size={18} />
            Download Report
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20">
            <Plus size={18} />
            Add Project
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          label="Total Revenue" 
          value={formatPrice(482900)} 
          icon={Wallet} 
          trend="+12.5%" 
          trendType="info"
          variant="blue"
        />
        <KPICard 
          label="Active Projects" 
          value="142" 
          icon={ClipboardCheck} 
          trend="Active" 
          trendType="active"
          variant="green"
        />
        <KPICard 
          label="Upcoming Deadlines" 
          value="12" 
          icon={CalendarClock} 
          trend="Critical" 
          trendType="critical"
          variant="orange"
        />
        <KPICard 
          label="Pending Invoices" 
          value="28" 
          icon={Receipt} 
          trend="Pending" 
          trendType="pending"
          variant="navy"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-card p-8 rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Revenue Analytics</h2>
              <p className="text-sm text-slate-500">Monthly financial growth across all regions</p>
            </div>
            <select className="bg-slate-100 border-none rounded-lg text-xs font-semibold px-3 py-1.5 outline-none">
              <option>Last 6 Months</option>
              <option>Last Year</option>
            </select>
          </div>
          <RevenueChart />
        </div>

        <div className="glass-card p-8 rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">Upcoming Deadlines</h2>
            <button className="text-primary text-xs font-bold hover:underline">View All</button>
          </div>
          <div className="space-y-6">
            {[
              { name: "Eleanor Shellstrop", subject: "Advanced Econometrics", days: "2 Days", type: "critical" },
              { name: "Chidi Anagonye", subject: "Moral Philosophy & Ethics", days: "5 Days", type: "warning" },
              { name: "Tahani Al-Jamil", subject: "Global Event Management", days: "8 Days", type: "info" },
              { name: "Jason Mendoza", subject: "Entrepreneurship 101", days: "12 Days", type: "info" },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{item.name}</h4>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                    <Zap size={12} className="text-primary" /> {item.subject}
                  </p>
                </div>
                <span className={cn(
                  "px-3 py-1 rounded-lg text-[10px] font-bold uppercase",
                  item.type === 'critical' ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-600"
                )}>
                  {item.days}
                </span>
              </div>
            ))}
          </div>
          <button className="w-full mt-8 py-3 bg-slate-50 text-primary text-sm font-bold rounded-xl hover:bg-slate-100 transition-colors">
            View All Deadlines
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card p-8 rounded-2xl">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Profit vs Cost Distribution</h2>
          <div className="space-y-6">
            {[
              { label: "United Kingdom Operations", margin: "72%", profit: 72 },
              { label: "India Service Hub", margin: "45%", profit: 45 },
              { label: "Australia Market", margin: "60%", profit: 60 },
            ].map((market, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-slate-700">{market.label}</span>
                  <span className="text-slate-500">{market.margin} Margin</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: market.margin }}
                    transition={{ duration: 1, delay: i * 0.2 }}
                    className="h-full bg-primary rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-8 rounded-2xl">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Recent Outsourcing Updates</h2>
          <div className="space-y-6">
            {[
              { title: "Project Finalized", desc: "Business Law Research for ID #89201 has been uploaded.", time: "24 minutes ago", icon: UserCheck, color: "text-primary" },
              { title: "Invoice Paid", desc: "Student Payment received for Arjun V. (GBP 450.00)", time: "2 hours ago", icon: Wallet, color: "text-orange-500" },
              { title: "New Outsourcer", desc: "Quantum Solutions joined the network.", time: "5 hours ago", icon: Plus, color: "text-emerald-500" },
            ].map((update, i) => (
              <div key={i} className="flex gap-4">
                <div className={cn("p-2 rounded-xl bg-slate-50", update.color)}>
                  <update.icon size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    {update.title}: <span className="font-medium text-slate-500">{update.desc}</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">{update.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
