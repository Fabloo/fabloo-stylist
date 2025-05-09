import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, MessageCircle, ThumbsUp, ThumbsDown } from 'lucide-react';

export function FeedbackRequest() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shared, setShared] = useState<any | null>(null);
  const [product, setProduct] = useState<any | null>(null);
  const [sender, setSender] = useState<any | null>(null);
  const [feedback, setFeedback] = useState('');
  const [responseType, setResponseType] = useState<'liked' | 'disliked' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadSharedItem();
  }, [id]);

  const loadSharedItem = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      // Get the shared item
      const { data: sharedItem, error: sharedError } = await supabase
        .from('shared_items')
        .select(`
          *,
          friend_circles(*),
          sender:sender_id(
            email,
            user_metadata
          )
        `)
        .eq('id', id)
        .single();
        
      if (sharedError) throw sharedError;
      if (!sharedItem) throw new Error('Shared item not found');
      
      setShared(sharedItem);
      
      // Get the product details
      const { data: productData, error: productError } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('id', sharedItem.item_id)
        .single();
        
      if (productError) throw productError;
      
      setProduct(productData);
      
      // Get sender info if available
      if (sharedItem.sender) {
        setSender(sharedItem.sender);
      }
    } catch (err) {
      console.error('Error loading feedback request:', err);
      setError(err instanceof Error ? err.message : 'Failed to load feedback request');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!responseType) {
      setError('Please select whether you like or dislike this item');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      const { error } = await supabase
        .from('shared_items')
        .update({
          response_status: responseType,
          response_comment: feedback || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
        
      if (error) throw error;
      
      setSuccess(true);
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-black text-white rounded-lg"
        >
          Go Home
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <div className="mx-auto flex items-center justify-center w-16 h-16 bg-green-50 rounded-full mb-4">
          <MessageCircle className="w-8 h-8 text-green-500" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Feedback Submitted!</h3>
        <p className="text-gray-600 mb-6">
          Thank you for sharing your opinion on this style.
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2.5 bg-gradient-to-r from-[#B252FF] to-[#F777F7] text-white font-medium rounded-lg"
        >
          Go to Homepage
        </button>
      </div>
    );
  }

  const senderName = sender?.user_metadata?.full_name || sender?.email?.split('@')[0] || 'Your friend';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate(-1)}
        className="p-2 hover:bg-gray-100 rounded-full mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
      
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Style Feedback Request
          </h1>
          <p className="text-gray-600">
            {senderName} wants your opinion on this outfit!
          </p>
        </div>
        
        <div className="p-6">
          {/* Product Display */}
          <div className="flex flex-col sm:flex-row gap-6 mb-8">
            <div className="w-full sm:w-48 h-48 sm:h-auto rounded-lg overflow-hidden">
              <img 
                src={product?.image_url} 
                alt={product?.name} 
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="flex-1">
              <h2 className="text-lg font-medium text-gray-900 mb-2">{product?.name}</h2>
              <p className="text-sm text-gray-500 mb-4">{product?.description}</p>
              <p className="text-lg font-semibold">₹{product?.price}</p>
              
              {shared?.comment && (
                <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">{senderName} says:</p>
                  <p className="text-sm font-medium text-gray-700">"{shared.comment}"</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Feedback Form */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What do you think?
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setResponseType('liked')}
                  className={`flex-1 py-3 rounded-lg border flex items-center justify-center gap-2 ${
                    responseType === 'liked'
                      ? 'bg-green-50 border-green-300 text-green-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <ThumbsUp className={`w-5 h-5 ${responseType === 'liked' ? 'text-green-500' : 'text-gray-500'}`} />
                  I like it!
                </button>
                <button
                  onClick={() => setResponseType('disliked')}
                  className={`flex-1 py-3 rounded-lg border flex items-center justify-center gap-2 ${
                    responseType === 'disliked'
                      ? 'bg-red-50 border-red-300 text-red-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <ThumbsDown className={`w-5 h-5 ${responseType === 'disliked' ? 'text-red-500' : 'text-gray-500'}`} />
                  Not my style
                </button>
              </div>
            </div>
            
            <div>
              <label htmlFor="feedback" className="block text-sm font-medium text-gray-700 mb-2">
                Add a comment (optional)
              </label>
              <textarea
                id="feedback"
                rows={4}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500"
                placeholder="Share your thoughts on this style..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
            </div>
            
            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <button
              onClick={handleSubmitFeedback}
              disabled={!responseType || submitting}
              className="w-full py-3 bg-gradient-to-r from-[#B252FF] to-[#F777F7] text-white font-medium rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Submitting...
                </>
              ) : (
                'Submit Feedback'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 