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
  Radio,
  ChevronRight
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { to: '/', label: 'Executive Dashboard', icon: LayoutDashboard },
    { to: '/documents', label: 'Document Repository', icon: FileText },
    { to: '/assistant', label: 'HLD RAG Assistant', icon: Bot, isHighlight: true },
    { to: '/analysis', label: 'Architecture Analysis', icon: Layers },
    { to: '/history', label: 'Audit & Query History', icon: History },
    { to: '/status', label: 'System Diagnostics', icon: Activity },
    { to: '/settings', label: 'Configuration', icon: Settings },
  ];

  return (
    <aside className="w-72 bg-white border-r border-slate-200/90 flex flex-col justify-between shrink-0 select-none z-40 shadow-[1px_0_12px_rgba(15,23,42,0.04)]">
      <div>
        {/* Brand / Title Header with Luxury Automotive Precision */}
        <div className="px-6 py-6 border-b border-slate-200/80 bg-linear-to-b from-white via-slate-50/50 to-white">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-white shadow-sm shadow-slate-900/10">
              <Car className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-blue-700">
                TATA AUTOMOTIVE
              </div>
              <div className="text-base font-bold text-slate-900 tracking-tight leading-tight">
                AUTOSAR HLD AI
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-2.5 leading-normal">
            High-Level Design Intelligence & Verifiable RAG Traceability
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1.5">
          <div className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Workspace Modules
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all duration-150 group ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/15 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-700'
                    }`} />
                    <span className="truncate flex-1">{item.label}</span>
                    {item.isHighlight && !isActive && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        AI RAG
                      </span>
                    )}
                    {isActive && (
                      <ChevronRight className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Persistent Bottom Status Indicators */}
      <div className="p-5 border-t border-slate-200/80 bg-slate-50/70 space-y-3.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-600 flex items-center gap-2 font-medium">
            <Cpu className="w-4 h-4 text-purple-600" />
            AI RAG Engine
          </span>
          <span className="flex items-center gap-1.5 text-emerald-700 font-semibold text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Operational
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-600 flex items-center gap-2 font-medium">
            <Database className="w-4 h-4 text-blue-600" />
            Vector Store
          </span>
          <span className="flex items-center gap-1.5 text-emerald-700 font-semibold text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Synchronized
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-600 flex items-center gap-2 font-medium">
            <Radio className="w-4 h-4 text-sky-600" />
            Zero-Hallucination
          </span>
          <span className="flex items-center gap-1.5 text-emerald-700 font-semibold text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Strict Active
          </span>
        </div>

        <div className="pt-2 border-t border-slate-200/60 text-[10px] text-slate-400 text-center">
          ISO 26262 ASIL-D Compliance Ready
        </div>
      </div>
    </aside>
  );
};
