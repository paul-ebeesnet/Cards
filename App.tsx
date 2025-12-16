import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { AddEntry } from './pages/AddEntry';
import { Cards } from './pages/Cards';
import { CardDetails } from './pages/CardDetails';
import { Transactions } from './pages/Transactions';
import { Login } from './pages/Login';
import { Setup } from './pages/Setup';
import { AdminDashboard } from './pages/AdminDashboard';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';

const ProtectedRoute = ({ children, requireAdmin = false }: { children?: React.ReactNode, requireAdmin?: boolean }) => {
  const [session, setSession] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // 1. Check Configuration First
    if (!isSupabaseConfigured()) {
        setLoading(false);
        return; // Will be handled by the Router to redirect to /setup
    }

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        setSession(session);

        if (session) {
          // Check role
          const { data, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

          if (!mounted) return;

          if (error) {
            console.error("ProtectedRoute: Profile fetch error", error);
            // Detect Infinite Recursion specifically
            if (error.message?.includes("infinite recursion") || error.code === '42P17') {
                setDbError("Database Policy Error: Infinite Recursion detected.");
            }
          }
          console.log("ProtectedRoute: User Role check:", data?.role);
          setIsAdmin(data?.role === 'admin');
        }
      } catch (err) {
        console.error("ProtectedRoute: Error", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    checkSession();

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setSession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [requireAdmin]);

  // --- CONFIG CHECK ---
  if (!isSupabaseConfigured()) {
      return <Navigate to="/setup" replace />;
  }

  // --- CRITICAL ERROR STATE ---
  if (dbError) {
      return (
          <div className="h-screen flex flex-col items-center justify-center p-8 bg-red-50 text-red-900 text-center">
              <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm border border-red-200">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                     <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  </div>
                  <h3 className="text-lg font-bold mb-2">Setup Required</h3>
                  <p className="text-sm text-gray-600 mb-4">
                      The application cannot verify your profile due to a database policy error (Infinite Recursion).
                  </p>
                  <p className="text-xs bg-gray-100 p-3 rounded-lg font-mono text-left mb-4 break-words">
                      Fix: Run the SQL script provided in <code>services/supabaseClient.ts</code> in your Supabase SQL Editor.
                  </p>
                  <button 
                    onClick={() => window.location.reload()}
                    className="w-full py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700"
                  >
                      I Fixed It, Retry
                  </button>
              </div>
          </div>
      );
  }

  if (loading) return <div className="h-screen flex items-center justify-center text-primary font-bold animate-pulse">Loading CardKeeper...</div>;

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <div className="p-8 text-center text-gray-500 mt-10">
      <div className="mb-4 text-4xl">🔒</div>
      <h3 className="text-lg font-bold text-gray-800">Access Denied</h3>
      <p className="mb-4">Admin rights required.</p>
      <button onClick={() => window.history.back()} className="text-primary hover:underline">Go Back</button>
    </div>;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/setup" element={<Setup />} />
        
        {/* Protected Routes inside Layout */}
        <Route path="/*" element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/add" element={<AddEntry />} />
                <Route path="/edit/:id" element={<AddEntry />} />
                <Route path="/cards" element={<Cards />} />
                <Route path="/cards/:id" element={<CardDetails />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/admin" element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminDashboard />
                  </ProtectedRoute>
                } />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </HashRouter>
  );
};

export default App;