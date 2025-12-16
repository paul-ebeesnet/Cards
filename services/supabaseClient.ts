import { createClient } from '@supabase/supabase-js';

// --- CONFIGURATION MANAGEMENT ---
const STORAGE_KEY_URL = 'cardkeeper_sb_url';
const STORAGE_KEY_KEY = 'cardkeeper_sb_key';

// Default / Fallback keys (Previous default)
const DEFAULT_URL = 'https://wwwvxhcrbjpmqithedxx.supabase.co';

// Safely access process.env to avoid runtime crashes in browsers where process might be defined but empty
const getEnv = (key: string) => {
  try {
    if (typeof process !== 'undefined' && process && process.env) {
      return process.env[key];
    }
  } catch (e) {
    // Ignore error
  }
  return undefined;
};

const DEFAULT_KEY = getEnv('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3d3Z4aGNyYmpwbXFpdGhlZHh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxOTIxMTQsImV4cCI6MjA4MDc2ODExNH0.Ugc7ZPeh8WJEMjL-ua2TmRqR44Jc0z05m3SMaeRI52M';

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
  
  -- 1. Profiles Table
  create table if not exists profiles (
    id uuid references auth.users on delete cascade primary key,
    email text,
    role text default 'user'
  );

  -- 2. Cards Table (Updated with card_type)
  create table if not exists cards (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users on delete cascade not null,
    store_name text not null,
    card_number text,
    current_balance numeric default 0,
    last_updated timestamptz default now(),
    card_type text default 'prepaid'
  );

  -- 3. Transactions Table (Updated with notes)
  create table if not exists transactions (
    id uuid default gen_random_uuid() primary key,
    card_id uuid references cards on delete cascade not null,
    user_id uuid references auth.users on delete cascade not null,
    amount numeric not null,
    balance_after numeric,
    date date not null,
    type text check (type in ('consumption', 'recharge')),
    raw_text text,
    notes text, -- NEW COLUMN
    created_at timestamptz default now()
  );

  -- 4. Enable RLS and Policies (Standard Supabase setup)
  alter table profiles enable row level security;
  alter table cards enable row level security;
  alter table transactions enable row level security;

  -- (Add policies allowing users to select/insert/update/delete their own rows)
*/