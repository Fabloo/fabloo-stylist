import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFriendCircle } from '../hooks/useFriendCircle';
import { Friend } from '../types';
import { X, Plus, Users, CheckCircle, User, Trash2, Share, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (friend: Friend) => void;
  selectable?: boolean;
};

export function FriendCircle({ isOpen, onClose, onSelect, selectable = false }: Props) {
  const navigate = useNavigate();
  const { friends, loading, error, addFriend, removeFriend, tablesExist } = useFriendCircle();
  const [newFriendName, setNewFriendName] = useState('');
  const [newFriendPhone, setNewFriendPhone] = useState('');
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [viewState, setViewState] = useState<'friendList' | 'emptyPrompt' | 'invitationSent'>('friendList');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setNewFriendName('');
      setNewFriendPhone('');
      setIsAddingFriend(false);
      setValidationError(null);
      
      // Check if we need to show the empty state
      if (!loading && friends.length === 0) {
        setViewState('emptyPrompt');
      } else {
        setViewState('friendList');
      }
    }
  }, [isOpen, loading, friends.length]);

  // Function to open the add friend form with pre-populated data
  const openAddFriendWithData = (name: string, phone: string) => {
    setNewFriendName(name);
    setNewFriendPhone(phone);
    setIsAddingFriend(true);
  };

  // Handle adding a new friend
  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    
    if (!newFriendName.trim()) {
      setValidationError('Friend name is required');
      return;
    }
    
    if (!newFriendPhone.trim()) {
      setValidationError('Please enter a valid phone number');
      return;
    }
    
    setIsAddingFriend(true);
    
    try {
      console.log("Submitting friend data:", { name: newFriendName, phone: newFriendPhone });
      const result = await addFriend(newFriendName, newFriendPhone);
      console.log("Add friend result:", result);
      
      if (result) {
        setNewFriendName('');
        setNewFriendPhone('');
        setViewState('invitationSent');
      }
    } catch (err) {
      console.error('Error in component when adding friend:', err);
      setValidationError(err instanceof Error ? err.message : 'Failed to add friend');
    } finally {
      setIsAddingFriend(false);
    }
  };

  // Handle removing a friend
  const handleRemoveFriend = async (friendId: string) => {
    if (confirm('Are you sure you want to remove this friend from your circle?')) {
      try {
        await removeFriend(friendId);
      } catch (err) {
        console.error('Error removing friend:', err);
        setValidationError(err instanceof Error ? err.message : 'Failed to remove friend');
      }
    }
  };

  // Handle navigation to results page
  const handleNavigateToResults = () => {
    onClose(); // Close the modal
    navigate('/friend-circle-results'); // Navigate to results page
  };

  // Handle WhatsApp invite
  const handleWhatsAppInvite = () => {
    try {
      const appUrl = window.location.origin;
      const inviteMessage = `Hey! I'm using Fabloo Stylist for fashion recommendations. Join my style circle and help me choose outfits! ${appUrl}`;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(inviteMessage)}`;
      window.open(whatsappUrl, '_blank');
    } catch (err) {
      console.error('Error opening WhatsApp:', err);
      setValidationError('Could not open WhatsApp. Please try again later.');
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="py-8 flex justify-center">
          <div className="w-6 h-6 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
        </div>
      );
    }

    switch (viewState) {
      case 'emptyPrompt':
        return (
          <div className="flex flex-col items-center justify-center px-4 py-12">
            <div className="text-center mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Welcome To My Circle</h3>
              <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
                Dress that highlight your body shape and friend's opinions determine whether your outfits match your overall skin tone
              </p>
              <div className="bg-gray-50 p-4 rounded-xl max-w-sm mx-auto">
                <img 
                  src="https://res.cloudinary.com/dofgnvgo6/image/upload/v1724355797/dresses_wgtkqm.png" 
                  alt="Dress illustration" 
                  className="w-32 h-auto mx-auto mb-4"
                />
                <p className="text-sm text-gray-600">
                  <a href="https://www.thcart.com/template-women-body-type-infographic" 
                     className="text-purple-600 underline"
                     target="_blank" rel="noopener noreferrer">
                    https://www.thcart.com/template-women-body-type-infographic
                  </a>
                </p>
              </div>
            </div>
            
            <div className="w-full space-y-3">
              <button
                onClick={() => setIsAddingFriend(true)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 mb-2 bg-gradient-to-r from-[#B252FF] to-[#F777F7] text-white font-medium rounded-lg shadow-md"
              >
                <Plus size={18} />
                Add Friend Manually
              </button>

              <button
                onClick={() => handleWhatsAppInvite()}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#25D366] text-white font-medium rounded-lg shadow-md hover:bg-[#1fad55]"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Invite Friend via WhatsApp
              </button>
            </div>
          </div>
        );
        
      case 'invitationSent':
        return (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Thank You!</h3>
            <p className="text-gray-500 text-sm max-w-md mx-auto mb-8">
              For the survey participation
            </p>
            
            <div className="w-64 h-64 relative mb-8">
              <img 
                src="https://res.cloudinary.com/dofgnvgo6/image/upload/v1724355797/phone_app_axuzgr.png" 
                alt="App illustration" 
                className="w-full h-full object-contain"
              />
            </div>
            
            <div className="bg-purple-50 p-6 rounded-xl w-full max-w-sm mb-8">
              <h4 className="text-lg font-semibold text-gray-800 mb-2">Your Personal Stylist for</h4>
              <h2 className="text-2xl font-bold text-purple-800 mb-4">Smart Shopping</h2>
              
              <p className="text-sm text-gray-600 mb-4">
                Not sure what to wear or how to find your perfect outfit? Let our AI be your stylist bestie!
              </p>
              
              <button
                onClick={handleNavigateToResults}
                className="w-full py-3 bg-gradient-to-r from-[#B252FF] to-[#F777F7] text-white font-medium rounded-lg"
              >
                Sign In Now
              </button>
              
              <p className="text-xs text-gray-500 mt-2 text-center">
                *ONLY FOR FEMALES*
              </p>
            </div>
            
            <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
              <span>Receive form your stylist and get AI-personalized</span>
              <span>experiences in future</span>
            </p>
            
            <button
              onClick={() => {
                onClose();
                navigate('/shop');
              }}
              className="mt-8 w-full py-3 border border-[#B252FF] text-[#B252FF] font-medium rounded-lg"
            >
              Continue Shopping
            </button>
          </div>
        );
        
      case 'friendList':
      default:
        return (
          <>
            {/* Quick Add Contact */}
            <div className="mb-4 p-4 border border-purple-100 rounded-xl bg-purple-50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center text-white font-medium">
                    PG
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Priyanka Gadi</p>
                    <p className="text-xs text-gray-500">+91 84477 64460</p>
                  </div>
                </div>
                <button
                  onClick={() => openAddFriendWithData("Priyanka Gadi", "+91 84477 64460")}
                  className="p-2 rounded-full bg-purple-100 text-purple-600 hover:bg-purple-200"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
            
            {/* Add new friend button */}
            <button
              onClick={() => setIsAddingFriend(true)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 mb-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Plus size={18} className="text-purple-600" />
              Add a friend to your circle
            </button>

            {/* Friends list */}
            {friends.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto flex items-center justify-center w-16 h-16 bg-purple-50 rounded-full mb-4">
                  <Users className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No friends yet</h3>
                <p className="text-gray-500 text-sm max-w-md mx-auto">
                  Add friends to your style circle to share outfits and get feedback on your style
                </p>
                <button
                  onClick={() => setViewState('emptyPrompt')}
                  className="mt-4 py-2 px-4 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium"
                >
                  Get Started
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {friends.map(friend => (
                  <div key={friend.id} className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center text-white font-medium">
                          {friend.friend_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{friend.friend_name}</p>
                          <p className="text-xs text-gray-500">{friend.friend_phone}</p>
                          <div className="flex items-center mt-1">
                            {friend.friend_status === 'pending' ? (
                              <span className="inline-flex items-center text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mr-1"></span>
                                Invitation Pending
                              </span>
                            ) : friend.friend_status === 'joined' ? (
                              <span className="inline-flex items-center text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Joined
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                                <X className="w-3 h-3 mr-1" />
                                Declined
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {selectable && (
                          <button
                            onClick={() => onSelect?.(friend)}
                            className="p-2 rounded-full hover:bg-purple-50 text-purple-600"
                          >
                            <CheckCircle size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveFriend(friend.id)}
                          className="p-2 rounded-full hover:bg-red-50 text-red-500"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {error && !validationError && (
              <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                {error}
              </div>
            )}
          </>
        );
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-end justify-end"
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

          {/* Panel */}
          <motion.div
            className="relative w-full h-[85vh] bg-white rounded-t-3xl overflow-hidden flex flex-col"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Handle Bar */}
            <div className="w-full flex justify-center pt-3 pb-1">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
            </div>

            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  {viewState === 'emptyPrompt' ? 'Ask My Circle' : 
                   viewState === 'invitationSent' ? 'Ask My Circle Results' : 
                   'My Style Circle'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-1 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {renderContent()}
            </div>
          </motion.div>

          {/* Add Friend Modal */}
          <AnimatePresence>
            {isAddingFriend && (
              <motion.div
                className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <motion.div 
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                  onClick={() => setIsAddingFriend(false)}
                />
                
                <motion.div
                  className="relative bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden"
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                >
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-semibold text-gray-900">Add to Style Circle</h3>
                      <button
                        onClick={() => setIsAddingFriend(false)}
                        className="p-1 rounded-full hover:bg-gray-100"
                      >
                        <X size={20} className="text-gray-500" />
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="friend-name" className="block text-sm font-medium text-gray-700 mb-1">
                          Friend's Name
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <User className="w-5 h-5 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            id="friend-name"
                            className="pl-10 w-full px-4 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500"
                            placeholder="Enter your friend's name"
                            value={newFriendName}
                            onChange={(e) => setNewFriendName(e.target.value)}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label htmlFor="friend-phone" className="block text-sm font-medium text-gray-700 mb-1">
                          Friend's Phone Number
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <Phone className="w-5 h-5 text-gray-400" />
                          </div>
                          <input
                            type="tel"
                            id="friend-phone"
                            className="pl-10 w-full px-4 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500"
                            placeholder="Enter your friend's phone number"
                            value={newFriendPhone}
                            onChange={(e) => setNewFriendPhone(e.target.value)}
                          />
                        </div>
                      </div>
                      
                      {validationError && (
                        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                          {validationError}
                        </div>
                      )}
                      
                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={() => setIsAddingFriend(false)}
                          className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleAddFriend}
                          className="flex-1 py-2.5 bg-gradient-to-r from-[#B252FF] to-[#F777F7] text-white font-medium rounded-lg hover:opacity-90"
                        >
                          Add Friend
                        </button>
                      </div>

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-300"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                          <span className="px-2 bg-white text-gray-500">Or invite directly</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleWhatsAppInvite()}
                        className="w-full py-2.5 bg-[#25D366] text-white font-medium rounded-lg flex items-center justify-center gap-2 hover:bg-[#1fad55]"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                        Invite via WhatsApp
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Debug information toggle */}
          <div className="mt-6 border-t border-gray-100 pt-4">
            <button 
              onClick={() => setShowDebugInfo(!showDebugInfo)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              {showDebugInfo ? 'Hide Debug Info' : 'Show Debug Info'}
            </button>
            
            {showDebugInfo && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs font-mono whitespace-pre-wrap overflow-auto max-h-40">
                <p>Tables Exist: {String(tablesExist)}</p>
                <p>Loading: {String(loading)}</p>
                <p>Error: {error || 'None'}</p>
                <p>Friend Count: {friends.length}</p>
                <p>Adding Friend: {String(isAddingFriend)}</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 