import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { Star, Send, Phone, ArrowLeft } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuthStore } from '../store';

// Define an interface for the shared item data
interface SharedItemData {
  id: string;
  item_id: string;
  sender_id: string;
  comment?: string;
  response_status?: string;
  reviewer_info?: {
    name?: string;
    phone?: string;
    prefilled?: boolean;
  };
}

interface ProductDetails {
  id: string;
  name: string;
  image_url: string;
  description?: string;
  price?: number;
}

export function ProductReview() {
  const { itemId, shareId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productDetails, setProductDetails] = useState<ProductDetails | null>(null);
  const [senderName, setSenderName] = useState<string>('Your friend');
  
  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(5);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [fieldsArePrefilled, setFieldsArePrefilled] = useState(false);
  const [formErrors, setFormErrors] = useState<{name?: string; phone?: string; comment?: string}>({});
  
  // Helper function to handle authentication redirection
  const redirectToAuth = () => {
    if (!isAuthenticated && !authLoading) {
      // Get the current path and query parameters
      const currentPath = window.location.pathname;
      const urlParams = new URLSearchParams(window.location.search);
      
      // Preserve name and phone parameters if they exist
      const nameParam = urlParams.get('name');
      const phoneParam = urlParams.get('phone');
      
      // Create the redirect URL
      let redirectUrl = currentPath;
      
      // Add the original query parameters if they exist
      if (nameParam || phoneParam) {
        redirectUrl += '?';
        if (nameParam) redirectUrl += `name=${encodeURIComponent(nameParam)}`;
        if (nameParam && phoneParam) redirectUrl += '&';
        if (phoneParam) redirectUrl += `phone=${encodeURIComponent(phoneParam)}`;
      }
      
      // Redirect to auth with the complete URL as a redirect parameter
      navigate(`/auth?redirect=${encodeURIComponent(redirectUrl)}`);
      return true; // Indicate that we've redirected
    }
    return false; // No redirection happened
  };
  
  // Check if the user is authenticated
  useEffect(() => {
    // Skip the auth check if already loading product details
    if (loading) return;
    
    // Skip redirect if we already have an error (like invalid link)
    if (error) return;
    
    // If auth is still loading, wait for it to complete
    if (authLoading) return;
    
    // If not authenticated, redirect to auth page with this URL as redirect
    if (!isAuthenticated) {
      redirectToAuth();
    }
  }, [navigate, isAuthenticated, authLoading, loading, error]);
  
  // Load product details and check if the share link is valid
  useEffect(() => {
    const fetchDetails = async () => {
      if (!itemId || !shareId) {
        setError('Invalid review link - missing parameters');
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        // Check for URL parameters which might contain prefilled info
        const urlParams = new URLSearchParams(window.location.search);
        const nameParam = urlParams.get('name');
        const phoneParam = urlParams.get('phone');
        
        if (nameParam && phoneParam) {
          setName(decodeURIComponent(nameParam));
          setPhone(decodeURIComponent(phoneParam));
          setFieldsArePrefilled(true);
        }
        
        // First, check if the shared item exists and is valid
        const { data: sharedItem, error: sharedItemError } = await supabase
          .from('shared_items')
          .select(`
            id,
            sender_id,
            comment,
            response_status,
            item_id
          `)
          .eq('id', shareId)
          .maybeSingle();
          
        if (sharedItemError) {
          if (sharedItemError.code === '42P01') {
            throw new Error('Database tables not set up correctly');
          } else {
            throw new Error(`Error loading item details: ${sharedItemError.message}`);
          }
        }
        
        if (!sharedItem) {
          // Instead of throwing an error directly, check if user is authenticated
          if (redirectToAuth()) {
            return;
          }
          
          throw new Error('This review link is invalid or has expired. The requested item could not be found.');
        }
        
        // Double check that the item_id matches what we have in the URL
        if (sharedItem.item_id !== itemId) {
          throw new Error('Review link contains mismatched item information.');
        }
        
        // Check if this link has already been used
        if (sharedItem.response_status) {
          setAlreadyReviewed(true);
        }
        
        // Get product details
        const { data: product, error: productError } = await supabase
          .from('inventory_items')
          .select('*')
          .eq('id', itemId)
          .maybeSingle();
          
        if (productError) {
          if (productError.code === '42P01') {
            throw new Error('Product catalog not available');
          } else {
            throw new Error('Product not found');
          }
        }
        
        if (!product) {
          throw new Error('Product not found');
        }
        
        // Get sender details if sender_id exists
        if (sharedItem.sender_id) {
          const { data: sender, error: senderError } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', sharedItem.sender_id)
            .maybeSingle();
            
          if (!senderError && sender && sender.name) {
            setSenderName(sender.name);
          }
        }
        
        setProductDetails(product);
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load review details');
        
        // If the error is about an invalid link and user is not authenticated, redirect to auth
        if (err instanceof Error && 
            err.message.includes('invalid or has expired')) {
          redirectToAuth();
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchDetails();
  }, [itemId, shareId, navigate, isAuthenticated, authLoading]);
  
  // Validate form fields
  const validateForm = () => {
    const errors: {name?: string; phone?: string; comment?: string} = {};
    let isValid = true;
    
    if (!name.trim()) {
      errors.name = 'Please enter your name';
      isValid = false;
    }
    
    if (!phone.trim()) {
      errors.phone = 'Please enter a phone number';
      isValid = false;
    } else if (!/^\d{10}$/.test(phone.replace(/\D/g, ''))) {
      errors.phone = 'Please enter a valid 10-digit phone number';
      isValid = false;
    }
    
    if (!comment.trim()) {
      errors.comment = 'Please share your thoughts about this item';
      isValid = false;
    }
    
    setFormErrors(errors);
    return isValid;
  };
  
  // Format phone number for display
  const formatPhoneNumber = (input: string) => {
    const numbers = input.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
  };
  
  // Handle phone input changes
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedNumber = formatPhoneNumber(e.target.value);
    setPhone(formattedNumber);
    
    // Clear error when user starts typing
    if (formErrors.phone) {
      setFormErrors(prev => ({ ...prev, phone: undefined }));
    }
  };
  
  // Submit review
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      // Create a flag to track if we're in a legacy/new database structure
      let isLegacyDb = false;
      
      // First, try to find if this is part of a friend_share (batch share)
      let friendShare: any = null;
      try {
        const { data, error: friendShareError } = await supabase
          .from('friend_shares')
          .select('id, friend_circle_id')
          .eq('shared_item_id', shareId)
          .eq('friend_circle_id', (fc: any) => {
            return supabase
              .from('friend_circles')
              .select('id')
              .eq('friend_phone', phone.replace(/\D/g, ''));
          })
          .maybeSingle();
          
        if (data) {
          friendShare = data;
        } else if (friendShareError && friendShareError.code === '42P01') {
          // Table doesn't exist, we're likely dealing with a legacy database
          isLegacyDb = true;
          console.warn('Using legacy database schema (friend_shares table not found)');
        } else if (friendShareError && friendShareError.code !== 'PGRST116') {
          console.error('Error checking friend share:', friendShareError);
        }
      } catch (err) {
        // Suppress errors from missing tables
        console.warn('Error checking friend shares, continuing with fallback flow', err);
        isLegacyDb = true;
      }
      
      // If this is a friend share and the table exists, update that record
      if (friendShare && !isLegacyDb) {
        try {
          const { error: updateFriendShareError } = await supabase
            .from('friend_shares')
            .update({
              response_status: rating >= 4 ? 'liked' : 'disliked',
              response_comment: comment,
              viewed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', friendShare.id);
            
          if (updateFriendShareError && updateFriendShareError.code !== '42P01') {
            console.error('Error updating friend share:', updateFriendShareError);
          }
        } catch (err) {
          // Suppress errors from missing tables
          console.warn('Error updating friend shares, continuing with main flow', err);
        }
      }
      
      // Now check if friend circle exists for this phone number
      let friendCircleId = null;
      const cleanedPhone = phone.replace(/\D/g, '');
      
      try {
        const { data: existingFriendCircle, error: friendCircleError } = await supabase
          .from('friend_circles')
          .select('id')
          .eq('friend_phone', cleanedPhone)
          .maybeSingle();
          
        if (existingFriendCircle) {
          friendCircleId = existingFriendCircle.id;
        } else if (friendCircleError && friendCircleError.code === '42P01') {
          isLegacyDb = true;
          console.warn('Using legacy database schema (friend_circles table not found)');
        } else if (friendCircleError && friendCircleError.code !== 'PGRST116') {
          console.error('Error checking friend circle:', friendCircleError);
        }
      } catch (err) {
        // Suppress errors from missing tables
        console.warn('Error checking friend circles, continuing with main flow', err);
        isLegacyDb = true;
      }
      
      // If not found and the tables exist, create a new friend circle entry
      if (!friendCircleId && !isLegacyDb) {
        try {
          // Get sender ID from the shared item
          const { data: sharedItem, error: sharedItemError } = await supabase
            .from('shared_items')
            .select('sender_id')
            .eq('id', shareId)
            .single();
            
          if (sharedItemError) {
            throw new Error(`Could not get shared item details: ${sharedItemError.message}`);
          }
          
          if (!sharedItem.sender_id) {
            throw new Error('This share does not have a valid sender');
          }
          
          // Create the friend circle entry
          const { data: newFriendCircle, error: createError } = await supabase
            .from('friend_circles')
            .insert({
              user_id: sharedItem.sender_id,
              friend_name: name,
              friend_phone: cleanedPhone,
              friend_status: 'joined'
            })
            .select('id')
            .single();
            
          if (createError) {
            if (createError.code === '42P01') {
              isLegacyDb = true;
              console.warn('Using legacy database schema (could not create friend circle)');
            } else {
              console.error('Error creating friend circle:', createError);
            }
          } else {
            friendCircleId = newFriendCircle.id;
            
            // If this was a batch share but we didn't find a matching friend record,
            // create one now that we have the friend circle ID
            if (!friendShare && !isLegacyDb) {
              try {
                const { error: createFriendShareError } = await supabase
                  .from('friend_shares')
                  .insert({
                    shared_item_id: shareId,
                    friend_circle_id: friendCircleId,
                    response_status: rating >= 4 ? 'liked' : 'disliked',
                    response_comment: comment,
                    viewed_at: new Date().toISOString()
                  });
                  
                if (createFriendShareError && createFriendShareError.code !== '42P01') {
                  console.error('Error creating friend share record:', createFriendShareError);
                }
              } catch (err) {
                // Suppress errors from missing tables
                console.warn('Error creating friend share, continuing with main flow', err);
              }
            }
          }
        } catch (err) {
          // If this fails, we'll still try to update the shared_items record
          console.warn('Error in friend circle creation flow, continuing with main update', err);
        }
      }
      
      // Always update the shared_items record - this is the most important part
      const { error: updateError } = await supabase
        .from('shared_items')
        .update({
          response_status: rating >= 4 ? 'liked' : 'disliked',
          response_comment: comment,
          updated_at: new Date().toISOString()
        })
        .eq('id', shareId);
        
      if (updateError) {
        if (updateError.code === '23505') {
          // This is a duplicate key violation, which might happen if submitted twice
          navigate(`/review-success/${itemId}`);
          return;
        } else if (updateError.code === '42P01') {
          throw new Error('Database tables not set up correctly');
        } else if (updateError.code === '42703') {
          throw new Error(`Column does not exist: ${updateError.message}`);
        }
        throw new Error(`Failed to submit review: ${updateError.message}`);
      }
      
      // Show success message using toast
      toast.success('Review submitted successfully!');
      
      // Navigate to thank you screen
      navigate(`/review-success/${itemId}`);
      
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit review');
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Loading state component
  const LoadingState = () => (
    <div className="w-full max-w-md mx-auto min-h-screen flex flex-col bg-white p-4">
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
        <p className="ml-2 text-gray-600">Loading...</p>
      </div>
    </div>
  );
  
  // Error state component
  const ErrorState = () => (
    <div className="w-full max-w-md mx-auto min-h-screen flex flex-col bg-white p-4">
      <div className="flex-1 flex items-center justify-center">
        <div className="p-6 bg-red-50 rounded-xl text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Not Authorized!</h2>
          <p className="text-gray-500">Please login to continue</p>
          <button
            onClick={() => navigate(`/auth?redirect=${encodeURIComponent(location.pathname + location.search)}`)}
            className="mt-4 py-2 px-4 bg-purple-600 text-white rounded-lg"
          >
            Login 
          </button>
        </div>
      </div>
    </div>
  );
  
  const RedirectingState = () => (
    <div className="w-full max-w-md mx-auto min-h-screen flex flex-col bg-white p-4">
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
        <p className="ml-2 text-gray-600">Redirecting to login...</p>
      </div>
    </div>
  );
  
  if (loading) {
    return <LoadingState />;
  }
  
  if (error) {
    // If the error is about an invalid link and the user is not authenticated,
    // we've already redirected in the useEffect, so we should not show the error page
    if (error.includes('invalid or has expired') && !isAuthenticated && !authLoading) {
      return <RedirectingState />;
    }
    
    return <ErrorState />;
  }
  
  return (
    <motion.div 
      className="w-full max-w-md mx-auto min-h-screen flex flex-col bg-white p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <header className="flex items-center justify-center mb-6 relative">
        <button 
          onClick={() => navigate(-1)} 
          className="absolute left-0 p-2 text-gray-500 hover:text-gray-700"
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
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
            <motion.div 
              className="flex flex-col items-center"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <div className="w-64 h-80 mb-4 rounded-lg overflow-hidden shadow-md">
                <img
                  src={productDetails.image_url}
                  alt={productDetails.name}
                  className="w-full h-full object-cover transition-transform hover:scale-105 duration-300"
                />
              </div>
              <h2 className="text-lg font-medium text-gray-900 text-center mb-2">{productDetails.name}</h2>
              <p className="text-center text-gray-500 text-sm mb-6">
                {senderName} would like your opinion on this outfit!
              </p>
            </motion.div>
          )}
          
          {alreadyReviewed && (
            <motion.div 
              className="mb-6 p-4 bg-yellow-50 border border-yellow-100 rounded-lg"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <p className="text-center text-amber-700 text-sm">
                This item has already been reviewed. You can still submit another review if you'd like.
              </p>
            </motion.div>
          )}
          
          {/* Review Form */}
          <motion.form 
            onSubmit={handleSubmit} 
            className="space-y-4"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Your Name
              </label>
              <input
                type="text"
                id="name"
                className={`w-full px-4 py-2 border ${
                  fieldsArePrefilled ? 'bg-gray-100' : 'bg-white'
                } ${formErrors.name ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-purple-500 focus:border-purple-500'} rounded-lg`}
                placeholder="Enter your name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (formErrors.name) setFormErrors({...formErrors, name: undefined});
                }}
                readOnly={fieldsArePrefilled}
              />
              {formErrors.name && (
                <p className="mt-1 text-xs text-red-500">{formErrors.name}</p>
              )}
            </div>
            
            <div className="mb-4">
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Your Phone Number
              </label>
              <div className={`relative ${fieldsArePrefilled ? 'opacity-75' : ''}`}>
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="tel"
                  id="phone"
                  className={`w-full pl-10 pr-4 py-2 border ${
                    fieldsArePrefilled ? 'bg-gray-100' : 'bg-white'
                  } ${formErrors.phone ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-purple-500 focus:border-purple-500'} rounded-lg`}
                  placeholder="(123) 456-7890"
                  value={phone}
                  onChange={handlePhoneChange}
                  readOnly={fieldsArePrefilled}
                />
              </div>
              {formErrors.phone && (
                <p className="mt-1 text-xs text-red-500">{formErrors.phone}</p>
              )}
              {fieldsArePrefilled && (
                <p className="text-xs text-gray-500 mt-1">
                  Your information is already prefilled from your contact
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                How would you rate this outfit?
              </label>
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <motion.button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 focus:outline-none"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Star
                      size={24}
                      className={`${
                        star <= rating
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-300'
                      } transition-colors duration-200`}
                    />
                  </motion.button>
                ))}
                <span className="ml-2 text-sm text-gray-600">
                  {rating === 5 ? 'Love it!' : 
                   rating === 4 ? 'It\'s great' : 
                   rating === 3 ? 'It\'s okay' : 
                   rating === 2 ? 'Not really' : 'Dislike'}
                </span>
              </div>
            </div>
            
            <div>
              <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">
                Your Comments
              </label>
              <textarea
                id="comment"
                rows={4}
                className={`w-full px-4 py-2.5 bg-gray-50 border ${formErrors.comment ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-purple-500 focus:border-purple-500'} text-gray-900 text-sm rounded-lg`}
                placeholder="Share your thoughts about this outfit..."
                value={comment}
                onChange={(e) => {
                  setComment(e.target.value);
                  if (formErrors.comment) setFormErrors({...formErrors, comment: undefined});
                }}
              />
              {formErrors.comment && (
                <p className="mt-1 text-xs text-red-500">{formErrors.comment}</p>
              )}
            </div>
            
            {error && (
              <motion.div 
                className="p-3 bg-red-50 text-red-600 rounded-lg text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {error}
              </motion.div>
            )}
            
            <motion.button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-gradient-to-r from-[#B252FF] to-[#F777F7] text-white font-medium rounded-lg hover:opacity-90 disabled:opacity-70 flex items-center justify-center gap-2 shadow-md"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
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
            </motion.button>
          </motion.form>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-8 text-center text-xs text-gray-500 flex flex-col items-center">
        <p className="max-w-xs">Receive styling recommendations from your stylist and get AI-personalized experiences in the future</p>
        <p className="mt-2 text-xs">© {new Date().getFullYear()} Fabloo. All rights reserved.</p>
      </footer>
    </motion.div>
  );
} 