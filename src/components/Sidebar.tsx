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
  ChevronRight
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/documents', label: 'Documents', icon: FileText },
    { to: '/assistant', label: 'HLD Assistant', icon: Bot },
    { to: '/analysis', label: 'Architecture Analysis', icon: Layers },
    { to: '/history', label: 'Query History', icon: History },
    { to: '/status', label: 'System Diagnostics', icon: Activity },
    { to: '/settings', label: 'Configuration', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200/90 flex flex-col justify-between shrink-0 select-none z-40">
      <div>
        {/* Brand Header */}
        <div className="px-5 py-5 border-b border-slate-200/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-xs">
              <Car className="w-4.5 h-4.5 text-blue-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 tracking-tight leading-tight">
                AUTOSAR Studio
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                HLD Architecture Assistant
              </div>
            </div>
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
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                    isActive
                      ? 'bg-slate-900 text-white font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-600'
                    }`} />
                    <span className="truncate flex-1">{item.label}</span>
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

      {/* Clean Minimal Footer */}
      <div className="p-4 border-t border-slate-200/80 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="font-medium text-blue-900">Online</span>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">v2.4</span>
      </div>
    </aside>
  );
};
