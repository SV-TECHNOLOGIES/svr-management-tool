"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  ExternalLink, 
  CircleDollarSign, 
  Clock, 
  FileText, 
  BarChart3, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'MSc Projects', href: '/subjects', icon: BookOpen },
  { name: 'Students', href: '/students', icon: Users },
  { name: 'Submissions Lifecycle', href: '/documents', icon: FileText },
  { name: 'Revenue & Payments', href: '/finance', icon: CircleDollarSign },
  { name: 'Outsourcing', href: '/outsourcing', icon: ExternalLink },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside 
      className={cn(
        "h-screen sticky top-0 bg-navy text-slate-400 flex flex-col transition-all duration-300 z-50",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div className="p-6 flex items-center justify-between">
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-white font-bold text-xl tracking-tight">Outsource Pro</span>
            <span className="text-xs text-slate-500">Management Suite</span>
          </div>
        )}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group relative",
                isActive 
                  ? "bg-primary text-white shadow-lg shadow-primary/20" 
                  : "hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon size={22} className={cn(isActive ? "text-white" : "group-hover:text-white")} />
              {!collapsed && <span className="font-medium">{item.name}</span>}
              {collapsed && (
                <div className="absolute left-full ml-4 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  {item.name}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      <div className={cn(
        "p-4 border-t border-slate-800 flex items-center gap-3",
        collapsed ? "justify-center" : "justify-between"
      )}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold">
            JW
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white">James Wilson</span>
              <span className="text-xs text-slate-500">Portfolio Manager</span>
            </div>
          )}
        </div>
        {!collapsed && (
          <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-colors">
            <LogOut size={18} />
          </button>
        )}
      </div>
    </aside>
  );
}
