import React, { useEffect, useState } from 'react';
import { getAdminStats, getAllProfiles, updateUserRole } from '../services/dataService';
import { UserProfile } from '../types';
import { useNavigate } from 'react-router-dom';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'settings'>('overview');
  
  const [stats, setStats] = useState({ userCount: 0, totalVolume: 0, cardCount: 0 });
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load Overview Stats
  useEffect(() => {
    if (activeTab === 'overview') {
      getAdminStats()
        .then((data) => setStats(data as any))
        .catch((err) => console.error("Failed to load admin stats", err));
    }
  }, [activeTab]);

  // Load Users List
  useEffect(() => {
    if (activeTab === 'users') {
      setLoading(true);
      getAllProfiles()
        .then(setUsers)
        .catch((err) => {
          console.error("Failed to load profiles. Check RLS policies.", err);
          alert("Failed to load users. Ensure you have 'Admin Select' policies enabled in Supabase.");
        })
        .finally(() => setLoading(false));
    }
  }, [activeTab, refreshTrigger]);

  const handleRoleToggle = async (user: UserProfile) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    const confirmMsg = newRole === 'admin' 
      ? `Promote ${user.email} to Admin?` 
      : `Demote ${user.email} to User?`;
      
    if (window.confirm(confirmMsg)) {
      try {
        await updateUserRole(user.id, newRole);
        setRefreshTrigger(prev => prev + 1); // Reload list
      } catch (e) {
        alert("Failed to update role.");
        console.error(e);
      }
    }
  };

  const handleSwitchDatabase = () => {
    if (window.confirm("Switch Database?\n\nThis will disconnect the current account. You will need to enter the URL and Key for the new account.")) {
        navigate('/setup');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="bg-dark text-white p-6 rounded-2xl shadow-lg">
        <h2 className="text-2xl font-bold mb-1">Admin Console</h2>
        <p className="opacity-60 text-sm">System Overview & Management</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'overview' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Overview
        </button>
        <button 
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'users' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Users
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Settings
        </button>
      </div>

      {/* TAB: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
              <p className="text-xs text-gray-400 uppercase font-bold">Total Users</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">{stats.userCount || 0}</p>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
              <p className="text-xs text-gray-400 uppercase font-bold">Active Cards</p>
              <p className="text-3xl font-bold text-secondary mt-2">{stats.cardCount || 0}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 uppercase font-bold mb-2">Total Transaction Volume</p>
            <p className="text-4xl font-bold text-primary">¥ {stats.totalVolume?.toLocaleString() || '0'}</p>
            <p className="text-xs text-gray-400 mt-2">Across all users and stores</p>
          </div>
        </div>
      )}

      {/* TAB: USERS */}
      {activeTab === 'users' && (
        <div className="animate-fade-in bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
             <h3 className="font-bold text-gray-800">User Management</h3>
             <button onClick={() => setRefreshTrigger(p => p+1)} className="text-primary text-xs font-bold">Refresh</button>
          </div>
          
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading users...</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {users.map(user => (
                <div key={user.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                   <div className="min-w-0">
                     <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
                     <p className="text-xs text-gray-400 font-mono mt-0.5">{user.id.slice(0, 8)}...</p>
                   </div>
                   <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                        {user.role}
                      </span>
                      <button 
                        onClick={() => handleRoleToggle(user)}
                        className="text-xs text-gray-400 hover:text-gray-600 underline"
                      >
                        {user.role === 'admin' ? 'Demote' : 'Promote'}
                      </button>
                   </div>
                </div>
              ))}
              {users.length === 0 && <div className="p-8 text-center text-gray-400 text-sm">No users found.</div>}
            </div>
          )}
        </div>
      )}

      {/* TAB: SETTINGS */}
      {activeTab === 'settings' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4">System Settings</h3>
            <div className="space-y-4 text-sm text-gray-600">
               <div className="flex justify-between items-center">
                 <span>Enable Signups</span>
                 <div className="w-10 h-6 bg-primary rounded-full flex items-center px-1"><div className="w-4 h-4 bg-white rounded-full"></div></div>
               </div>
               <div className="flex justify-between items-center opacity-50">
                 <span>Maintenance Mode</span>
                 <div className="w-10 h-6 bg-gray-300 rounded-full flex items-center px-1"><div className="w-4 h-4 bg-white rounded-full"></div></div>
               </div>
            </div>
          </div>
          
           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4">Database Connection</h3>
            <p className="text-xs text-gray-500 mb-4">
                Current: {localStorage.getItem('cardkeeper_sb_url') ? 'Custom Configuration' : 'Default'}
            </p>
            <button 
                onClick={handleSwitchDatabase}
                className="w-full py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              Switch Database Account
            </button>
          </div>

           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4">Export Data</h3>
            <button className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors">
              Download Full CSV Backup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};