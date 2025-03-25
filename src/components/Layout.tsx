import React from 'react';
import { ShoppingBag, User, X, CreditCard } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { Checkout } from '../pages/Checkout';
import { useAuth } from '../hooks/useAuth';

type LayoutProps = {
  children: React.ReactNode;
};

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const { items: cartItems, isLoading, error, removeFromCart, totalItems, totalAmount } = useCart();
  const { isAuthenticated } = useAuth();

  // Open cart will trigger cart fetch through useCart hook
  const handleCartOpen = () => {
    setIsCartOpen(true);
  };
  

  const handleCheckout = () => {
    setIsCheckoutOpen(true);
    setIsCartOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-xl font-semibold text-gray-900">
                <img
      src="https://res.cloudinary.com/drvhoqgno/image/upload/v1742288646/Screenshot_2025-02-27_at_8.55.23_AM_tutopv.png" // Replace with your image URL
     alt="Brand Logo"
    className="w-32 h-28 object-contain"
    />
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={handleCartOpen}
                className="p-2 rounded-full hover:bg-gray-100 relative"
              >
                <ShoppingBag className="w-6 h-6 text-gray-600" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-indigo-600 text-white
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
  <div className="fixed inset-0 z-50 overflow-hidden">
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
            <h2 className="text-2xl font-bold text-gray-800">Your Cart</h2>
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
            ) : cartItems.length === 0 ? (
              <div className="text-center p-10">
                <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Your cart is empty</p>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="mt-4 text-indigo-600 hover:text-indigo-500"
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              <ul className="space-y-6">
                {cartItems.map((item) => (
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
                        <h3 className="text-lg font-medium text-gray-900 hover:text-indigo-600 transition-colors duration-200">
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
              <span className="text-xl font-bold text-indigo-600">
                ₹{totalAmount.toFixed(2)}
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-6 flex items-center">
              <CreditCard className="w-4 h-4 mr-2 text-gray-400" />
              Shipping and taxes calculated at checkout
            </p>
            <button
              onClick={handleCheckout}
              className="w-full inline-flex items-center justify-center px-6 py-4 border border-transparent rounded-lg shadow-lg text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
                  setCartItems([]);
                  navigate('/order-success');
                }} />
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}