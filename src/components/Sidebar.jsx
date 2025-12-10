// src/components/Sidebar.jsx
import { useState } from 'react';
import { Menu, X, LayoutDashboard, Settings, LogOut, BarChart3, Users, FileText, Zap } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, onLogout, userRole }) {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = {
    admin: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: '#667eea' },
      { id: 'insights', label: 'AI Insights', icon: Zap, color: '#ff006e' },
      { id: 'users', label: 'Users', icon: Users, color: '#00d4ff' },
      { id: 'reports', label: 'Reports', icon: FileText, color: '#ffa502' },
    ],
    staff: [
      { id: 'tasks', label: 'My Tasks', icon: LayoutDashboard, color: '#667eea' },
      { id: 'ai-assist', label: 'AI Assistant', icon: Zap, color: '#ff006e' },
      { id: 'reports', label: 'Reports', icon: FileText, color: '#ffa502' },
    ],
    client: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard, color: '#667eea' },
      { id: 'ai-chat', label: 'AI Chat', icon: Zap, color: '#ff006e' },
      { id: 'tasks', label: 'All Tasks', icon: FileText, color: '#00d4ff' },
      { id: 'reports', label: 'Reports', icon: FileText, color: '#ffa502' },
    ],
  };

  const items = menuItems[userRole] || menuItems.client;

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 md:hidden z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed md:relative md:translate-x-0 transition-all duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } left-0 top-0 w-64 h-screen bg-gradient-to-b from-blue-600 via-blue-700 to-blue-900 text-white shadow-2xl z-40`}
        style={{
          backgroundImage: 'linear-gradient(180deg, rgba(25, 118, 210, 0.9) 0%, rgba(13, 71, 161, 0.9) 50%, rgba(7, 43, 96, 0.9) 100%)',
          backdropFilter: 'blur(10px)',
        }}
      >
        {/* Logo/Brand */}
        <div className="p-6 border-b border-blue-400/30 animate-fadeInDown">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-400 rounded-lg flex items-center justify-center font-bold text-blue-900 hover:shadow-lg hover:shadow-cyan-400/50 transition-all">
              ✓
            </div>
            SmartTask
          </h2>
          <p className="text-blue-100 text-xs mt-1 uppercase tracking-widest font-semibold">{userRole} Portal</p>
        </div>

        {/* Navigation */}
        <nav className="p-4 flex-1">
          <div className="space-y-2">
            {items.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ease-out group relative overflow-hidden ${
                    activeTab === item.id
                      ? 'bg-gradient-to-r from-cyan-400 to-blue-400 shadow-lg shadow-cyan-400/50 scale-105 font-bold'
                      : 'hover:bg-blue-500/50 hover:translate-x-2 hover:shadow-lg'
                  }`}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  {/* Animated background shine effect */}
                  <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 ${activeTab === item.id ? 'animate-pulse' : ''}`} style={{ animation: activeTab === item.id ? 'shimmer 2s infinite' : 'none' }} />
                  
                  {/* Icon with color indicator */}
                  <div className="relative z-10 flex items-center gap-3 w-full">
                    <div className={`p-2 rounded-lg ${activeTab === item.id ? 'bg-white/20' : 'bg-blue-500/30 group-hover:bg-blue-500/60'} transition-all`}>
                      <Icon size={18} style={{ color: activeTab === item.id ? '#fff' : item.color }} />
                    </div>
                    <span className="font-medium text-sm">{item.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Logout Button */}
        <div className="absolute bottom-4 left-4 right-4 animate-fadeInUp">
          <button
            onClick={() => {
              onLogout();
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-red-500/50 font-semibold group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transition-opacity" />
            <LogOut size={20} className="relative z-10" />
            <span className="relative z-10">Logout</span>
          </button>
        </div>
      </div>
    </>
  );
}