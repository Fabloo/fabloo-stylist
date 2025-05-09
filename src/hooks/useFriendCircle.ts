import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store';
import { Friend } from '../types';
import { toast } from 'react-hot-toast';

// Define local interfaces if they don't exist in the imported module
interface SharedItem {
  id: string;
  sender_id: string;
  friend_circle_id: string;
  item_id: string;
  comment?: string;
  response_status: 'pending' | 'liked' | 'disliked';
  response_comment?: string;
  created_at: string;
  updated_at: string;
  // Additional data joined from other tables
  friend_name?: string;
  friend_phone?: string;
  item_details?: {
    name: string;
    image_url: string;
    price: number;
  };
}

type FriendStatus = 'pending' | 'joined' | 'rejected';
type SharedItemStatus = 'pending' | 'liked' | 'disliked';

// Fallback function to check if tables exist
const checkTablesExist = async () => {
  try {
    // Try to query the friend_circles table
    const { data: friendCirclesData, error: friendCirclesError } = await supabase
      .from('friend_circles')
      .select('id')
      .limit(1);
      
    // Try to query the shared_items table
    const { data: sharedItemsData, error: sharedItemsError } = await supabase
      .from('shared_items')
      .select('id')
      .limit(1);
      
    // If both queries failed with specific errors, tables likely don't exist
    const tablesExist = !(
      (friendCirclesError && friendCirclesError.code === '42P01') || 
      (sharedItemsError && sharedItemsError.code === '42P01')
    );
    
    return tablesExist;
  } catch (err) {
    console.error('Error checking tables:', err);
    return false;
  }
};

