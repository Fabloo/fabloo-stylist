import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { UserProfile, BodyShape, SkinTone } from '../types';

interface CartItem {
  id: string;
  quantity: number;
  inventory_items: {
    id: string;
    name: string;
    description: string;
    price: number;
    image_url: string;
    image_url_2: string;
    image_url_3: string;
    sizes: string[];
    body_shapes: string[];
    color_tones: string[];
    dress_type: string[];
    stock: number;
  };
}

interface AuthState {
  isAuthenticated: boolean;
  user: any | null;
  isLoading: boolean;
  profile: UserProfile | null;
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
export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  user: null,
  isLoading: true,
  profile: null,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setProfile: (profile) => set({ profile }),
  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null, isAuthenticated: false, isLoading: false });
  },
  checkAuth: async () => {
    try {
      set({ isLoading: true });
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        set({ user: null, profile: null, isAuthenticated: false, isLoading: false });
        return;
      }

      const { data: dbProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      // Map database profile fields to app profile fields
      let appProfile = null;
      if (dbProfile) {
        appProfile = {
          id: dbProfile.id,
          // Map body_shape to bodyShape
          bodyShape: dbProfile.body_shape as BodyShape | undefined,
          // Map skin_tone to skinTone
          skinTone: dbProfile.skin_tone as SkinTone | undefined,
          // Keep other fields as they are
          ...dbProfile
        };
      }

      set({ 
        user: session.user,
        profile: appProfile,
        isAuthenticated: true,
        isLoading: false
      });
    } catch (error) {
      console.error('Auth check error:', error);
      set({ user: null, profile: null, isAuthenticated: false, isLoading: false });
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
}));

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
          inventory_items (
            id,
            name,
            description,
            price,
            image_url,
            image_url_2,
            image_url_3,
            sizes,
            body_shapes,
            color_tones,
            dress_type,
            stock
          )
        `)
        .eq('user_id', session.user.id);

      if (error) throw error;
      set({ items: data as CartItem[] || [] });
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