import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { supabase } from '../lib/supabase';

export function useAuth(redirectTo?: string) {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, user, checkAuth } = useAuthStore();
  const [authInitialized, setAuthInitialized] = useState(false);

  // Log auth state for debugging
  console.log('useAuth hook - Auth state:', { isAuthenticated, isLoading });

  // Check authentication status on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        // First check if we have an active Supabase session
        const { data } = await supabase.auth.getSession();
        
        if (data.session) {
          console.log('Active session found, user authenticated');
        } else {
          console.log('No active session, checking for stored token');
          
          // Check if we have a token in localStorage
          const storedToken = localStorage.getItem('supabase.auth.token');
          if (storedToken && !isAuthenticated) {
            console.log('Token found in localStorage, running checkAuth');
            await checkAuth();
          }
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
      } finally {
        setAuthInitialized(true);
      }
    };
    
    initAuth();
  }, [checkAuth, isAuthenticated]);

  // Handle redirect if needed
  useEffect(() => {
    if (authInitialized && !isLoading && !isAuthenticated && redirectTo) {
      console.log('Not authenticated, redirecting to:', redirectTo);
      navigate(redirectTo);
    }
  }, [authInitialized, isAuthenticated, isLoading, navigate, redirectTo]);

  return { isAuthenticated, isLoading };
}