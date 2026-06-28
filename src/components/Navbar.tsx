import React from 'react';
import { 
  TrendingUp, 
  PlusCircle, 
  Layers, 
  History, 
  Settings as SettingsIcon,
  BarChart3,
  Bolt
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  businessName: string;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, businessName }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
    { id: 'billing', label: 'Quick Bill', icon: PlusCircle },
    { id: 'inventory', label: 'Inventory', icon: Layers },
    { id: 'history', label: 'History', icon: History },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <>
      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex flex-col w-64 bg-card text-card-foreground border-r h-screen sticky top-0 shrink-0">
        {/* Brand header */}
        <div className="p-6 border-b flex items-center gap-2.5">
          <div className="bg-primary text-white p-2 rounded-xl">
            <Bolt className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-extrabold text-sm tracking-tight truncate max-w-[150px]">{businessName || 'SmartBill'}</h2>
            <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">PWA Assistant</span>
          </div>
        </div>

        {/* Links */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-bold transition active:scale-95 text-left ${isActive ? 'bg-primary text-white shadow-lg shadow-blue-500/10' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t text-center">
          <p className="text-[10px] text-muted-foreground font-semibold">SmartBill PWA v1.0.0</p>
          <p className="text-[9px] text-muted-foreground/60 mt-0.5">100% Offline-First</p>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40 px-2 py-1.5 flex justify-around items-center shadow-lg backdrop-blur-md">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 active:scale-90 ${isActive ? 'text-primary scale-105 font-extrabold' : 'text-muted-foreground font-semibold'}`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5px] drop-shadow' : ''}`} />
              <span className="text-[8.5px] mt-1 tracking-tight leading-none">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
