import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { signOut, getCurrentUser } from '../services/dataService';
import { UserProfile } from '../types';

// Simple Icons
const HomeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
);

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);

const CardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
);

const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
);

const LogOutIcon = () => (
   <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
);

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<UserProfile | null>(null);

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    getCurrentUser().then(u => {
      console.log("Layout: Current User State:", u);
      setUser(u);
    });
  }, [location]); // Reload on nav change to check status

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 max-w-md mx-auto shadow-2xl overflow-hidden relative">
      {/* Header */}
      <header className="bg-primary text-white p-4 pt-8 sticky top-0 z-10 shadow-md flex justify-between items-center">
        <h1 className="text-xl font-bold flex flex-col">
          CardKeeper AI 
          {user && <span className="text-[10px] font-mono opacity-60 font-normal">role: {user.role}</span>}
        </h1>
        <div className="flex items-center gap-2">
           {user?.role === 'admin' && (
             <button 
               onClick={() => navigate('/admin')}
               className="p-2 rounded-full hover:bg-white/10"
               title="Admin Dashboard"
             >
               <SettingsIcon />
             </button>
           )}
           <button 
             onClick={handleLogout}
             className="p-2 rounded-full hover:bg-white/10"
             title="Logout"
           >
             <LogOutIcon />
           </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto no-scrollbar pb-24 p-4">
        {children}

        {/* App Footer */}
        <div className="mt-8 mb-4 text-center">
            <p className="text-[10px] text-gray-400 font-medium">
              Powered by Paul Chang @ <a href="https://www.ebeesnet.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline transition-colors">eBees Network</a>
            </p>
            <p className="text-[9px] text-gray-300 font-mono mt-0.5">Version 1.1.0</p>
        </div>
      </main>

      {/* Floating Action Button (FAB) for Add */}
      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-20">
         <button 
          onClick={() => navigate('/add')}
          className="bg-primary hover:bg-emerald-600 text-white p-4 rounded-full shadow-lg border-4 border-gray-100 transition-transform active:scale-95"
         >
           <PlusIcon />
         </button>
      </div>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-gray-200 h-16 flex justify-around items-center absolute bottom-0 w-full z-10">
        <button 
          onClick={() => navigate('/')}
          className={`flex flex-col items-center justify-center w-full h-full ${isActive('/') ? 'text-primary' : 'text-gray-400'}`}
        >
          <HomeIcon />
          <span className="text-xs mt-1">Home</span>
        </button>
        
        {/* Spacer for FAB */}
        <div className="w-12"></div>

        <button 
          onClick={() => navigate('/cards')}
          className={`flex flex-col items-center justify-center w-full h-full ${isActive('/cards') ? 'text-primary' : 'text-gray-400'}`}
        >
          <CardIcon />
          <span className="text-xs mt-1">Cards</span>
        </button>
      </nav>
    </div>
  );
};