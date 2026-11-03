import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const navItems = [
  { to: '/overview',   icon: '📊', label: 'Overview' },
  { to: '/map',        icon: '🗺️',  label: 'Live Map' },
  { to: '/ambulances', icon: '🚑', label: 'Ambulances' },
  { to: '/emergencies',icon: '🆘', label: 'Emergencies' },
  { to: '/dispatches', icon: '📍', label: 'Active Dispatches' },
  { to: '/history',    icon: '📋', label: 'History' },
  { to: '/analytics',  icon: '📈', label: 'Analytics' },
  { to: '/settings',   icon: '⚙️',  label: 'Settings' },
];

export default function DashboardLayout() {
  const { admin, logout } = useAuth();
  const { connected } = useSocket();
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-dispatch-dark">
      {/* Sidebar */}
      <aside
        className={`flex flex-col bg-dispatch-card border-r border-dispatch-border transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-56'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-dispatch-border">
          <span className="text-2xl">🚑</span>
          {!collapsed && (
            <div>
              <div className="text-xs font-bold text-white leading-none">DISPATCH</div>
              <div className="text-xs text-gray-400">Emergency System</div>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 mx-2 rounded-lg text-sm transition-colors mb-0.5 ${
                  isActive
                    ? 'bg-red-600/20 text-red-400 border border-red-700/30'
                    : 'text-gray-400 hover:bg-slate-700 hover:text-white'
                }`
              }
            >
              <span className="text-base flex-shrink-0">{item.icon}</span>
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="border-t border-dispatch-border p-3">
          {!collapsed && (
            <div className="text-xs text-gray-500 mb-2 px-1">
              Logged in as <span className="text-white">{admin?.name}</span>
            </div>
          )}
          <button
            onClick={logout}
            className="flex items-center gap-2 text-gray-400 hover:text-red-400 text-sm px-2 py-1 w-full rounded transition-colors"
          >
            <span>🚪</span>
            {!collapsed && 'Logout'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-3 bg-dispatch-card border-b border-dispatch-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="text-gray-400 hover:text-white p-1 rounded"
            >
              {collapsed ? '☰' : '✕'}
            </button>
            <h1 className="text-sm font-semibold text-white capitalize">
              {navItems.find((n) => location.pathname.startsWith(n.to))?.label || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Socket status */}
            <div className="flex items-center gap-1.5 text-xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                }`}
              />
              <span className={connected ? 'text-green-400' : 'text-red-400'}>
                {connected ? 'Live' : 'Disconnected'}
              </span>
            </div>

            <div className="text-xs text-gray-400">
              {new Date().toLocaleDateString('en-IN', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
