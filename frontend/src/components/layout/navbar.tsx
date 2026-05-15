"use client";

import React from 'react';
import { Search, Bell, Moon, Sun, ChevronRight } from 'lucide-react';
import { useCurrencyStore } from '@/store/useCurrencyStore';
import { usePathname } from 'next/navigation';

export function Navbar() {
  const { currency, setCurrency } = useCurrencyStore();
  const pathname = usePathname();
  
  // Simple breadcrumbs logic
  const paths = pathname.split('/').filter(p => p);

  return (
    <header className="h-20 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-40 px-8 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Home</span>
          {paths.map((path, i) => (
            <React.Fragment key={path}>
              <ChevronRight size={14} />
              <span className={i === paths.length - 1 ? "text-primary font-medium capitalize" : "capitalize"}>
                {path}
              </span>
            </React.Fragment>
          ))}
        </div>

        <div className="relative group ml-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Global Search (Cmd+K)" 
            className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm w-80 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setCurrency('GBP')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${currency === 'GBP' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'}`}
          >
            GBP
          </button>
          <button 
            onClick={() => setCurrency('INR')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${currency === 'INR' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'}`}
          >
            INR
          </button>
        </div>

        <button className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors relative">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full border-2 border-white"></span>
        </button>

        <button className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors">
          <Moon size={20} />
        </button>
      </div>
    </header>
  );
}
