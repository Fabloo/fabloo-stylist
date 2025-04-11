import React, { useEffect } from 'react';
import { ShoppingBag, User, X, CreditCard, Heart } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { Checkout } from '../pages/Checkout';
import { useAuth } from '../hooks/useAuth';
import { useWishlist } from '../hooks/useWishlist';
import { supabase } from '../lib/supabase';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

type LayoutProps = {
  children: React.ReactNode;
};

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const { items: cartItems, isLoading, error, removeFromCart, totalItems, totalAmount, fetchCart } = useCart();
  const [localCartItems, setLocalCartItems] = useState(cartItems);
  const { wishlistItems, removeFromWishlist, loading, error: wishlistError, refreshWishlist, totalWishlistItems} = useWishlist();
  const { isAuthenticated } = useAuth();
  const [sizeModalOpen, setSizeModalOpen] = useState<string | null>(null);
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [cartError, setCartError] = useState<string | null>(null);

  // Update localCartItems when cartItems change
  useEffect(() => {
    setLocalCartItems(cartItems);
  }, [cartItems]);

  // Add animations for opening and closing modals
  const modalAnimation = "transition-transform duration-300 ease-in-out transform";

  const handleCartOpen = () => {
    setIsCartOpen(true);
  };
  

  const handleCheckout = () => {
    setIsCheckoutOpen(true);
    setIsCartOpen(false);
  };

  const handleWishlistOpen = async () => {
    await refreshWishlist();
    setIsWishlistOpen(true);
  };

  // Handle removing item from wishlist with immediate feedback
  const handleRemoveFromWishlist = async (itemId: string) => {
    try {
      await removeFromWishlist(itemId);
    } catch (error) {
      console.error('Failed to remove item from wishlist:', error);
    }
  };

  const addToCart = async (itemId: string) => {
    if (!isAuthenticated) {
      setCartError('Please sign in to continue');
      return;
    }

    if (!selectedSizes[itemId]) {
      setCartError('Please select a size');
      return;
    }

    try {
      setAddingToCart(itemId);
      setCartError(null);

      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (!userId) {
        throw new Error('User not found');
      }

      // First add to cart
      const { error } = await supabase
        .from('cart_items')
        .upsert(
          { 
            user_id: userId, 
            item_id: itemId, 
            quantity: 1,
            size_selected: selectedSizes[itemId]
          },
          { onConflict: 'user_id,item_id' }
        );

      if (error) throw error;

      // Find the wishlist item to remove
      const { data: wishlistItem } = await supabase
        .from('wishlist_items')
        .select('id')
        .eq('user_id', userId)
        .eq('item_id', itemId)
        .single();

      // If item exists in wishlist, remove it
      if (wishlistItem) {
        await removeFromWishlist(wishlistItem.id);
      }

      // Refresh cart and close modal
      await fetchCart();
      setSizeModalOpen(null);
      setSelectedSizes(prev => {
        const newSizes = { ...prev };
        delete newSizes[itemId];
        return newSizes;
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add item to cart';
      setCartError(errorMessage);
      console.error('Failed to add item to cart:', err);
    } finally {
      setAddingToCart(null);
    }
  };


  return (
    <div className="min-h-[60vh] bg-gray-50">
      <ToastContainer />
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-xl font-semibold text-gray-900">
                <img
      src="https://res.cloudinary.com/dofgnvgo6/image/upload/v1744363320/Union_1_ugzdfs.svg" // Replace with your image URL
     alt="Brand Logo"
    className="w-32 h-28 object-contain"
    />
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={handleWishlistOpen}
                className="p-2 rounded-full hover:bg-gray-100 relative"
              >
                <Heart className="w-6 h-6 text-gray-600" />
                {totalWishlistItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-pink-400 text-white
                                 text-xs rounded-full w-5 h-5 flex items-center 
                                 justify-center">{totalWishlistItems}</span>
                )}
              </button>
            <button 
                onClick={handleCartOpen}
                className="p-2 rounded-full hover:bg-gray-100 relative"
              >
                <ShoppingBag className="w-6 h-6 text-gray-600" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-pink-400 text-white
                                 text-xs rounded-full w-5 h-5 flex items-center 
                                 justify-center">{totalItems}</span>
                )}
              </button>
              <button 
                onClick={() => navigate('/profile')}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <User className="w-6 h-6 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {isCartOpen && (
  <div className={`fixed inset-0 z-50 overflow-hidden ${modalAnimation} bg-gradient-to-br from-gray-100 to-gray-300`}>
    {/* Improved Background Overlay with blur */}
    <div
      className="absolute inset-0 bg-gray-800/70 backdrop-blur-sm transition-opacity duration-300"
      aria-hidden="true"
      onClick={() => setIsCartOpen(false)}
    />

    {/* Enhanced Slide-in Panel */}
    <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex animate-slide-in">
      <div className="w-screen max-w-md">
        <div className="h-full flex flex-col bg-white shadow-2xl">
          {/* Refined Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-white">
            <h2 className="text-2xl font-bold text-gray-800 leading-tight">Your Cart</h2>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            >
              <X className="h-6 w-6 text-gray-600" />
            </button>
          </div>

          {/* Enhanced Cart Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"/>
              </div>
            ) : error ? (
              <div className="text-center p-6 bg-red-50 rounded-lg">
                <p className="text-red-600">{error}</p>
              </div>
            ) : localCartItems.length === 0 ? (
              <div className="text-center p-10">
                <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Your cart is empty</p>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="mt-4 text-black hover:text-indigo-500 transition-colors duration-200"
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              <ul className="space-y-6">
                {localCartItems.map((item) => (
                  <li key={item.id} className="flex bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                    {/* Enhanced Product Image */}
                    <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border border-gray-200">
                      <img
                        src={item.inventory_items.image_url}
                        alt={item.inventory_items.name}
                        className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-200"
                      />
                    </div>

                    {/* Improved Details Layout */}
                    <div className="ml-4 flex-1 flex flex-col">
                      <div className="flex justify-between items-start">
                        <h3 className="text-lg font-medium text-gray-900 hover:text-black transition-colors duration-200">
                          {item.inventory_items.name}
                        </h3>
                        <p className="text-lg font-semibold text-gray-800">
                          ₹{(item.inventory_items.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                      <div className="mt-2 flex justify-between items-center">
                        <div className="flex items-center space-x-4">
                          <span className="px-2 py-1 bg-gray-100 rounded-full text-sm text-gray-600">
                            Size: {item.size_selected}
                          </span>
                          <span className="px-2 py-1 bg-gray-100 rounded-full text-sm text-gray-600">
                            Qty: {item.quantity}
                          </span>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-sm font-medium text-red-500 hover:text-red-600 transition-colors duration-200 flex items-center"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Enhanced Footer */}
          <div className="border-t border-gray-200 bg-gray-50 p-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xl font-medium text-gray-800">Total</span>
              <span className="text-xl font-bold text-black">
                ₹{totalAmount.toFixed(2)}
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-6 flex items-center">
              <CreditCard className="w-4 h-4 mr-2 text-gray-400" />
              Shipping and taxes calculated at checkout
            </p>
            <button
              onClick={handleCheckout}
              className="w-full inline-flex items-center justify-center px-6 py-4 border border-transparent rounded-lg shadow-lg text-lg font-medium text-white bg-gradient-to-r from-[#B252FF] to-[#F777F7] hover:opacity-90 transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#B252FF]"
            >
              Proceed to Checkout
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
)}


      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="absolute inset-0 bg-gray-500 h-full bg-opacity-75 transition-opacity" 
               onClick={() => setIsCheckoutOpen(false)} />
          
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl">
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="absolute right-4 top-4 text-gray-400 hover:text-gray-500"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="p-6">
                <Checkout onSuccess={() => {
                  setIsCheckoutOpen(false);
                  setLocalCartItems([]);
                  navigate('/order-success');
                }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wishlist Modal */}
      {isWishlistOpen && (
        <div className={`fixed inset-0 z-50 overflow-hidden ${modalAnimation}`}>
          {/* Improved Background Overlay with enhanced blur */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-md transition-opacity duration-500"
            aria-hidden="true"
            onClick={() => setIsWishlistOpen(false)}
          />

          {/* Enhanced Slide-in Panel */}
          <div className="fixed inset-y-0 right-0 flex animate-slide-in">
            <div className="w-screen max-w-md sm:max-w-lg pl-20 md:max-w-xl relative">
              <div className="h-full flex flex-col bg-white/95 backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.15)] rounded-l-3xl">
                {/* Refined Header with Glass Effect */}
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100/50 bg-white/50 backdrop-blur-md rounded-tl-3xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-100 to-indigo-100 flex items-center justify-center shadow-inner">
                      <Heart className="w-5 h-5 text-pink-500" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-br from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                      Your Wishlist
                    </h2>
                  </div>
                  <button
                    onClick={() => setIsWishlistOpen(false)}
                    className="p-2 rounded-xl hover:bg-white/80 transition-all duration-200 active:scale-90"
                  >
                    <X className="h-5 w-5 sm:h-6 sm:w-6 text-gray-500" />
                  </button>
                </div>

                {/* Enhanced Wishlist Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gradient-to-br from-white/80 to-gray-50/80">
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="relative">
                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-pink-500/20 border-t-pink-500"/>
                        <Heart className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-pink-500" />
                      </div>
                    </div>
                  ) : wishlistError ? (
                    <div className="text-center p-6 bg-red-50/50 backdrop-blur-sm rounded-2xl border border-red-100">
                      <p className="text-red-600">{wishlistError}</p>
                    </div>
                  ) : wishlistItems.length === 0 ? (
                    <div className="text-center p-6 sm:p-10">
                      <div className="w-32 h-32 mx-auto mb-8 bg-gradient-to-br from-pink-100 via-purple-50 to-indigo-100 rounded-2xl flex items-center justify-center shadow-xl shadow-pink-100/50 transform hover:scale-105 transition-all duration-300">
                        <Heart className="h-16 w-16 text-pink-400 animate-pulse" />
                      </div>
                      <p className="text-xl sm:text-2xl text-gray-800 font-semibold mb-4 bg-gradient-to-r from-pink-600 to-indigo-600 bg-clip-text text-transparent">
                        Your wishlist is empty
                      </p>
                      <p className="text-gray-500 mb-8">Start adding items you love to your collection!</p>
                      <button 
                        onClick={() => setIsWishlistOpen(false)}
                        className="px-8 py-4 bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 text-white rounded-xl font-medium hover:from-pink-600 hover:to-indigo-600 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-pink-500/20 active:scale-95"
                      >
                        Explore Products
                      </button>
                    </div>
                  ) : (
                    <ul className="space-y-4 sm:space-y-6">
                      {wishlistItems.map((item) => (
                        <li key={item.id} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden group">
                          <div className="flex flex-col sm:flex-row">
                            {/* Product Image with Enhanced Hover Effects */}
                            <div className="w-full sm:w-40 h-48 sm:h-40 relative overflow-hidden">
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="w-full h-full object-contain transform group-hover:scale-110 transition-transform duration-500"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                              <div className="absolute top-2 right-2">
                                <button
                                  onClick={() => handleRemoveFromWishlist(item.id)}
                                  className="w-8 h-8 rounded-xl bg-white/90 hover:bg-white shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200 flex items-center justify-center group/btn"
                                >
                                  <X className="h-5 w-5 text-gray-400 group-hover/btn:text-red-500 transition-colors duration-200" />
                                </button>
                              </div>
                            </div>

                            {/* Improved Details Layout */}
                            <div className="flex-1 p-5 sm:p-6 flex flex-col">
                              <div className="flex justify-between items-start mb-3">
                                <h3 className="text-lg font-medium text-gray-900 hover:text-black transition-colors duration-200 line-clamp-1 group-hover:text-pink-600">
                                  {item.name}
                                </h3>
                                <p className="text-lg font-bold bg-gradient-to-br from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                                  ₹{item.price.toFixed(2)}
                                </p>
                              </div>
                              <p className="text-sm text-gray-500 line-clamp-2 mb-4 group-hover:text-gray-600">
                                {item.description}
                              </p>
                              <div className="mt-auto flex justify-end">
                                <button
                                  onClick={() => {
                                    if (!isAuthenticated) {
                                      setCartError('Please sign in to continue');
                                      return;
                                    }
                                    // Open size selection modal if item_id exists
                                    if (item.item_id) {
                                      setSizeModalOpen(item.item_id);
                                    }
                                  }}
                                  className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 rounded-xl hover:from-pink-600 hover:to-indigo-600 transform hover:scale-105 transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-pink-500/20 active:scale-95 flex items-center space-x-2"
                                >
                                  <ShoppingBag className="w-4 h-4" />
                                  <span>Add to Cart</span>
                                </button>

                                {/* Size Selection Modal */}
                                {item.item_id && sizeModalOpen === item.item_id && (
                                  <div className="fixed inset-0 z-50 overflow-y-auto">
                                    <div className="flex min-h-full items-center justify-center p-4">
                                      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSizeModalOpen(null)} />
                                      <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full">
                                        <h3 className="text-lg font-semibold mb-4">Select Size</h3>
                                        <div className="grid grid-cols-3 gap-2 mb-4">
                                          {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((size) => (
                                            <button
                                              key={size}
                                              onClick={() => {
                                                const itemId = item.item_id;
                                                if (itemId) {
                                                  setSelectedSizes(prev => ({
                                                    ...prev,
                                                    [itemId]: size
                                                  }));
                                                }
                                              }}
                                              className={`py-2 rounded-lg border ${
                                                item.item_id && selectedSizes[item.item_id] === size
                                                  ? 'border-black bg-black text-white'
                                                  : 'border-gray-200 hover:border-gray-300'
                                              }`}
                                            >
                                              {size}
                                            </button>
                                          ))}
                                        </div>
                                        <div className="flex gap-3">
                                          <button
                                            onClick={() => setSizeModalOpen(null)}
                                            className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            onClick={() => {
                                              const itemId = item.item_id;
                                              if (itemId) {
                                                addToCart(itemId);
                                              }
                                            }}
                                            disabled={!item.item_id || !selectedSizes[item.item_id] || addingToCart === item.item_id}
                                            className="flex-1 py-2.5 bg-black text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                          >
                                            {addingToCart === item.item_id ? (
                                              'Adding...'
                                            ) : (
                                              <>
                                                <ShoppingBag className="w-4 h-4" />
                                                Add to Cart
                                              </>
                                            )}
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="">
        {children}
      </main>
    </div>
  );
}
