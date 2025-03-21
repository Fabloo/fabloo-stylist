import React, { useState } from 'react';
import { AuthError } from '@supabase/supabase-js';
import { Mail, Lock, UserPlus, LogIn, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useEffect } from 'react';

type Props = {
  onSuccess: () => void;
};

export function Auth({ onSuccess }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        onSuccess();
      }
    } catch (err) {
      console.error('Session check error:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const credentials = {
        email: email.trim(),
        password: password.trim(),
      };

      let authResponse;
      if (isSignUp) {
        authResponse = await supabase.auth.signUp(credentials);
      } else {
        authResponse = await supabase.auth.signInWithPassword(credentials);
      }

      const { data: authData, error: authError } = authResponse;
      
      if (authError) {
        if (authError instanceof AuthError) {
          if (authError.message === 'Invalid login credentials') {
            throw new Error('Invalid email or password');
          }
        }
        throw new Error(authError.message);
      }
      
      if (!authData?.user) {
        throw new Error('No user data received. Please try again.');
      }

      // Create profile for new users
      if (isSignUp) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert([{ id: authData.user.id }], { onConflict: 'id' });

        if (profileError) throw profileError;
      }
      
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {isSignUp ? 'Create an Account' : 'Welcome Back'}
        </h2>
      </div>
      
      <p className="text-gray-600 mb-8">
        {isSignUp 
          ? 'Create an account to start your style journey'
          : 'Sign in to continue your style journey'
        }
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-lg
                   hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            'Please wait...'
          ) : isSignUp ? (
            <>
              <UserPlus className="w-5 h-5" />
              Create Account
            </>
          ) : (
            <>
              <LogIn className="w-5 h-5" />
              Sign In
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => setIsSignUp(!isSignUp)}
          className="w-full text-center text-sm text-gray-600 hover:text-gray-900"
        >
          {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
        </button>
      </form>
    </div>
  );
}