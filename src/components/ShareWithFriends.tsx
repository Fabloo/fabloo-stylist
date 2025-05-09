import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFriendCircle } from '../hooks/useFriendCircle';
import { FriendCircle } from './FriendCircle';
import { Friend } from '../types';
import { X, Share2, Users, Send, CheckCheck, Link as LinkIcon, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemName: string;
  itemImage: string;
  onSuccess?: () => void;
};

export function ShareWithFriends({ isOpen, onClose, itemId, itemName, itemImage, onSuccess }: Props) {
  const { 
    friends, 
    shareWithFriend, 
    loading, 
    error: friendCircleError, 
    tablesExist 
  } = useFriendCircle();
  const [comment, setComment] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [showFriendCircle, setShowFriendCircle] = useState(false);
  const [processingShare, setProcessingShare] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [showFriendsSelection, setShowFriendsSelection] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const { user } = useAuthStore();

  // Reset states when modal opens
  useEffect(() => {
    if (isOpen) {
      setComment('');
      setSelectedFriends([]);
      setShareSuccess(false);
      setShowFriendsSelection(false);
      setShareError(null);
    }
  }, [isOpen]);

  // Display friend circle error if tables don't exist
  useEffect(() => {
    if (friendCircleError) {
      setShareError(friendCircleError);
    }
  }, [friendCircleError]);

  // Toggle friend selection
  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  // Handle sharing with selected friends
  const handleShare = async () => {
    if (selectedFriends.length === 0) {
      setShareError('Please select at least one friend to share with');
      return;
    }

    setProcessingShare(true);
    setShareError(null);
    
    try {
      const selectedFriendsDetails = [];
      const sharePromises = [];
      let commonReviewLink = '';
      
      // First, create a single shared_item record for this batch share
      const { data: sharedItem, error: shareError } = await supabase
        .from('shared_items')
        .insert({
          sender_id: user?.id,
          item_id: itemId,
          comment: comment || `Check out this ${itemName} from Fabloo Stylist!`,
          response_status: 'pending'
          // No specific friend_circle_id since this is going to multiple friends
        })
        .select('id')
        .single();
        
      if (shareError) {
        console.error('Error creating shared item:', shareError);
        setShareError('Error creating shared item in database');
        setProcessingShare(false);
        return;
      }
      
      if (!sharedItem || !sharedItem.id) {
        console.error('No valid shared item ID was created');
        setShareError('Could not create a valid share ID');
        setProcessingShare(false);
        return;
      }
      
      // Generate a common review link with the shared item ID
      commonReviewLink = `${window.location.origin}/review/${itemId}/${sharedItem.id}`;
      
      // Collect phone numbers of selected friends
      for (const friendId of selectedFriends) {
        const friend = friends.find(f => f.id === friendId);
        if (!friend) continue;
        
        selectedFriendsDetails.push(friend);
        
        // Create a record in the database to track this friend's response
        const { data: friendShare, error: friendShareError } = await supabase
          .from('friend_shares')
          .insert({
            shared_item_id: sharedItem.id,
            friend_circle_id: friendId,
            response_status: 'pending'
          });
          
        if (friendShareError) {
          console.error('Error tracking friend share:', friendShareError);
          // Continue anyway as this is just for tracking
        }
      }
      
      // Create a message with all friend names
      const friendNames = selectedFriendsDetails.map(f => f.friend_name).join(', ');
      
      // If it's a single friend, we can create a direct message
      // If multiple friends, we'll offer options
      if (selectedFriendsDetails.length === 1) {
        // Direct message to one friend
        const friend = selectedFriendsDetails[0];
        const message = encodeURIComponent(`${comment || `Check out this ${itemName} from Fabloo Stylist!`} ${commonReviewLink}?name=${encodeURIComponent(friend.friend_name)}&phone=${encodeURIComponent(friend.friend_phone)}`);
        const whatsappUrl = `https://wa.me/${friend.friend_phone}?text=${message}`;
        
        // Open WhatsApp in a new tab
        window.open(whatsappUrl, '_blank');
      } else {
        // For multiple friends, we have a few options:
        
        // Option 1: Create a message for WhatsApp group (user creates/selects group)
        const groupMessage = encodeURIComponent(`${comment || `Check out this ${itemName} from Fabloo Stylist!`} I'm sharing this with ${friendNames}. What do you all think? ${commonReviewLink}`);
        const whatsappGroupUrl = `https://wa.me/?text=${groupMessage}`;
        
        // Open WhatsApp with the group message
        window.open(whatsappGroupUrl, '_blank');
        
        // Also provide the ability to copy the link for sharing in other ways
        await navigator.clipboard.writeText(`${comment || `Check out this ${itemName} from Fabloo Stylist!`} I'm sharing this with ${friendNames}. What do you all think? ${commonReviewLink}`);
        toast.success("Link also copied to clipboard!", { duration: 5000 });
      }
      
      // Mark as success
      setShareSuccess(true);
      if (onSuccess) {
        onSuccess();
      }
      
      toast.success(`Shared with ${selectedFriends.length} ${selectedFriends.length === 1 ? 'friend' : 'friends'}!`);
      
      // Close modal after success
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Error sharing with friends:', err);
      setShareError(err instanceof Error ? err.message : 'Failed to share with friends');
    } finally {
      setProcessingShare(false);
    }
  };

  // Handle sharing via link or other methods
  const handleShareViaLink = async () => {
    try {
      console.log('Starting share via link process');
      
      // Check if user is authenticated
      if (!user) {
        console.log('User not authenticated, using fallback sharing');
        // Show a message that they can share but won't be able to track responses
        toast("You're not signed in. You can still share but won't be able to track responses.", {
          icon: '🔔'
        });
        
        // Generate a simple link without storing in database
        const productLink = `${window.location.origin}product/${itemId}`;
        const shareText = `Check out this ${itemName} from Fabloo Stylist! What do you think? ${productLink}`;
        
        // Try to use the Web Share API
        if (navigator.share) {
          await navigator.share({
            title: itemName,
            text: `Check out this ${itemName} from Fabloo Stylist!`,
            url: productLink
          });
        } else {
          // Fallback to clipboard
          await navigator.clipboard.writeText(shareText);
          toast.success("Link copied to clipboard!");
        }
        
        // Close modal
        setTimeout(() => {
          onClose();
          if (onSuccess) {
            onSuccess();
          }
        }, 2000);
        
        return;
      }
      
      console.log('Creating shared_item record with parameters:', {
        sender_id: user.id,
        item_id: itemId
      });
      
      // Create a shared_item record to track this share
      const { data: sharedItem, error: shareError } = await supabase
        .from('shared_items')
        .insert({
          sender_id: user.id,
          item_id: itemId,
          comment: `Check out this ${itemName} from Fabloo Stylist!`,
          response_status: 'pending'
          // Not including friend_circle_id since this may be shared with someone new
        })
        .select('id, item_id')
        .single();
        
      console.log('Supabase insert response:', { data: sharedItem, error: shareError });
        
      if (shareError) {
        console.error('Error creating shared item:', shareError);
        // Fall back to simple sharing without database tracking
        const productLink = `${window.location.origin}product/${itemId}`;  // Use product link as fallback
        const shareText = `Check out this ${itemName} from Fabloo Stylist! What do you think? ${productLink}`;
        
        if (navigator.share) {
          await navigator.share({
            title: itemName,
            text: `Check out this ${itemName} from Fabloo Stylist!`,
            url: productLink
          });
        } else {
          await navigator.clipboard.writeText(shareText);
          toast.success("Link copied to clipboard!");
        }
        
        toast("Couldn't create a tracked share, but you can still share the product!", {
          icon: '⚠️'
        });
        
        setTimeout(() => {
          onClose();
          if (onSuccess) {
            onSuccess();
          }
        }, 2000);
        
        return;
      }
      
      // Only proceed if we have a valid sharedItem with an id
      if (!sharedItem || !sharedItem.id) {
        console.error('No valid shared item ID was created', sharedItem);
        // Fall back to simple sharing
        const productLink = `${window.location.origin}product/${itemId}`;
        const shareText = `Check out this ${itemName} from Fabloo Stylist! What do you think? ${productLink}`;
        
        if (navigator.share) {
          await navigator.share({
            title: itemName,
            text: `Check out this ${itemName} from Fabloo Stylist!`,
            url: productLink
          });
        } else {
          await navigator.clipboard.writeText(shareText);
          toast.success("Link copied to clipboard!");
        }
        
        toast("Couldn't create a proper review link, sharing a direct link instead", {
          icon: '⚠️'
        });
        
        return;
      }
      
      // Extra check to make sure the ID is a proper UUID
      if (typeof sharedItem.id !== 'string' || sharedItem.id.length < 10) {
        console.error('Invalid share ID format:', sharedItem.id);
        // Fall back to simple sharing
        const productLink = `${window.location.origin}product/${itemId}`;
        const shareText = `Check out this ${itemName} from Fabloo Stylist! What do you think? ${productLink}`;
        
        if (navigator.share) {
          await navigator.share({
            title: itemName,
            text: `Check out this ${itemName} from Fabloo Stylist!`,
            url: productLink
          });
        } else {
          await navigator.clipboard.writeText(shareText);
          toast.success("Link copied to clipboard!");
        }
        
        toast("Generated share ID appears invalid, using direct link instead", {
          icon: '⚠️'
        });
        
        setTimeout(() => {
          onClose();
          if (onSuccess) {
            onSuccess();
          }
        }, 2000);
        
        return;
      }
      
      // Generate a unique review link with the shared item ID
      const reviewLink = `${window.location.origin}/review/${itemId}/${sharedItem.id}`;
      console.log('Created review link:', reviewLink);
      
      const shareText = `Check out this ${itemName} from Fabloo Stylist! I'd love your opinion: ${reviewLink}`;
      
      // Try to use the Web Share API first (works on mobile devices)
      if (navigator.share) {
        await navigator.share({
          title: itemName,
          text: `Check out this ${itemName} from Fabloo Stylist!`,
          url: reviewLink
        });
        toast.success("Link shared successfully! When your friend completes the review, they'll be added to your friend circle.");
      } else {
        // Fallback for desktop - copy to clipboard
        await navigator.clipboard.writeText(shareText);
        toast.success("Link copied to clipboard! You can now paste it in WhatsApp or any other app. When your friend completes the review, they'll be added to your friend circle.");
      }
      
      // Close the modal after successful share
      setTimeout(() => {
        onClose();
        if (onSuccess) {
          onSuccess();
        }
      }, 2000);
    } catch (err) {
      console.error('Error sharing link:', err);
      toast.error("Failed to share link. Please try again.");
      
      // Fallback to simple sharing
      try {
        const productLink = `${window.location.origin}product/${itemId}`;
        const shareText = `Check out this ${itemName} from Fabloo Stylist! What do you think? ${productLink}`;
        
        if (navigator.share) {
          await navigator.share({
            title: itemName,
            text: `Check out this ${itemName} from Fabloo Stylist!`,
            url: productLink
          });
        } else {
          await navigator.clipboard.writeText(shareText);
          toast.success("Link copied to clipboard!");
        }
      } catch (fallbackErr) {
        console.error('Even fallback sharing failed:', fallbackErr);
      }
    }
  };

  // Handle direct WhatsApp sharing
  const handleShareToWhatsApp = async () => {
    try {
      console.log('Starting WhatsApp share process');
      
      // Check if user is authenticated
      if (!user) {
        console.log('User not authenticated, using fallback sharing');
        // Show a message that they can share but won't be able to track responses
        toast("You're not signed in. You can still share but won't be able to track responses.", {
          icon: '🔔'
        });
        
        // Generate a simple link without storing in database
        const productLink = `${window.location.origin}product/${itemId}`;
        const shareText = encodeURIComponent(`Check out this ${itemName} from Fabloo Stylist! What do you think? ${productLink}`);
        
        // Open WhatsApp with prefilled message
        window.open(`https://wa.me/?text=${shareText}`, '_blank');
        
        // Close modal
        setTimeout(() => {
          onClose();
          if (onSuccess) {
            onSuccess();
          }
        }, 2000);
        
        return;
      }
      
      console.log('Creating shared_item record with parameters:', {
        sender_id: user.id,
        item_id: itemId
      });
      
      // Create a shared_item record to track this share - only if user is authenticated
      const { data: sharedItem, error: shareError } = await supabase
        .from('shared_items')
        .insert({
          sender_id: user.id,
          item_id: itemId,
          comment: `Check out this ${itemName} from Fabloo Stylist!`,
          response_status: 'pending'
          // Note: We're not including friend_circle_id since this is a new person not yet in our circle
        })
        .select('id, item_id')
        .single();
      
      console.log('Supabase insert response:', { data: sharedItem, error: shareError });
        
      if (shareError) {
        console.error('Error creating shared item:', shareError);
        // Fall back to simple sharing without database tracking
        const productLink = `${window.location.origin}product/${itemId}`;  // Use product link as fallback
        const shareText = encodeURIComponent(`Check out this ${itemName} from Fabloo Stylist! What do you think? ${productLink}`);
        
        window.open(`https://wa.me/?text=${shareText}`, '_blank');
        toast("Couldn't create a tracked share, but you can still share the product!", {
          icon: '⚠️'
        });
        
        setTimeout(() => {
          onClose();
          if (onSuccess) {
            onSuccess();
          }
        }, 2000);
        
        return;
      }
      
      // Only proceed if we have a valid sharedItem with an id
      if (!sharedItem || !sharedItem.id) {
        console.error('No valid shared item ID was created', sharedItem);
        // Fall back to simple sharing
        const productLink = `${window.location.origin}product/${itemId}`;
        const shareText = encodeURIComponent(`Check out this ${itemName} from Fabloo Stylist! What do you think? ${productLink}`);
        
        window.open(`https://wa.me/?text=${shareText}`, '_blank');
        toast("Couldn't create a proper review link, sharing a direct link instead", {
          icon: '⚠️'
        });
        
        setTimeout(() => {
          onClose();
          if (onSuccess) {
            onSuccess();
          }
        }, 2000);
        
        return;
      }
      
      // Extra check to make sure the ID is a proper UUID
      if (typeof sharedItem.id !== 'string' || sharedItem.id.length < 10) {
        console.error('Invalid share ID format:', sharedItem.id);
        // Fall back to simple sharing
        const productLink = `${window.location.origin}product/${itemId}`;
        const shareText = encodeURIComponent(`Check out this ${itemName} from Fabloo Stylist! What do you think? ${productLink}`);
        
        window.open(`https://wa.me/?text=${shareText}`, '_blank');
        toast("Generated share ID appears invalid, using direct link instead", {
          icon: '⚠️'
        });
        
        setTimeout(() => {
          onClose();
          if (onSuccess) {
            onSuccess();
          }
        }, 2000);
        
        return;
      }
      
      // Generate a unique review link with the shared item ID
      const reviewLink = `${window.location.origin}/review/${itemId}/${sharedItem.id}`;
      console.log('Created review link:', reviewLink);
      
      const shareText = encodeURIComponent(`Check out this ${itemName} from Fabloo Stylist! I'd love your opinion: ${reviewLink}`);
      
      // Open WhatsApp with prefilled message
      window.open(`https://wa.me/?text=${shareText}`, '_blank');
      
      // Show success message
      toast.success("When your friend completes the review, they'll be added to your friend circle automatically!");
      
      // Close the modal after successful share
      setTimeout(() => {
        onClose();
        if (onSuccess) {
          onSuccess();
        }
      }, 2000);
    } catch (err) {
      console.error('Error sharing to WhatsApp:', err);
      toast.error("Failed to share to WhatsApp. Please try again.");
      
      // Fallback to simple sharing
      try {
        const productLink = `${window.location.origin}product/${itemId}`;
        const shareText = encodeURIComponent(`Check out this ${itemName} from Fabloo Stylist! What do you think? ${productLink}`);
        window.open(`https://wa.me/?text=${shareText}`, '_blank');
      } catch (fallbackErr) {
        console.error('Even fallback sharing failed:', fallbackErr);
      }
    }
  };

  // Get top friends to display in the initial view
  const topFriends = friends.slice(0, 6);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="relative bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Success State */}
            {shareSuccess ? (
              <div className="p-6 text-center relative">
                {/* Confetti Decorations */}
                <div className="absolute top-0 right-8">
                  <svg width="34" height="30" viewBox="0 0 34 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M31.5 0L34 12L23 7.5L31.5 0Z" fill="#61DAFB"/>
                    <path d="M15 14L19.5 30L8.5 25.5L15 14Z" fill="#F77777"/>
                    <path d="M0 5.5L14.5 6.5L7 17L0 5.5Z" fill="#B252FF"/>
                  </svg>
                </div>
                <div className="absolute bottom-12 left-12">
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 0L17.5 10.5H28L19.5 17L23 28L14 21.5L5 28L8.5 17L0 10.5H10.5L14 0Z" fill="#55B938"/>
                  </svg>
                </div>
                <div className="mx-auto flex items-center justify-center w-16 h-16 bg-green-50 rounded-full mb-4">
                  <CheckCheck className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Shared Successfully!</h3>
                <p className="text-gray-600 mb-6">
                  Your item has been shared via WhatsApp with your selected friends
                </p>
                <button
                  onClick={onClose}
                  className="w-full py-2.5 bg-gradient-to-r from-[#B252FF] to-[#F777F7] text-white font-medium rounded-lg hover:opacity-90"
                >
                  Continue Shopping
                </button>
              </div>
            ) : showFriendsSelection ? (
              <>
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-purple-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Share with Friends</h2>
                  </div>
                  <button
                    onClick={onClose}
                    className="rounded-full p-1 hover:bg-gray-100"
                  >
                    <X size={20} className="text-gray-500" />
                  </button>
                </div>

                <div className="p-6">
                  {/* Product Preview */}
                  <div className="flex items-center gap-4 mb-6 p-3 bg-gray-50 rounded-lg">
                    <img
                      src={itemImage}
                      alt={itemName}
                      className="w-16 h-16 object-cover rounded-md"
                    />
                    <div>
                      <h3 className="font-medium text-gray-900 line-clamp-1">{itemName}</h3>
                      <p className="text-sm text-gray-500">Ask your friends what they think!</p>
                    </div>
                  </div>

                  {/* Selected Friends */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Share with
                      </label>
                      <button
                        onClick={() => setShowFriendCircle(true)}
                        className="text-xs font-medium text-purple-600 hover:text-purple-800 flex items-center gap-1"
                      >
                        <Users className="w-3 h-3" />
                        Add friends
                      </button>
                    </div>

                    {selectedFriends.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedFriends.map(friendId => (
                          <div
                            key={friendId}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 rounded-full text-sm text-purple-800"
                          >
                            <span>{friendId}</span>
                            <button
                              onClick={() => toggleFriendSelection(friendId)}
                              className="hover:bg-purple-100 rounded-full p-0.5"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div
                        onClick={() => setShowFriendCircle(true)}
                        className="p-4 border border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-50"
                      >
                        <p className="text-sm text-gray-500">
                          Click to select friends to share with
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Comment Input */}
                  <div className="mb-6">
                    <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">
                      Add a comment (optional)
                    </label>
                    <textarea
                      id="comment"
                      rows={3}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500"
                      placeholder="What do you think about this outfit?"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                  </div>

                  {shareError && (
                    <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                      {shareError}
                    </div>
                  )}

                  {!tablesExist && (
                    <div className="mb-4 p-3 bg-amber-50 text-amber-600 rounded-lg text-sm">
                      Friend circle functionality is unavailable. The database tables need to be created.
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowFriendsSelection(false)}
                      className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleShare}
                      disabled={selectedFriends.length === 0 || processingShare || !tablesExist}
                      className="flex-1 py-2.5 bg-gradient-to-r from-[#B252FF] to-[#F777F7] text-white font-medium rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {processingShare ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Sharing...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Submit
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
                  <h2 className="text-center w-full text-lg font-semibold text-gray-900">Ask My Circle</h2>
                  <button
                    onClick={onClose}
                    className="rounded-full p-1 hover:bg-gray-100 absolute right-4"
                  >
                    <X size={20} className="text-gray-500" />
                  </button>
                </div>

                <div className="p-6">
                  {/* Share description */}
                  <p className="text-center text-sm text-gray-600 mb-6">
                    Share your favourite outfit combos with your friends circle, get feedback, inspire others, and level up your style!
                  </p>
                  
                  {/* Product Preview */}
                  <div className="flex flex-col items-center mb-4">
                    <div className="w-48 h-64 mb-3">
                      <img
                        src={itemImage}
                        alt={itemName}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>
                    <h3 className="font-medium text-gray-900 text-center">{itemName}</h3>
                  </div>

                  {/* Friends Circle */}
                  {!loading && friends.length > 0 ? (
                    <div className="mb-6">
                      {selectedFriends.length > 0 ? (
                        <h3 className="text-center font-medium text-green-600 mb-2">
                          {selectedFriends.length} friend{selectedFriends.length > 1 ? 's' : ''} selected
                        </h3>
                      ) : (
                        <h3 className="text-center font-medium text-gray-700 mb-4">Select Friends</h3>
                      )}
                      
                      <div className="grid grid-cols-3 gap-4">
                        {topFriends.map(friend => (
                          <div 
                            key={friend.id}
                            onClick={() => toggleFriendSelection(friend.id)}
                            className="flex flex-col items-center cursor-pointer"
                          >
                            <div className={`relative w-10 h-10 rounded-full mb-2 
                              ${selectedFriends.includes(friend.id) 
                                ? 'bg-purple-100 border-2 border-purple-500' 
                                : 'bg-gray-100'
                              } 
                              flex items-center justify-center`}
                            >
                              {selectedFriends.includes(friend.id) && (
                                <div className="absolute -top-1 -right-1 bg-purple-500 rounded-full w-5 h-5 flex items-center justify-center z-10">
                                  <CheckCircle className="w-3 h-3 text-white" />
                                </div>
                              )}
                              <span className="text-lg font-medium text-gray-700">
                                {friend.friend_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-xs text-gray-600 text-center line-clamp-1">{friend.friend_name}</span>
                          </div>
                        ))}
                      </div>
                      
                      {friends.length > 6 && (
                        <button
                          onClick={() => setShowFriendCircle(true)}
                          className="w-full mt-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 flex items-center justify-center gap-1"
                        >
                          <Users className="w-4 h-4" />
                          View All Friends
                        </button>
                      )}
                    </div>
                  ) : !loading && friends.length === 0 ? (
                    <div className="mb-6">
                      <div className="text-center p-4 border border-dashed border-gray-300 rounded-lg mb-4">
                        <Users className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                        <h3 className="text-center font-medium text-gray-700 mb-1">No Friends Yet</h3>
                        <p className="text-xs text-gray-500">
                          Share with your friends via WhatsApp or other apps and they'll be added to your circle when they provide feedback.
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {/* Share options */}
                  <div className="space-y-3">
                    {friends.length > 0 && (
                      <button
                        onClick={() => setShowFriendsSelection(true)}
                        disabled={selectedFriends.length === 0}
                        className="w-full py-3 bg-gradient-to-r from-[#B252FF] to-[#F777F7] text-white font-medium rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        Share with my style circle
                      </button>
                    )}


                    <div className="flex gap-2">
                    <button
                      onClick={() => handleShareToWhatsApp()}
                      className="w-full py-3 bg-white border border-[#25D366] text-[#25D366] font-medium rounded-lg flex items-center justify-center gap-2 hover:bg-[#25D366] hover:text-white"
                    >
                      <Users className="w-4 h-4" /> 
                      Invite Friends
                    </button>
                    
                    <button
                      onClick={() => handleShareViaLink()}
                      className="p-3 border border-gray-300 text-gray-700 font-medium rounded-lg flex items-center justify-center gap-2"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    </div>
                  </div>

                  {/* Explanatory text for new users */}
                  {friends.length === 0 && (
                    <div className="mt-6 pt-4 border-t border-gray-100">
                      <p className="text-xs text-gray-500 text-center">
                        When your friends review the shared item, they'll automatically join your friend circle for future shares!
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </motion.div>

          {/* Friend Circle Modal */}
          <FriendCircle
            isOpen={showFriendCircle}
            onClose={() => setShowFriendCircle(false)}
            onSelect={(friend) => {
              setShowFriendCircle(false);
              toggleFriendSelection(friend.id);
            }}
            selectable
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
} 