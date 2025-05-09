import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store';
import { useFriendCircle } from '../hooks/useFriendCircle';
import { ChevronRight, Star, ShoppingBag } from 'lucide-react';

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

export function FriendCircleResults() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const { loading: friendsLoading } = useFriendCircle();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);

  useEffect(() => {
    // Check authentication
    if (!isAuthenticated) {
      navigate('/login');
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
          <div className="space-y-4">
            {feedback.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="p-4 bg-white rounded-xl shadow-sm border border-gray-100"
              >
                <div className="flex items-start gap-3">
                  <div 
                    className="w-12 h-12 rounded-md bg-gray-100 flex-shrink-0"
                    style={{
                      backgroundImage: item.item_image ? `url(${item.item_image})` : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{item.friend_name}</h3>
                        <p className="text-xs text-gray-500 mb-1">on {item.item_name}</p>
                      </div>
                      <div className="flex items-center">
                        {Array(5).fill(0).map((_, i) => (
                          <Star 
                            key={i} 
                            size={14} 
                            className={i < item.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"} 
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm mt-1">{item.message}</p>
                    <div className="mt-2 text-right">
                      <button 
                        onClick={() => navigate(`/product/${item.item_id}`)}
                        className="text-xs text-purple-600 font-medium"
                      >
                        View Item
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            <div className="pt-8 pb-4 text-center">
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