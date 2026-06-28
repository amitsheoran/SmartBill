import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';
import { Billing } from './pages/Billing';
import { Inventory } from './pages/Inventory';
import { SalesHistory } from './pages/SalesHistory';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { seedDatabase } from './db/db';
import { getAllSettings } from './db/settingsHelper';
import { Bolt, Wifi, WifiOff } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [shopDetails, setShopDetails] = useState<Record<string, any>>({});
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Initialize DB and settings
  useEffect(() => {
    const initializeApp = async () => {
      // Seed default electrical data
      await seedDatabase();
      // Load settings
      await loadShopDetails();
    };

    initializeApp();

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadShopDetails = async () => {
    const s = await getAllSettings();
    setShopDetails(s);
    
    // Apply Theme
    const currentTheme = s.theme || 'dark';
    setTheme(currentTheme);
    if (currentTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleThemeToggle = async (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    // Update setting in db
    await db.settings.put({ id: 'theme', value: newTheme });
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Render active view
  const renderView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard setActiveTab={setActiveTab} currencySymbol={shopDetails.currency || '₹'} />;
      case 'billing':
        return <Billing shopDetails={shopDetails} />;
      case 'inventory':
        return <Inventory currencySymbol={shopDetails.currency || '₹'} />;
      case 'history':
        return <SalesHistory shopDetails={shopDetails} currencySymbol={shopDetails.currency || '₹'} />;
      case 'reports':
        return <Reports currencySymbol={shopDetails.currency || '₹'} />;
      case 'settings':
        return <Settings onSettingsSaved={loadShopDetails} toggleTheme={handleThemeToggle} activeTheme={theme} />;
      default:
        return <Dashboard setActiveTab={setActiveTab} currencySymbol={shopDetails.currency || '₹'} />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Navbar Sidebar / Bottom-bar */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        businessName={shopDetails.businessName || 'SmartBill PWA'} 
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden pb-20 md:pb-0">
        
        {/* Top Header bar: displays online/offline status */}
        <header className="px-6 py-4 flex justify-between items-center bg-card/50 backdrop-blur-sm border-b md:sticky md:top-0 z-35">
          <div className="flex items-center gap-2 md:hidden">
            <div className="bg-primary text-white p-1.5 rounded-lg">
              <Bolt className="h-5 w-5" />
            </div>
            <span className="font-extrabold text-sm tracking-tight">{shopDetails.businessName || 'SmartBill'}</span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {isOnline ? (
              <span className="text-[10px] bg-green-100 dark:bg-green-950/40 text-green-600 dark:text-green-400 font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                <Wifi className="h-3 w-3" />
                Online Sync Enabled
              </span>
            ) : (
              <span className="text-[10px] bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-bold px-2.5 py-1 rounded-full flex items-center gap-1 animate-pulse">
                <WifiOff className="h-3 w-3" />
                Offline Mode Active
              </span>
            )}
          </div>
        </header>

        {/* View render container */}
        <div className="py-6">
          {renderView()}
        </div>

      </main>
    </div>
  );
}

// Ensure db import is valid for settings update inside theme toggle
import { db } from './db/db';

export default App;