export function useFriendCircle() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [sharedItems, setSharedItems] = useState<SharedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tablesExist, setTablesExist] = useState<boolean>(true);
  const { user, isAuthenticated } = useAuthStore();

  // Check if tables exist on mount
  useEffect(() => {
    const checkTables = async () => {
      const exist = await checkTablesExist();
      setTablesExist(exist);
      
      if (!exist) {
        setError('Friend circle functionality is not available. Please run the database migrations.');
      }
    };
    
    checkTables();
  }, []);

  const fetchFriends = useCallback(async () => {
    if (!isAuthenticated || !user || !tablesExist) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('friend_circles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setFriends(data || []);
    } catch (err) {
      console.error('Error fetching friend circle:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch friends');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user, tablesExist]);
  
  const fetchSharedItems = useCallback(async () => {
    if (!isAuthenticated || !user || !tablesExist) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch shared items without joins
      const { data, error } = await supabase
        .from('shared_items')
        .select('*')
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // If no shared items, set empty array and return
      if (!data || data.length === 0) {
        setSharedItems([]);
        setLoading(false);
        return;
      }
      
      // Get all unique friend_circle_ids to fetch friend details separately
      const friendCircleIds = data
        .filter(item => item.friend_circle_id)
        .map(item => item.friend_circle_id);
      
      let friendsMap: Record<string, { friend_name: string, friend_phone: string }> = {};
      
      // Only fetch if we have some friend circle ids
      if (friendCircleIds.length > 0) {
        const { data: friendsData, error: friendsError } = await supabase
          .from('friend_circles')
          .select('id, friend_name, friend_phone')
          .in('id', friendCircleIds);
          
        if (friendsError) {
          console.warn('Error fetching friend details:', friendsError);
        } else if (friendsData) {
          // Create lookup map for friend details
          friendsMap = friendsData.reduce((acc: Record<string, any>, friend) => {
            acc[friend.id] = friend;
            return acc;
          }, {});
        }
      }
      
      // Map the data to include friend details
      const formattedData = data.map(item => ({
        ...item,
        friend_name: item.friend_circle_id && friendsMap[item.friend_circle_id] 
          ? friendsMap[item.friend_circle_id].friend_name 
          : undefined,
        friend_phone: item.friend_circle_id && friendsMap[item.friend_circle_id]
          ? friendsMap[item.friend_circle_id].friend_phone
          : undefined,
      }));
      
      setSharedItems(formattedData);
    } catch (err) {
      console.error('Error fetching shared items:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch shared items');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user, tablesExist]);
  
  // New function to fetch responses for items shared by the user
  const fetchFriendResponses = useCallback(async () => {
    if (!isAuthenticated || !user || !tablesExist) return [];
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch responses without joins
      const { data, error } = await supabase
        .from('shared_items')
        .select(`
          id,
          item_id,
          friend_circle_id,
          response_status,
          response_comment,
          updated_at
        `)
        .eq('sender_id', user.id)
        .not('response_status', 'eq', 'pending')
        .order('updated_at', { ascending: false });
        
      if (error) throw error;
      
      // If no data, return empty array
      if (!data || data.length === 0) {
        setLoading(false);
        return [];
      }
      
      // Get all unique friend_circle_ids to fetch friend details separately
      const friendCircleIds = data
        .filter(item => item.friend_circle_id)
        .map(item => item.friend_circle_id);
      
      let friendsMap: Record<string, { friend_name: string, friend_phone: string }> = {};
      
      // Only fetch if we have some friend circle ids
      if (friendCircleIds.length > 0) {
        const { data: friendsData, error: friendsError } = await supabase
          .from('friend_circles')
          .select('id, friend_name, friend_phone')
          .in('id', friendCircleIds);
          
        if (friendsError) {
          console.warn('Error fetching friend details:', friendsError);
        } else if (friendsData) {
          // Create lookup map for friend details
          friendsMap = friendsData.reduce((acc: Record<string, any>, friend) => {
            acc[friend.id] = friend;
            return acc;
          }, {});
        }
      }
      
      // Map the data to include friend details
      const formattedResponses = data.map(item => {
        const friendData = item.friend_circle_id && friendsMap[item.friend_circle_id];
        
        return {
          id: item.id,
          itemId: item.item_id,
          friendId: item.friend_circle_id,
          status: item.response_status,
          comment: item.response_comment,
          updatedAt: item.updated_at,
          friendName: friendData ? friendData.friend_name : '',
          friendPhone: friendData ? friendData.friend_phone : '',
        };
      });
      
      return formattedResponses;
    } catch (err) {
      console.error('Error fetching friend responses:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch responses');
      return [];
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user, tablesExist]);
  
  // New function to respond to a shared item (for when friends respond)
  const respondToSharedItem = useCallback(async (
    sharedItemId: string,
    status: 'liked' | 'disliked',
    comment?: string
  ) => {
    if (!isAuthenticated || !user || !tablesExist) {
      setError('You must be logged in to respond');
      return null;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Find the shared item that was sent to this user
      const { data: sharedItem, error: findError } = await supabase
        .from('shared_items')
        .select('*')
        .eq('id', sharedItemId)
        .single();
        
      if (findError) throw findError;
      
      // Update the shared item with the response
      const { data, error } = await supabase
        .from('shared_items')
        .update({
          response_status: status,
          response_comment: comment || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', sharedItemId)
        .select()
        .single();
        
      if (error) throw error;
      
      // Show success toast
      toast.success('Response sent successfully');
      
      return data;
    } catch (err) {
      console.error('Error responding to shared item:', err);
      setError(err instanceof Error ? err.message : 'Failed to send response');
      toast.error(err instanceof Error ? err.message : 'Failed to send response');
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user, tablesExist]);
  
  const addFriend = useCallback(async (friendName: string, friendPhone: string) => {
    if (!isAuthenticated || !user) {
      setError('You must be logged in to add friends');
      console.log("Not authenticated or no user", { isAuthenticated, userId: user?.id });
      return null;
    }
    
    if (!tablesExist) {
      setError('Friend circle functionality is not available. Please run the database migrations.');
      console.log("Tables don't exist");
      return null;
    }
    
    console.log("Trying to add friend", { friendName, friendPhone, userId: user.id });
    
    setLoading(true);
    setError(null);
    
    try {
      // Check if friend already exists
      console.log("Checking if friend exists");
      const { data: existingFriend, error: existingFriendError } = await supabase
        .from('friend_circles')
        .select('*')
        .eq('user_id', user.id)
        .eq('friend_phone', friendPhone.trim())
        .single();
        
      if (existingFriendError) {
        console.log("Error checking existing friend:", existingFriendError);
        if (existingFriendError.code !== 'PGRST116') {  // Not found error is expected
          console.log("Unexpected error checking for existing friend");
        }
      }
        
      if (existingFriend) {
        setError('This friend is already in your circle');
        console.log("Friend already exists", existingFriend);
        return null;
      }
      
      // Add the new friend
      console.log("Adding new friend with data:", {
        user_id: user.id,
        friend_name: friendName.trim(),
        friend_phone: friendPhone.trim(),
        friend_status: 'pending',
      });
      
      const { data, error } = await supabase
        .from('friend_circles')
        .insert({
          user_id: user.id,
          friend_name: friendName.trim(),
          friend_phone: friendPhone.trim(),
          friend_status: 'pending',
        })
        .select()
        .single();
        
      if (error) {
        console.error("Insert error details:", error);
        // Check for specific error codes
        if (error.code === '23505') {
          setError('This friend is already in your circle');
        } else if (error.code === '42501') {
          setError('Permission denied: Please ensure you have run the database setup');
          console.log("Permission error - database tables not properly set up");
        } else {
          console.log(`Error code: ${error.code}, message: ${error.message}`);
          throw error;
        }
        return null;
      }
      
      console.log("Friend added successfully", data);
      
      // Update local state
      setFriends(prev => [data, ...prev]);
      
      // Show success toast
      toast.success(`${friendName} added to your circle`);
      
      return data;
    } catch (err) {
      console.error('Error adding friend:', err);
      if (err instanceof Error) {
        console.log("Error message:", err.message);
        console.log("Error stack:", err.stack);
      }
      setError(err instanceof Error ? err.message : 'Failed to add friend');
      toast.error(err instanceof Error ? err.message : 'Failed to add friend');
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user, tablesExist]);
  
  const removeFriend = useCallback(async (friendId: string) => {
    if (!isAuthenticated || !user) {
      setError('You must be logged in to remove friends');
      return false;
    }
    
    if (!tablesExist) {
      setError('Friend circle functionality is not available. Please run the database migrations.');
      return false;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase
        .from('friend_circles')
        .delete()
        .eq('id', friendId)
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      // Update local state
      setFriends(prev => prev.filter(friend => friend.id !== friendId));
      
      // Show success toast
      toast.success('Friend removed from your circle');
      
      return true;
    } catch (err) {
      console.error('Error removing friend:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove friend');
      toast.error(err instanceof Error ? err.message : 'Failed to remove friend');
      return false;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user, tablesExist]);
  
  const shareWithFriend = useCallback(async (friendId: string, itemId: string, comment?: string) => {
    if (!isAuthenticated || !user || !tablesExist) {
      throw new Error('User must be authenticated to share items');
    }
    
    try {
      // First fetch the friend's details
      const { data: friendData, error: friendError } = await supabase
        .from('friend_circles')
        .select('friend_name, friend_phone')
        .eq('id', friendId)
        .single();
        
      if (friendError) throw friendError;
      
      if (!friendData) {
        throw new Error('Friend not found');
      }
      
      // Create a shared item record without reviewer_info
      const { data, error } = await supabase
        .from('shared_items')
        .insert({
          sender_id: user.id,
          friend_circle_id: friendId,
          item_id: itemId,
          comment: comment,
          response_status: 'pending'
        })
        .select('id')
        .single();
        
      if (error) throw error;
      
      return data.id;
    } catch (err) {
      console.error('Error sharing with friend:', err);
      throw err;
    }
  }, [isAuthenticated, user, tablesExist]);
  
  // Fetch friends and shared items when authenticated
  useEffect(() => {
    if (isAuthenticated && user && tablesExist) {
      fetchFriends();
      fetchSharedItems();
    }
  }, [isAuthenticated, user, fetchFriends, fetchSharedItems, tablesExist]);
  
  return {
    friends,
    sharedItems,
    loading,
    error,
    tablesExist,
    addFriend,
    removeFriend,
    shareWithFriend,
    fetchFriends,
    fetchSharedItems,
    fetchFriendResponses,
    respondToSharedItem
  };
} 