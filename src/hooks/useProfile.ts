import { useEffect, useState } from 'react';
import { useAuthStore } from '../store';
import { supabase } from '../lib/supabase';
import type { UserProfile } from '../types';

export function useProfile() {
  const { profile, updateProfile, checkAuth, isLoading } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return { profile, updateProfile, isLoading };
}