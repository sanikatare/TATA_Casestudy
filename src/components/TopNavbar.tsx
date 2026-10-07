import React, { useState } from 'react';
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
  Menu,
  X,
  ChevronDown
} from 'lucide-react';
import { useDomain, ECU_DOMAINS } from '../context/DomainContext';

export const TopNavbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [domainDropdownOpen, setDomainDropdownOpen] = useState(false);
  const { selectedDomain, setSelectedDomain, domainLabel } = useDomain();

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
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-blue-100/90 shadow-[0_1px_8px_rgba(37,99,235,0.04)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Logo & Title */}
          <NavLink to="/" className="flex items-center gap-3 shrink-0 group">
            <div className="w-9 h-9 rounded-xl bg-[#1e40af] flex items-center justify-center text-white shadow-xs shadow-blue-900/25 group-hover:bg-blue-900 transition-all">
              <Car className="w-5 h-5 text-white" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-bold text-blue-950 tracking-tight flex items-center gap-1.5">
                AUTOSAR Studio
              </div>
              <div className="text-[11px] text-[#1e40af] font-medium">
                HLD Architecture
              </div>
            </div>
          </NavLink>

          {/* Center Navigation Domains / Items (Desktop) */}
          <nav className="hidden xl:flex items-center gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#1e40af] text-white shadow-xs shadow-blue-900/25 font-semibold'
                        : 'text-slate-600 hover:text-[#1e40af] hover:bg-blue-50/80'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#1e40af]'}`} />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Mid-screen compact nav (lg to xl) */}
          <nav className="hidden md:flex xl:hidden items-center gap-1">
            {navItems.slice(0, 5).map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  title={item.label}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#1e40af] text-white shadow-xs shadow-blue-900/25 font-semibold'
                        : 'text-slate-600 hover:text-[#1e40af] hover:bg-blue-50/80'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#1e40af]'}`} />
                      <span className="truncate max-w-[95px]">{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Right Controls: ECU Domain Selector + Status */}
          <div className="flex items-center gap-3 shrink-0">
            {/* ECU Domain Filter Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setDomainDropdownOpen(!domainDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50/70 border border-blue-200/90 text-xs font-semibold text-[#1e40af] hover:bg-blue-100/70 hover:border-blue-300 transition-colors cursor-pointer"
                aria-label="Select ECU Domain"
              >
                <Cpu className="w-3.5 h-3.5 text-[#1e40af]" />
                <span className="max-w-[120px] sm:max-w-[160px] truncate">{domainLabel}</span>
                <ChevronDown className="w-3 h-3 text-[#1e40af]" />
              </button>

              {domainDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setDomainDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-xl border border-blue-100 shadow-xl shadow-blue-950/10 py-1.5 z-50">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-[#1e40af] uppercase tracking-wider border-b border-blue-50">
                      ECU Architectural Domains
                    </div>
                    {ECU_DOMAINS.map((dom) => (
                      <button
                        key={dom.id}
                        onClick={() => {
                          setSelectedDomain(dom.id);
                          setDomainDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          selectedDomain === dom.id
                            ? 'bg-blue-50 text-[#1e40af] font-bold'
                            : 'text-slate-700 hover:bg-blue-50/50 hover:text-[#1e40af]'
                        }`}
                      >
                        <span>{dom.label}</span>
                        {selectedDomain === dom.id && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#1e40af]" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Status Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-blue-950/80 pl-2.5 border-l border-blue-100 font-medium">
              <span className="w-2 h-2 rounded-full bg-[#1e40af] shadow-[0_0_8px_rgba(30,64,175,0.7)] animate-pulse" />
              <span>Online</span>
            </div>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-blue-800 hover:text-blue-950 rounded-lg hover:bg-blue-50 cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-blue-100 bg-white px-4 py-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#1e40af] text-white font-semibold shadow-xs'
                      : 'text-slate-700 hover:text-[#1e40af] hover:bg-blue-50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#1e40af]'}`} />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      )}
    </header>
  );
};
