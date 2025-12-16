import { createClient } from '@supabase/supabase-js';

// --- CONFIGURATION MANAGEMENT ---
const STORAGE_KEY_URL = 'cardkeeper_sb_url';
const STORAGE_KEY_KEY = 'cardkeeper_sb_key';

// Default / Fallback keys (Previous default)
const DEFAULT_URL = 'https://wwwvxhcrbjpmqithedxx.supabase.co';
const DEFAULT_KEY = (typeof process !== 'undefined' && process.env.SUPABASE_ANON_KEY) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3d3Z4aGNyYmpwbXFpdGhlZHh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxOTIxMTQsImV4cCI6MjA4MDc2ODExNH0.Ugc7ZPeh8WJEMjL-ua2TmRqR44Jc0z05m3SMaeRI52M';

// 1. Try LocalStorage (User Config), 2. Try Env/Default
const getStoredUrl = () => localStorage.getItem(STORAGE_KEY_URL) || DEFAULT_URL;
const getStoredKey = () => localStorage.getItem(STORAGE_KEY_KEY) || DEFAULT_KEY;

export const supabase = createClient(getStoredUrl(), getStoredKey(), {
  auth: {
    persistSession: true,
  }
});

export const isSupabaseConfigured = () => {
  const url = getStoredUrl();
  const key = getStoredKey();
  return url && key && url !== 'your-project-url' && key !== 'your-anon-public-key-here';
};

export const updateSupabaseConfig = (url: string, key: string) => {
  localStorage.setItem(STORAGE_KEY_URL, url.trim());
  localStorage.setItem(STORAGE_KEY_KEY, key.trim());
  // Force reload to re-initialize client
  window.location.reload();
};

export const resetSupabaseConfig = () => {
  localStorage.removeItem(STORAGE_KEY_URL);
  localStorage.removeItem(STORAGE_KEY_KEY);
  // Optional: Clear session data too if switching accounts
  localStorage.removeItem('sb-access-token'); 
  localStorage.removeItem('sb-refresh-token');
  window.location.reload();
};

/* 
  --- SQL SETUP REQUIRED (RUN THIS IN SUPABASE SQL EDITOR) ---
  (Same as before, ensure these tables exist in your NEW project if you switch accounts)
  
  create table if not exists profiles ( ... );
  create table if not exists cards ( ... );
  create table if not exists transactions ( ... );
  ... (policies) ...
*/