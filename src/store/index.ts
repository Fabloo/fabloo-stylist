import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { UserProfile, BodyShape, SkinTone } from '../types';

interface CartItem {
  id: string;
  quantity: number;
  size_selected: string | null;
  inventory_items: {
    id: string;
    name: string;
    description: string;
    price: number;
    image_url: string;
    stock: number;
    brands?: {
      id: string;
      Name: string;
      logo: string;
      return_policy: string;
      delivery_time: string;
    };
  };
}

interface AuthState {
  isAuthenticated: boolean;
  user: any | null;
  isLoading: boolean;
  profile: UserProfile | null;
  isAdmin: boolean;
  setUser: (user: any) => void;
  setProfile: (profile: UserProfile) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

interface CartState {
  items: CartItem[];
  isLoading: boolean;
  error: string | null;
  fetchCart: () => Promise<void>;
  addToCart: (itemId: string, quantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
}

interface StyleState {
  bodyShape: BodyShape | null;
  skinTone: SkinTone | null;
  setBodyShape: (shape: BodyShape) => void;
  setSkinTone: (tone: SkinTone) => void;
  clearStyle: () => void;
}

// Create separate stores for different domains
export const useAuthStore = create<AuthState>((set, get) => {
  // Helper function to process an authenticated user
  const processAuthenticatedUser = async (session: any) => {
    if (!session?.user) {
      throw new Error('Invalid session');
    }
    
    try {
      // Check if user has admin role
      const isAdmin = 
        session.user?.role === 'admin' || 
        session.user?.user_metadata?.role === 'admin';

      // Fetch user profile
      const { data: dbProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      let appProfile = null;
      if (dbProfile) {
        appProfile = {
          id: dbProfile.id,
          bodyShape: dbProfile.body_shape as BodyShape | undefined,
          skinTone: dbProfile.skin_tone as SkinTone | undefined,
          // Include all database fields
          ...dbProfile
        };
      }

      set({ 
        user: session.user,
        profile: appProfile,
        isAuthenticated: true,
        isLoading: false,
        isAdmin: isAdmin
      });
      
      console.log('Auth check completed:', {
        user: session.user?.id,
        isAuthenticated: true,
        hasProfile: !!appProfile
      });
    } catch (error) {
      console.error('Error processing authenticated user:', error);
      throw error;
    }
  };

  return {
    isAuthenticated: false,
    user: null,
    isLoading: true,
    profile: null,
    isAdmin: false,
    setUser: (user) => {
      // const isAdmin = user?.role === 'admin' || user?.user_metadata?.role === 'admin';
      set({ user : user, isAuthenticated: !!user, isAdmin : false });
    },
    setProfile: (profile) => set({ profile }),
    logout: async () => {
      await supabase.auth.signOut();
      localStorage.removeItem('supabase.auth.token');
      set({ user: null, profile: null, isAuthenticated: false, isLoading: false, isAdmin: false });
    },
    checkAuth: async () => {
      try {
        set({ isLoading: true });
        
        // Get active session from Supabase
        const { data: { session }, error } = await supabase.auth.getSession();
        
        // If we have an active session, use it
        if (session?.user) {
          console.log('Active session found, user authenticated:', session.user.id);
          await processAuthenticatedUser(session);
          return;
        }
        
        // If no active session, check for stored token
        const tokenString = localStorage.getItem('supabase.auth.token');
        if (!tokenString) {
          console.log('No token found, user is not authenticated');
          set({ 
            user: null, 
            profile: null, 
            isAuthenticated: false, 
            isLoading: false, 
            isAdmin: false 
          });
          return;
        }
        
        console.log('Token found, attempting to use it for authentication');
        
        try {
          // Parse the stored token
          const tokenData = JSON.parse(tokenString);
          const userId = tokenData.userId || tokenData.user_id;
          
          if (!userId) {
            throw new Error('Invalid token: no user ID found');
          }
          
          // Create a manual user object
          const manualUser = {
            id: userId,
            phone: tokenData.phone || '',
            aud: 'authenticated',
            role: 'authenticated'
          };
          
          // Set basic authentication state
          set({ 
            user: manualUser, 
            isAuthenticated: true, 
            isLoading: false 
          });
          
          // Try to fetch profile for this user
          console.log('Fetching profile data for user:', userId);
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
          
          if (profileData) {
            console.log('Profile found for user');
            const profile = {
              id: profileData.id,
              bodyShape: profileData.body_shape as BodyShape | undefined,
              skinTone: profileData.skin_tone as SkinTone | undefined,
              ...profileData
            };
            
            set({ profile });
          } else {
            console.warn('No profile found for user:', userId);
          }
        } catch (tokenError) {
          console.error('Error processing stored token:', tokenError);
          
          // Clear invalid token
          localStorage.removeItem('supabase.auth.token');
          
          set({ 
            user: null, 
            profile: null, 
            isAuthenticated: false, 
            isLoading: false, 
            isAdmin: false 
          });
        }
      } catch (error) {
        console.error('Auth check error:', error);
        set({ 
          user: null, 
          profile: null, 
          isAuthenticated: false, 
          isLoading: false, 
          isAdmin: false 
        });
      }
    },
    updateProfile: async (updates) => {
      const { user, profile } = get();
      if (!user) return;

      try {
        // Prepare database fields from updates
        const dbUpdates: any = {};
        
        // Handle body shape - database field is body_shape
        if (updates.bodyShape) {
          dbUpdates.body_shape = updates.bodyShape;
        }
        
        // Handle skin tone - database field is skin_tone (stored as JSONB)
        if (updates.skinTone) {
          dbUpdates.skin_tone = updates.skinTone;
        }
        
        const { data, error } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            ...dbUpdates,
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;
        
        // Add the updates to the current profile
        const updatedProfile = {
          ...profile,
          ...updates,
          // Add these fields to match database columns for consistency
          body_shape: updates.bodyShape || profile?.bodyShape,
          skin_tone: updates.skinTone || profile?.skinTone
        };
        
        set({ profile: updatedProfile });
      } catch (error) {
        console.error('Profile update error:', error);
        throw error;
      }
    }
  };
});

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,
  fetchCart: async () => {
    try {
      set({ isLoading: true, error: null });
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        set({ items: [] });
        return;
      }

      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          id,
          quantity,
          size_selected,
          inventory_items!inner (
            id,
            name,
            description,
            price,
            image_url,
            stock,
            brands:inventory_items_brand_id_fkey (
              id,
              Name,
              logo,
              return_policy,
              delivery_time
            )
          )
        `)
        .eq('user_id', session.user.id);

      if (error) throw error;
      // Cast the data to unknown first to handle type conversion
      set({ items: (data as unknown) as CartItem[] || [] });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to fetch cart' });
      console.error('Cart fetch error:', err);
    } finally {
      set({ isLoading: false });
    }
  },
  addToCart: async (itemId: string, quantity: number) => {
    try {
      set({ error: null });
      set({ isLoading: true });
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Please sign in to add items to cart');

      // First check if item exists
      const { data: existingItem, error: checkError } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('item_id', itemId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingItem) {
        // Update quantity of existing item
        const { error: updateError } = await supabase
          .from('cart_items')
          .update({ quantity: existingItem.quantity + quantity })
          .eq('id', existingItem.id);

        if (updateError) throw updateError;
      } else {
        // Insert new item
        // Add new item to cart
        const { error: insertError } = await supabase
          .from('cart_items')
          .insert([{
            user_id: session.user.id,
            item_id: itemId,
            quantity
          }]);

        if (insertError) throw insertError;
      }

      // Immediately fetch updated cart items
      await get().fetchCart();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to add to cart' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },
  removeFromCart: async (itemId: string) => {
    try {
      set({ error: null });
      set({ isLoading: true });
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      
      // Fetch updated cart items
      await get().fetchCart();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to remove item' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },
  clearCart: async () => {
    try {
      set({ error: null });
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', session.user.id);

      if (error) throw error;
      set({ items: [] });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to clear cart' });
      throw err;
    }
  }
}));

export const useStyleStore = create<StyleState>((set) => ({
  bodyShape: null,
  skinTone: null,
  setBodyShape: (shape) => set({ bodyShape: shape }),
  setSkinTone: (tone) => set({ skinTone: tone }),
  clearStyle: () => set({ bodyShape: null, skinTone: null })
}));