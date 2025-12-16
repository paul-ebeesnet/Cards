import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [helperMessage, setHelperMessage] = useState<string | null>(null);
  const [showResetButton, setShowResetButton] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            navigate('/');
        }
    };
    checkSession();

    const handleKeyDown = (e: KeyboardEvent) => {
        // Safety check: ensure getModifierState exists before calling it
        if (typeof e.getModifierState === 'function' && e.getModifierState('CapsLock')) {
            setCapsLockOn(true);
        } else {
            setCapsLockOn(false);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    setLoading(true);
    setError(null);
    setHelperMessage(null);
    setShowResetButton(false);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
        setError("Please enter both email and password.");
        setLoading(false);
        return;
    }

    try {
      if (activeTab === 'signin') {
        // --- SIGN IN ---
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        
        if (error) throw error;
        
        // Successful Login
        navigate('/');

      } else {
        // --- SIGN UP ---
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          }
        });
        
        if (error) throw error;

        if (data.session) {
          // Auto-login (Email confirmation disabled)
          navigate('/');
        } else {
          // Confirmation required
          alert("Registration successful! Please check your email.");
          setActiveTab('signin');
          setHelperMessage("✓ Account created successfully.\nIMPORTANT: You must click the link sent to your email before you can log in.");
        }
      }
    } catch (err: any) {
      console.error(err);
      let msg = err.message || 'An error occurred';
      const lowerMsg = msg.toLowerCase();
      
      // DIAGNOSTICS & USER GUIDANCE
      if (lowerMsg.includes("invalid login credentials")) {
        msg = "Login Failed";
        setShowResetButton(true);
        setHelperMessage(
          "This usually means the password is wrong, OR the email is not confirmed yet.\n\n" +
          "1. Did you verify your email? Check your inbox/spam for a confirmation link.\n" +
          "2. Check for typos in your email.\n" +
          "3. If you forgot your password, use the Reset button below."
        );
      } else if (lowerMsg.includes("user already registered")) {
        msg = "Account already exists";
        setHelperMessage("You are trying to Sign Up, but this email is already taken.\nPlease switch to the 'Sign In' tab.");
      } else if (lowerMsg.includes("email not confirmed")) {
        msg = "Email Not Confirmed";
        setHelperMessage("You must click the link in the email sent to you to activate your account.");
      }
      
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) return setError("Enter email first.");
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim().toLowerCase() });
      if (error) throw error;
      alert("Confirmation sent!");
      setHelperMessage("Check your inbox/spam for the confirmation link.");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
      if (!email) return setError("Enter email first.");
      setLoading(true);
      try {
          const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
              redirectTo: window.location.origin,
          });
          if (error) throw error;
          alert("Reset link sent to your email.");
          setHelperMessage("✓ Check your email for the password reset link.");
          setError(null);
          setShowResetButton(false);
      } catch(e: any) {
          setError(e.message);
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-primary to-emerald-800">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in relative">
        
        {/* Tabs */}
        <div className="flex border-b border-gray-100">
            <button 
                onClick={() => { setActiveTab('signin'); setError(null); setHelperMessage(null); }}
                className={`flex-1 py-4 text-sm font-bold transition-colors ${activeTab === 'signin' ? 'text-primary border-b-2 border-primary bg-gray-50' : 'text-gray-400 hover:text-gray-600'}`}
            >
                Sign In
            </button>
            <button 
                onClick={() => { setActiveTab('signup'); setError(null); setHelperMessage(null); }}
                className={`flex-1 py-4 text-sm font-bold transition-colors ${activeTab === 'signup' ? 'text-primary border-b-2 border-primary bg-gray-50' : 'text-gray-400 hover:text-gray-600'}`}
            >
                Sign Up
            </button>
        </div>

        <div className="p-8 pt-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Nexus Cards 智匯卡</h2>
            <p className="text-gray-500 text-xs mt-1">
                {activeTab === 'signin' ? 'Welcome back' : 'Create a new account'}
            </p>
          </div>

          {/* Error / Status Box */}
          {(error || helperMessage) && (
            <div className={`text-xs p-4 rounded-lg mb-6 border font-medium shadow-inner ${error ? 'bg-red-50 text-red-700 border-red-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
              {error && (
                <p className="font-bold text-sm mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {error}
                </p>
              )}
              {helperMessage && <p className="whitespace-pre-line leading-relaxed opacity-90">{helperMessage}</p>}

              <div className="mt-3 flex flex-col gap-2">
                 {showResetButton && activeTab === 'signin' && (
                    <button onClick={handleForgotPassword} className="w-full py-2 bg-white border border-red-200 text-red-700 rounded shadow-sm hover:bg-red-50 font-bold transition-colors">
                        Reset Password
                    </button>
                 )}
                 {(error === "Email Not Confirmed" || (helperMessage && helperMessage.includes("confirmed"))) && activeTab === 'signin' && (
                    <button onClick={handleResendConfirmation} className="w-full py-2 bg-white border border-blue-200 text-blue-700 rounded shadow-sm hover:bg-blue-50 font-bold transition-colors">
                        Resend Confirmation Email
                    </button>
                 )}
              </div>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
              <input
                type="email"
                required
                className="w-full p-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div className="relative">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex justify-between">
                  <span>Password</span>
                  {activeTab === 'signin' && !showResetButton && (
                      <button type="button" onClick={handleForgotPassword} className="text-gray-400 hover:text-primary font-normal normal-case">
                          Forgot?
                      </button>
                  )}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  className={`w-full p-3 rounded-xl border focus:ring-2 focus:ring-primary/20 outline-none transition-all pr-10 ${capsLockOn ? 'border-orange-400 ring-2 ring-orange-100' : 'border-gray-200 focus:border-primary'}`}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
              {capsLockOn && (
                  <div className="absolute -bottom-5 right-0 text-[10px] text-orange-500 font-bold flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      CAPS LOCK IS ON
                  </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 text-white font-bold rounded-xl shadow-lg transition-all transform active:scale-95 disabled:opacity-50 disabled:scale-100 ${
                  activeTab === 'signin' ? 'bg-primary hover:bg-emerald-600' : 'bg-secondary hover:bg-blue-600'
              }`}
            >
              {loading ? 'Processing...' : (activeTab === 'signin' ? 'Sign In' : 'Create Account')}
            </button>
          </form>
        </div>
      </div>
      
      <div className="mt-8 text-center text-white/50 text-xs space-y-2">
          <p>Secure Login via Supabase</p>
          <div>
            <p>Powered by Paul Chang @ <a href="https://www.ebeesnet.com" target="_blank" rel="noopener noreferrer" className="hover:text-white underline decoration-white/30 hover:decoration-white transition-all">eBees Network</a></p>
            <p className="opacity-70 mt-1 font-mono text-[10px]">Version 1.1.0</p>
          </div>
      </div>
    </div>
  );
};