import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Bot,
  Layers,
  History,
  Activity,
  Settings,
  Car,
  Cpu,
  Database,
  Radio
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/documents', label: 'Documents', icon: FileText },
    { to: '/assistant', label: 'HLD Assistant', icon: Bot, isHighlight: true },
    { to: '/analysis', label: 'Analysis', icon: Layers },
    { to: '/history', label: 'History', icon: History },
    { to: '/status', label: 'System Status', icon: Activity },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 select-none z-40 shadow-xs">
      <div>
        {/* Brand / Title Header */}
        <div className="px-6 py-6 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-widest text-blue-600 font-mono">
                AUTOMOTIVE
              </div>
              <div className="text-sm font-bold text-slate-900 tracking-tight">
                ENGINEERING AI
              </div>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 font-mono">
            AUTOSAR HLD Intelligence
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
                {item.isHighlight && (
                  <span className="ml-auto text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200">
                    RAG
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Persistent Bottom Status Indicators */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/70 space-y-3 font-mono text-[11px]">
        <div className="flex items-center justify-between">
          <span className="text-slate-600 flex items-center gap-1.5 font-medium">
            <Cpu className="w-3.5 h-3.5 text-purple-600" />
            AI Engine
          </span>
          <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Online
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-600 flex items-center gap-1.5 font-medium">
            <Database className="w-3.5 h-3.5 text-blue-600" />
            Vector Database
          </span>
          <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Connected
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-600 flex items-center gap-1.5 font-medium">
            <Radio className="w-3.5 h-3.5 text-sky-600" />
            API
          </span>
          <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Healthy
          </span>
        </div>
      </div>
    </aside>
  );
};
