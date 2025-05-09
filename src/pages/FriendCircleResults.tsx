import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store';
import { useFriendCircle } from '../hooks/useFriendCircle';
import { ChevronRight, Star, ShoppingBag, MessageSquare } from 'lucide-react';

// Define interfaces for the components
interface FeedbackItem {
  id: string;
  friend_name: string;
  message: string;
  rating: number;
  item_id: string;
  item_name: string;
  item_image: string;
}

interface GroupedFeedback {
  item_id: string;
  item_name: string;
  item_image: string;
  feedback_count: number;
  avg_rating: number;
  feedback: FeedbackItem[];
}

export function FriendCircleResults() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const { loading: friendsLoading } = useFriendCircle();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Group feedback by item
  const groupedFeedback = useMemo(() => {
    const grouped: Record<string, GroupedFeedback> = {};
    
    feedback.forEach(item => {
      if (!grouped[item.item_id]) {
        grouped[item.item_id] = {
          item_id: item.item_id,
          item_name: item.item_name,
          item_image: item.item_image,
          feedback_count: 0,
          avg_rating: 0,
          feedback: []
        };
      }
      
      grouped[item.item_id].feedback.push(item);
      grouped[item.item_id].feedback_count += 1;
      grouped[item.item_id].avg_rating += item.rating;
    });
    
    // Calculate average ratings
    Object.values(grouped).forEach(group => {
      group.avg_rating = group.avg_rating / group.feedback_count;
    });
    
    return Object.values(grouped);
  }, [feedback]);

  // Auto-select the first item if nothing is selected
  useEffect(() => {
    if (groupedFeedback.length > 0 && !selectedItemId) {
      setSelectedItemId(groupedFeedback[0].item_id);
    }
  }, [groupedFeedback, selectedItemId]);

  // Get the selected item's feedback
  const selectedItemFeedback = useMemo(() => {
    if (!selectedItemId) return [];
    const selected = groupedFeedback.find(item => item.item_id === selectedItemId);
    return selected ? selected.feedback : [];
  }, [selectedItemId, groupedFeedback]);

  useEffect(() => {
    // Check authentication
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }

    // Fetch real feedback data from Supabase
    const fetchFeedback = async () => {
      setLoading(true);
      setError(null);

      try {
        // Query shared items that have responses - WITHOUT JOINS
        const { data, error } = await supabase
          .from('shared_items')
          .select(`
            id,
            item_id,
            response_comment,
            response_status,
            friend_circle_id,
            updated_at
          `)
          .eq('sender_id', user?.id)
          .not('response_comment', 'is', null)
          .order('updated_at', { ascending: false });

        if (error) throw error;
        
        // If we have no data, return early
        if (!data || data.length === 0) {
          setFeedback([]);
          setLoading(false);
          return;
        }
        
        // Get all friend_circle_ids to fetch friend names separately
        const friendCircleIds = data
          .filter(item => item.friend_circle_id)
          .map(item => item.friend_circle_id);
          
        // Get all item_ids to fetch item details separately
        const itemIds = data.map(item => item.item_id);
        
        // Fetch friend names if we have any friend_circle_ids
        let friendsMap: Record<string, { friend_name: string }> = {};
        if (friendCircleIds.length > 0) {
          const { data: friendsData, error: friendsError } = await supabase
            .from('friend_circles')
            .select('id, friend_name')
            .in('id', friendCircleIds);
            
          if (!friendsError && friendsData) {
            friendsMap = friendsData.reduce((acc: Record<string, any>, friend) => {
              acc[friend.id] = friend;
              return acc;
            }, {});
          } else {
            console.warn('Error fetching friend names:', friendsError);
          }
        }
        
        // Fetch item details
        const { data: itemsData, error: itemsError } = await supabase
          .from('inventory_items')
          .select('id, name, image_url')
          .in('id', itemIds);
          
        if (itemsError) {
          console.warn('Error fetching item details:', itemsError);
        }
        
        // Create a map of items for easy lookup
        const itemsMap = (itemsData || []).reduce((acc: Record<string, any>, item) => {
          acc[item.id] = item;
          return acc;
        }, {});

        // Transform the data into our FeedbackItem format
        const transformedData: FeedbackItem[] = data.map(item => {
          // Determine rating based on response_status
          let rating = 3; // Default rating
          if (item.response_status === 'liked') rating = 5;
          if (item.response_status === 'disliked') rating = 2;
          
          // Look up the friend name from our map
          const friendName = item.friend_circle_id && friendsMap[item.friend_circle_id]
            ? friendsMap[item.friend_circle_id].friend_name
            : 'Anonymous';
            
          // Look up item details from our map
          const itemDetails = itemsMap[item.item_id] || { name: 'Product', image_url: '' };
          
          return {
            id: item.id,
            friend_name: friendName,
            message: item.response_comment || 'No comment provided',
            rating,
            item_id: item.item_id,
            item_name: itemDetails.name,
            item_image: itemDetails.image_url
          };
        });

        setFeedback(transformedData);
      } catch (err) {
        console.error('Error fetching feedback:', err);
        setError('Failed to load feedback. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchFeedback();
  }, [isAuthenticated, navigate, user?.id]);

  return (
    <div className="w-full max-w-md mx-auto min-h-screen flex flex-col bg-white p-4">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <img 
            src="https://res.cloudinary.com/dofgnvgo6/image/upload/v1744363320/Union_1_ugzdfs.svg" 
            alt="Fabloo Logo" 
            className="h-8"
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">My Style Circle Feedback</h1>
          <p className="text-sm text-gray-500">See what your friends think about your style choices</p>
        </div>

        {loading ? (
          <div className="py-8 flex justify-center">
            <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-600 rounded-lg">
            {error}
          </div>
        ) : feedback.length === 0 ? (
          <div className="py-8 text-center">
            <div className="w-24 h-24 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-10 h-10 text-purple-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No feedback yet</h3>
            <p className="text-gray-500 text-sm mb-6">
              Share items with your friends to get their opinions on your style choices
            </p>
            <button
              onClick={() => navigate('/shop')}
              className="px-6 py-2 bg-gradient-to-r from-[#B252FF] to-[#F777F7] text-white font-medium rounded-lg"
            >
              Browse Products
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Items Carousel */}
            <div className="overflow-x-auto pb-4 -mx-4 px-4">
              <div className="flex gap-3">
                {groupedFeedback.map((group) => (
                  <div 
                    key={group.item_id}
                    onClick={() => setSelectedItemId(group.item_id)}
                    className={`flex-shrink-0 w-20 cursor-pointer transition-all ${selectedItemId === group.item_id ? 'scale-105' : 'opacity-70'}`}
                  >
                    <div 
                      className={`w-20 h-20 rounded-lg bg-gray-100 mb-1 border-2 ${selectedItemId === group.item_id ? 'border-purple-500' : 'border-transparent'}`}
                      style={{
                        backgroundImage: group.item_image ? `url(${group.item_image})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                    />
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        {Array(5).fill(0).map((_, i) => (
                          <Star 
                            key={i} 
                            size={10} 
                            className={i < Math.round(group.avg_rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"} 
                          />
                        ))}
                      </div>
                      <p className="text-xs font-medium truncate">{group.item_name}</p>
                      <p className="text-[10px] text-gray-500">{group.feedback_count} {group.feedback_count === 1 ? 'opinion' : 'opinions'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Selected Item Details */}
            {selectedItemId && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-5 rounded-2xl">
                {groupedFeedback.map(group => group.item_id === selectedItemId && (
                  <div key={group.item_id} className="flex gap-4 items-center">
                    <div 
                      className="w-24 h-24 rounded-lg bg-white shadow-sm"
                      style={{
                        backgroundImage: group.item_image ? `url(${group.item_image})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-lg">{group.item_name}</h3>
                      <div className="flex items-center mt-1 mb-2">
                        {Array(5).fill(0).map((_, i) => (
                          <Star 
                            key={i} 
                            size={16} 
                            className={i < Math.round(group.avg_rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"} 
                          />
                        ))}
                        <span className="text-sm text-gray-600 ml-2">{group.avg_rating.toFixed(1)}</span>
                      </div>
                      <button 
                        onClick={() => navigate(`/product/${group.item_id}`)}
                        className="text-xs px-3 py-1.5 rounded-full bg-white text-purple-600 font-medium shadow-sm"
                      >
                        View Item
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Feedback List for Selected Item */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-700 flex items-center">
                  <MessageSquare size={16} className="mr-1 text-purple-500" /> 
                  Feedback
                </h3>
                <span className="text-xs text-gray-500">{selectedItemFeedback.length} {selectedItemFeedback.length === 1 ? 'opinion' : 'opinions'}</span>
              </div>
              
              <div className="space-y-3">
                {selectedItemFeedback.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="p-4 bg-white rounded-xl shadow-sm border border-gray-100"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <h3 className="font-medium text-gray-900">{item.friend_name}</h3>
                          <div className="flex items-center">
                            {Array(5).fill(0).map((_, i) => (
                              <Star 
                                key={i} 
                                size={12} 
                                className={i < item.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"} 
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-gray-600 text-sm mt-1.5">{item.message}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="pt-6 pb-4 text-center">
              <button
                onClick={() => navigate('/shop')}
                className="w-full py-3 bg-gradient-to-r from-[#B252FF] to-[#F777F7] text-white font-medium rounded-lg flex items-center justify-center gap-1"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-8 text-center text-xs text-gray-500 flex flex-col items-center">
        <p>Receive from your stylist and get AI-personalized experiences in future</p>
      </footer>
    </div>
  );
} 