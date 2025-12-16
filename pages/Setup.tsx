import React, { useState } from 'react';
import { updateSupabaseConfig, isSupabaseConfigured } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';

export const Setup: React.FC = () => {
  const navigate = useNavigate();
  // If already configured, fill with current values (masked for key)
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !key) return alert("Please enter both URL and Key");
    
    setIsSaving(true);
    // Simple validation
    if (!url.startsWith('http')) {
        alert("URL must start with https://");
        setIsSaving(false);
        return;
    }

    try {
        updateSupabaseConfig(url, key);
        // Page will reload via the service
    } catch (e) {
        setIsSaving(false);
        alert("Failed to save config");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden p-8">
        <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800">Connect Database</h1>
            <p className="text-gray-500 text-sm mt-2">
                Enter your Supabase credentials to connect the app to your account.
            </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Project URL</label>
                <input 
                    type="url" 
                    placeholder="https://xyz.supabase.co"
                    className="w-full p-3 border border-gray-200 rounded-xl focus:border-primary outline-none"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    required
                />
            </div>
            
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Anon Public Key</label>
                <input 
                    type="password" 
                    placeholder="eyJhbGciOiJIUzI1NiIsIn..."
                    className="w-full p-3 border border-gray-200 rounded-xl focus:border-primary outline-none font-mono text-sm"
                    value={key}
                    onChange={e => setKey(e.target.value)}
                    required
                />
            </div>

            <div className="bg-blue-50 p-4 rounded-xl text-xs text-blue-700 leading-relaxed">
                <strong>Where to find these?</strong><br/>
                1. Go to <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline">Supabase Dashboard</a><br/>
                2. Select your project<br/>
                3. Go to <strong>Project Settings</strong> → <strong>API</strong><br/>
            </div>

            <button 
                type="submit" 
                disabled={isSaving}
                className="w-full py-3.5 bg-primary hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95"
            >
                {isSaving ? 'Connecting...' : 'Save & Connect'}
            </button>
            
            {isSupabaseConfigured() && (
                <button 
                    type="button"
                    onClick={() => navigate('/login')}
                    className="w-full py-2 text-gray-400 text-sm hover:text-gray-600"
                >
                    Cancel / Go Back
                </button>
            )}
        </form>
      </div>
    </div>
  );
};