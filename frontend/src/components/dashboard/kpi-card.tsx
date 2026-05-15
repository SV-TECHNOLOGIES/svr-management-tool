"use client";

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface KPICardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendType?: 'success' | 'danger' | 'warning' | 'info' | 'active' | 'critical' | 'pending';
  variant?: 'blue' | 'green' | 'orange' | 'navy';
}

const variants = {
  blue: "bg-blue-600 text-white",
  green: "bg-emerald-600 text-white",
  orange: "bg-orange-500 text-white",
  navy: "bg-[#1E293B] text-white",
};

const trendVariants = {
  success: "bg-emerald-100 text-emerald-600",
  danger: "bg-rose-100 text-rose-600",
  warning: "bg-amber-100 text-amber-600",
  info: "bg-blue-100 text-blue-600",
  active: "bg-emerald-400/20 text-emerald-100 border border-emerald-400/30",
  critical: "bg-rose-400/20 text-rose-100 border border-rose-400/30",
  pending: "bg-slate-400/20 text-slate-100 border border-slate-400/30",
};

export function KPICard({ label, value, icon: Icon, trend, trendType = 'info', variant = 'blue' }: KPICardProps) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className={cn(
        "p-6 rounded-2xl shadow-xl flex flex-col justify-between relative overflow-hidden group min-h-[160px]",
        variants[variant]
      )}
    >
      <div className="flex justify-between items-start z-10">
        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
          <Icon size={24} />
        </div>
        {trend && (
          <div className={cn("px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider", trendVariants[trendType])}>
            {trend}
          </div>
        )}
      </div>

      <div className="mt-4 z-10">
        <p className="text-sm font-medium text-white/70 uppercase tracking-wider">{label}</p>
        <h3 className="text-3xl font-bold mt-1">{value}</h3>
      </div>

      {/* Decorative background circle */}
      <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
    </motion.div>
  );
}
