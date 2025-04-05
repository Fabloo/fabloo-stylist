import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface WishlistItem {
  id: string;
  name: string;
  price: number;
  description: string;
  image_url: string;
  user_id?: string;
  item_id?: string;
  created_at?: string;
}

export const useWishlist = () => {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Function to get the current user's ID
  const getCurrentUserId = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const currentUserId = session?.user?.id || null;
    setUserId(currentUserId); // Store userId in state
    return currentUserId;
  };

  const fetchWishlistItems = async () => {
    try {
      console.log('Fetching wishlist items...');
      setLoading(true);
      
      // Check if user is authenticated
      const currentUserId = await getCurrentUserId();
      
      if (!currentUserId) {
        console.log('No active session, returning empty wishlist');
        setWishlistItems([]);
        setLoading(false);
        return;
      }
      
      console.log('User ID:', currentUserId);
      
      // Query wishlist items for the current user
      const { data, error: fetchError } = await supabase
        .from('wishlist_items')
        .select(`
          id,
          item_id,
          user_id,
          created_at,
          inventory_items:item_id (
            id,
            name,
            description,
            price,
            image_url
          )
        `)
        .eq('user_id', currentUserId);

      if (fetchError) {
        console.error('Error fetching wishlist items:', fetchError);
        throw fetchError;
      }

      console.log('Raw wishlist data:', data);

      // Transform the data to match WishlistItem interface
      const transformedItems: WishlistItem[] = [];
      
      if (data && Array.isArray(data)) {
        for (const item of data) {
          // Using any type assertion since we know the structure but TypeScript doesn't
          const inventoryItem = (item.inventory_items as any);
          if (inventoryItem && typeof inventoryItem === 'object') {
            transformedItems.push({
              id: item.id,
              item_id: item.item_id,
              user_id: item.user_id,
              created_at: item.created_at,
              name: inventoryItem.name,
              price: inventoryItem.price,
              description: inventoryItem.description,
              image_url: inventoryItem.image_url
            });
          }
        }
      }

      console.log('Transformed wishlist items:', transformedItems);
      setWishlistItems(transformedItems);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch wishlist items';
      setError(errorMessage);
      console.error('Error fetching wishlist:', err);
    } finally {
      setLoading(false);
    }
  };

  // useEffect(() => {
  //   // Initial fetch
  //   fetchWishlistItems().then(() => {
  //     console.log('Initial wishlist fetch complete');
  //   });

  //   // Set up auth state change listener
  //   const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
  //     console.log('Auth state changed:', event);
  //     if (event === 'SIGNED_IN') {
  //       const newUserId = session?.user?.id;
  //       setUserId(newUserId || null);
  //       await fetchWishlistItems();
  //     } else if (event === 'SIGNED_OUT') {
  //       setUserId(null);
  //       setWishlistItems([]);
  //     }
  //   });

  //   return () => {
  //     console.log('Cleaning up auth listener');
  //     authListener.subscription.unsubscribe();
  //   };
  // }, []);

  // Set up real-time subscription whenever userId changes
  useEffect(() => {
    if (!userId) {
      console.log('No user ID, not setting up subscription');
      return;
    }

    console.log('Setting up wishlist subscription for user:', userId);
    
    // Set up real-time subscription for wishlist changes
    const channel = supabase
      .channel(`wishlist_changes_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wishlist_items',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Wishlist change detected:', payload);
          
          // Handle different events directly instead of always refetching
          if (payload.eventType === 'INSERT') {
            fetchWishlistItems(); // For inserts, refetch to get joined data
          } 
          else if (payload.eventType === 'DELETE') {
            // For deletes, just update the local state
            const deletedId = payload.old?.id;
            if (deletedId) {
              console.log('Removing deleted item from state:', deletedId);
              setWishlistItems(prev => prev.filter(item => item.id !== deletedId));
            } else {
              // If we can't determine what was deleted, refetch everything
              fetchWishlistItems();
            }
          } 
          else if (payload.eventType === 'UPDATE') {
            // For updates, refetch everything for simplicity
            fetchWishlistItems();
          }
        }
      )
      .subscribe();

    console.log('Wishlist subscription set up');

    return () => {
      console.log('Cleaning up wishlist subscription');
      channel.unsubscribe();
    };
  }, [userId]);

  const addToWishlist = async (item: { id: string; name?: string; price?: number; description?: string; image_url?: string }) => {
    try {
      console.log('Adding item to wishlist:', item);
      setError(null);
      
      // Check if user is authenticated
      const currentUserId = await getCurrentUserId();
      if (!currentUserId) {
        throw new Error('Please sign in to add items to wishlist');
      }
      
      // Check if item already exists in wishlist
      const { data: existingItem, error: checkError } = await supabase
        .from('wishlist_items')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('item_id', item.id)
        .maybeSingle();
      
      if (checkError) {
        console.error('Error checking for existing item:', checkError);
        throw checkError;
      }
      
      if (existingItem) {
        console.log('Item already in wishlist');
        return; // Item already in wishlist, no need to add again
      }
      
      // Add item to wishlist
      const { data: insertData, error: insertError } = await supabase
        .from('wishlist_items')
        .insert({
          user_id: currentUserId,
          item_id: item.id
        })
        .select();

      if (insertError) {
        console.error('Error inserting item into wishlist:', insertError);
        throw insertError;
      }
      
      console.log('Item added to wishlist successfully:', insertData);

      // Optimistically update local state with preliminary data
      if (insertData && insertData.length > 0 && item.name && item.price && item.image_url) {
        const newItem: WishlistItem = {
          id: insertData[0].id,
          item_id: item.id,
          user_id: currentUserId,
          name: item.name,
          price: item.price,
          description: item.description || '',
          image_url: item.image_url,
          created_at: new Date().toISOString()
        };
        
        setWishlistItems(prev => [...prev, newItem]);
      } else {
        // If we don't have complete data, fetch everything
        await fetchWishlistItems();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add item to wishlist';
      setError(errorMessage);
      console.error('Error adding to wishlist:', err);
      throw err; // Re-throw for component handling
    }
  };

  const removeFromWishlist = async (id: string) => {
    try {
      console.log('Removing item from wishlist, ID:', id);
      setError(null);
      
      // Optimistically update UI first
      setWishlistItems(prev => prev.filter(item => item.id !== id));
      
      const { error: deleteError } = await supabase
        .from('wishlist_items')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('Error deleting item from wishlist:', deleteError);
        // If delete fails, revert optimistic update by refetching
        await fetchWishlistItems();
        throw deleteError;
      }
      
      console.log('Item removed from wishlist successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove item from wishlist';
      setError(errorMessage);
      console.error('Error removing from wishlist:', err);
      throw err; // Re-throw for component handling
    }
  };

  const clearWishlist = async () => {
    try {
      console.log('Clearing entire wishlist');
      setError(null);
      
      // Check if user is authenticated
      const currentUserId = await getCurrentUserId();
      if (!currentUserId) return;
      
      // Optimistically clear the UI
      setWishlistItems([]);
      
      const { error: deleteError } = await supabase
        .from('wishlist_items')
        .delete()
        .eq('user_id', currentUserId);

      if (deleteError) {
        console.error('Error clearing wishlist:', deleteError);
        // If delete fails, revert optimistic update by refetching
        await fetchWishlistItems();
        throw deleteError;
      }
      
      console.log('Wishlist cleared successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear wishlist';
      setError(errorMessage);
      console.error('Error clearing wishlist:', err);
    }
  };

  return { 
    wishlistItems, 
    loading, 
    error, 
    addToWishlist, 
    removeFromWishlist, 
    clearWishlist,
    refreshWishlist: fetchWishlistItems
  };
};