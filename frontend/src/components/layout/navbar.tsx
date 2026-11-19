"use client";

import React from 'react';
import { ChevronRight, LogOut } from 'lucide-react';
import { useCurrencyStore } from '@/store/useCurrencyStore';
import { usePathname, useRouter } from 'next/navigation';
import { clearSession, getCurrentUser, AuthUser } from '@/lib/api';

export function Navbar() {
  const { currency, setCurrency } = useCurrencyStore();
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = React.useState<AuthUser | null>(null);
  React.useEffect(() => setUser(getCurrentUser()), []);

  const logout = () => {
    clearSession();
    router.replace('/');
  };
  
  // Simple breadcrumbs logic
  const paths = pathname.split('/').filter(p => p);

  return (
    <header className="h-20 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-40 px-4 md:px-8 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Home</span>
          {paths.map((path, i) => (
            <React.Fragment key={`${path}-${i}`}>
              <ChevronRight size={14} />
              <span className={i === paths.length - 1 ? "text-primary font-medium capitalize" : "capitalize"}>
                {path.length > 20 ? 'Details' : path === 'subjects' ? 'Projects' : path === 'documents' ? 'Submissions' : path === 'my-work' ? 'My work' : path}
              </span>
            </React.Fragment>
          ))}
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

        {user && (
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center">
              {user.name.slice(0, 1).toUpperCase()}
            </div>
            <span className="text-sm font-semibold text-slate-700">{user.name}</span>
          </div>
        )}
        <button
          onClick={logout}
          title="Log out"
          className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors flex items-center gap-2 text-sm font-semibold"
        >
          <LogOut size={18} />
          <span className="hidden md:inline">Log out</span>
        </button>
      </div>
    </header>
  );
}
