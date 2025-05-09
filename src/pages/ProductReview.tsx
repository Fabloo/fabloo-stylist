import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { Star, Send, Phone } from 'lucide-react';
import { toast } from 'react-toastify';

// Define an interface for the shared item data
interface SharedItemData {
  id: string;
  sender_id: string;
  friend_circle_id?: string;
  comment?: string;
  friend_circles?: Array<{
    friend_name: string;
    friend_phone: string;
    user_id: string;
  }>;
}

export function ProductReview() {
  const { itemId, shareId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productDetails, setProductDetails] = useState<any>(null);
  const [senderDetails, setSenderDetails] = useState<any>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(5);
  
  // Load product details and check if the share link is valid
  useEffect(() => {
    const fetchDetails = async () => {
      if (!itemId || !shareId) {
        setError('Invalid review link');
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        console.log('Fetching shared item details for shareId:', shareId, 'itemId:', itemId);
        
        // First, check if the shared item exists and is valid, without joining friend_circles
        const { data: sharedItem, error: sharedItemError } = await supabase
          .from('shared_items')
          .select(`
            id,
            sender_id,
            friend_circle_id,
            comment
          `)
          .eq('id', shareId)
          .eq('item_id', itemId)
          .single();
          
        if (sharedItemError) {
          console.error('Error fetching shared item:', sharedItemError);
          throw new Error('Invalid or expired review link');
        }
        
        if (!sharedItem) {
          console.error('No shared item found for the given IDs');
          throw new Error('Invalid or expired review link');
        }
        
        console.log('Found shared item:', sharedItem);
        
        // Get product details
        const { data: product, error: productError } = await supabase
          .from('inventory_items')
          .select('*')
          .eq('id', itemId)
          .single();
          
        if (productError) {
          console.error('Error fetching product:', productError);
          throw new Error('Product not found');
        }
        
        if (!product) {
          console.error('No product found for itemId:', itemId);
          throw new Error('Product not found');
        }
        
        console.log('Found product:', product);
        
        // Get sender details
        const { data: sender, error: senderError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sharedItem.sender_id)
          .single();
          
        if (senderError) {
          console.warn('Error fetching sender profile:', senderError);
          // Not critical, we can continue without sender details
        }
        
        setProductDetails(product);
        setSenderDetails(sender);
        
        // If friend_circle_id exists, try to fetch friend circle information
        if (sharedItem.friend_circle_id) {
          const { data: friendCircle, error: friendCircleError } = await supabase
            .from('friend_circles')
            .select('friend_name, friend_phone')
            .eq('id', sharedItem.friend_circle_id)
            .single();
            
          if (!friendCircleError && friendCircle) {
            // Pre-fill the form if this is a friend from the circle
            setName(friendCircle.friend_name || '');
            setPhone(friendCircle.friend_phone || '');
            console.log('Pre-filled form with friend data:', friendCircle);
          }
        }
        
      } catch (err) {
        console.error('Error loading review details:', err);
        setError(err instanceof Error ? err.message : 'Failed to load review details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDetails();
  }, [itemId, shareId]);
  
  // Submit review
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    
    if (!phone.trim()) {
      setError('Please enter a valid phone number');
      return;
    }
    
    if (!comment.trim()) {
      setError('Please share your thoughts about this item');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      // Check if this person is already in the friend circle
      const { data: existingFriend, error: friendError } = await supabase
        .from('friend_circles')
        .select('id')
        .eq('friend_phone', phone.trim())
        .eq('user_id', senderDetails?.id)
        .single();
      
      let friendId = existingFriend?.id;
      
      // If not in the friend circle, add them
      if (!existingFriend) {
        const { data: newFriend, error: newFriendError } = await supabase
          .from('friend_circles')
          .insert({
            user_id: senderDetails?.id,
            friend_name: name.trim(),
            friend_phone: phone.trim(),
            friend_status: 'joined', // Immediately mark as joined since they've provided feedback
          })
          .select()
          .single();
          
        if (newFriendError) throw newFriendError;
        friendId = newFriend.id;
      }
      
      // Update the shared item with the response
      const { error: updateError } = await supabase
        .from('shared_items')
        .update({
          response_status: rating >= 4 ? 'liked' : 'disliked',
          response_comment: comment,
          friend_circle_id: friendId,
          updated_at: new Date().toISOString()
        })
        .eq('id', shareId);
        
      if (updateError) throw updateError;
      
      // Show success and navigate to thank you screen
      navigate(`/review-success/${itemId}`);
      
    } catch (err) {
      console.error('Error submitting review:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="w-full max-w-md mx-auto min-h-screen flex flex-col bg-white p-4">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="w-full max-w-md mx-auto min-h-screen flex flex-col bg-white p-4">
        <div className="flex-1 flex items-center justify-center">
          <div className="p-6 bg-red-50 rounded-xl text-center">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Oops!</h2>
            <p className="text-red-500">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 py-2 px-4 bg-purple-600 text-white rounded-lg"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-full max-w-md mx-auto min-h-screen flex flex-col bg-white p-4">
      {/* Header */}
      <header className="flex items-center justify-center mb-6">
        <div className="text-center">
               <img
                  src="https://res.cloudinary.com/dofgnvgo6/image/upload/v1744363320/Union_1_ugzdfs.svg"
            alt="Fabloo Logo" 
            className="h-20 mx-auto mb-2"
          />
          <h1 className="text-xl font-semibold text-gray-900">Welcome To My Circle</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="mb-8">
          {productDetails && (
            <div className="flex flex-col items-center">
              <div className="w-64 h-80 mb-4">
                <img
                  src={productDetails.image_url}
                  alt={productDetails.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
              <h2 className="text-lg font-medium text-gray-900 text-center mb-2">{productDetails.name}</h2>
              <p className="text-center text-gray-500 text-sm mb-6">
                {senderDetails?.name || 'Your friend'} would like your opinion on this outfit!
              </p>
            </div>
          )}
          
          {/* Review Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Your Name
              </label>
              <input
                type="text"
                id="name"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Your Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Phone className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  type="tel"
                  id="phone"
                  className="pl-10 w-full px-4 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Enter your phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                How would you rate this outfit?
              </label>
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 focus:outline-none"
                  >
                    <Star
                      size={24}
                      className={`${
                        star <= rating
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">
                Your Comments
              </label>
              <textarea
                id="comment"
                rows={4}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500"
                placeholder="Share your thoughts about this outfit..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
            
            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-gradient-to-r from-[#B252FF] to-[#F777F7] text-white font-medium rounded-lg hover:opacity-90 disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Review
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-8 text-center text-xs text-gray-500 flex flex-col items-center">
        <p>Receive from your stylist and get AI-personalized experiences in future</p>
      </footer>
    </div>
  );
} 