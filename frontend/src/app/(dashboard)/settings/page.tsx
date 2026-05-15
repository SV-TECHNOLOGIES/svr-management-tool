"use client";

import React from 'react';
import { 
  Settings, 
  User, 
  Shield, 
  Bell, 
  Globe, 
  Database,
  ChevronRight,
  Save,
  Moon
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const settingsSections = [
  { id: 'profile', name: 'Profile Settings', icon: User, desc: 'Manage your personal information and profile picture.' },
  { id: 'security', name: 'Security & Access', icon: Shield, desc: 'Update passwords, MFA, and active sessions.' },
  { id: 'notifications', name: 'Notification Preferences', icon: Bell, desc: 'Configure how and when you want to be notified.' },
  { id: 'regional', name: 'Regional & Currency', icon: Globe, desc: 'Set your default currency (INR/GBP) and timezone.' },
  { id: 'data', name: 'Data Management', icon: Database, desc: 'Export your data or manage storage limits.' },
];

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">System Settings</h1>
        <p className="text-slate-500 mt-1">Configure your workspace preferences and security settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-2">
          {settingsSections.map((section) => (
            <button
              key={section.id}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-left",
                section.id === 'profile' 
                  ? "bg-white shadow-lg shadow-slate-200/50 border border-slate-100" 
                  : "hover:bg-slate-100 text-slate-500"
              )}
            >
              <div className={cn(
                "p-2 rounded-xl",
                section.id === 'profile' ? "bg-primary text-white" : "bg-slate-200 text-slate-500"
              )}>
                <section.icon size={20} />
              </div>
              <div className="flex-1">
                <h4 className={cn("font-bold text-sm", section.id === 'profile' ? "text-slate-900" : "text-slate-600")}>
                  {section.name}
                </h4>
              </div>
              <ChevronRight size={16} className="text-slate-400" />
            </button>
          ))}
        </div>

        <div className="lg:col-span-2 glass-card p-8 rounded-2xl">
          <div className="flex justify-between items-center mb-8 pb-6 border-b border-slate-100">
            <h3 className="text-xl font-bold text-slate-900">Profile Settings</h3>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-dark transition-all">
              <Save size={18} />
              Save Changes
            </button>
          </div>

          <form className="space-y-8">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center text-3xl font-bold text-primary relative group cursor-pointer">
                JW
                <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                  Change
                </div>
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Profile Photo</h4>
                <p className="text-xs text-slate-500 mt-1">PNG, JPG or GIF. Max 2MB.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Full Name</label>
                <input 
                  type="text" 
                  defaultValue="James Wilson"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Email Address</label>
                <input 
                  type="email" 
                  defaultValue="james@outsourcepro.com"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Job Role</label>
                <input 
                  type="text" 
                  defaultValue="Portfolio Manager"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Default Currency</label>
                <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none">
                  <option>GBP (£)</option>
                  <option>INR (₹)</option>
                </select>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-100">
              <h4 className="font-bold text-slate-900 mb-6">Theme Preferences</h4>
              <div className="flex gap-4">
                <button type="button" className="flex-1 p-4 border-2 border-primary bg-white rounded-2xl text-center shadow-lg shadow-primary/5">
                  <Settings size={24} className="mx-auto mb-2 text-primary" />
                  <span className="text-sm font-bold">Light Mode</span>
                </button>
                <button type="button" className="flex-1 p-4 border-2 border-transparent bg-slate-50 rounded-2xl text-center hover:bg-slate-100 transition-all text-slate-500">
                  <Moon size={24} className="mx-auto mb-2" />
                  <span className="text-sm font-bold">Dark Mode</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
