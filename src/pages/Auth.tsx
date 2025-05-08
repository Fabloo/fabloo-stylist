import React, { useEffect, useState } from 'react';
import { Phone, ArrowRight, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store';
import { useAuth } from '../hooks/useAuth';

type Props = {
  onSuccess: () => void;
};

export function Auth({ onSuccess }: Props) {
  const [phone, setPhone] = useState('+91');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(false);

  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      onSuccess();
    }
  }, [isAuthenticated, onSuccess]);

  const handleDirectSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Create a random password for the user
      const randomPassword = Math.random().toString(36).slice(-8);
      
      // Sign up the user directly
      const { data, error: signupError } = await supabase.auth.signUp({
        phone: phone.trim(),
        password: randomPassword,
      });
      
      if (signupError) throw signupError;
      
      if (!data.user) {
        throw new Error('Failed to create user. Please try again.');
      }

      console.log('User created:', data.user);

      // Set the user in the auth store
      useAuthStore.getState().setUser(data.user);

      // Create/update profile with default values
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert([{ 
          id: data.user.id,
          address_line1: null,
          address_line2: null,
          city: null,
          state: null,
          pincode: null
        }], { onConflict: 'id' });

      if (profileError) throw profileError;
      
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        phone: phone.trim(),
        password: password.trim(),
      });
      
      if (error) throw error;
      
      if (!data.user) {
        throw new Error('Login failed. Please check your credentials.');
      }

      console.log('User logged in:', data.user);
      
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto h-full bg-white p-8 rounded-xl shadow-sm">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {isLogin ? 'Login with Phone' : 'Sign In with Phone'}
        </h2>
        <p className="text-gray-600 mt-2">
          {isLogin 
            ? 'Enter your phone number and password to login'
            : 'Enter your phone number to continue'
          }
        </p>
      </div>

      <form onSubmit={isLogin ? handleLogin : handleDirectSignup} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 XXXXX XXXXX"
              maxLength={13}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
        </div>

        {isLogin && (
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
                placeholder="Your password"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#B252FF] to-[#F777F7] text-white rounded-lg
                   hover:opacity-90 transition-opacity duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            'Please wait...'
          ) : (
            <>
              {isLogin ? 'Login' : 'Continue'}
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setIsLogin(!isLogin);
            setError(null);
          }}
          className="w-full text-center text-sm text-gray-600 hover:text-gray-900"
        >
          {isLogin ? 'New user? Sign up instead' : 'Already have an account? Login'}
        </button>
      </form>
    </div>
  );
}