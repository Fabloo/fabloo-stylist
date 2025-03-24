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
          <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          
          <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
            <div className="w-screen max-w-md">
              <div className="h-full flex flex-col bg-white shadow-xl">
                <div className="flex-1 py-6 overflow-y-auto px-4 sm:px-6">
                  <div className="flex items-start justify-between">
                    <h2 className="text-lg font-medium text-gray-900">Shopping Cart</h2>
                    <button
                      onClick={() => setIsCartOpen(false)}
                      className="ml-3 h-7 flex items-center"
                    >
                      <X className="h-6 w-6 text-gray-400 hover:text-gray-500" />
                    </button>
                  </div>

                  <div className="mt-8">
                    {isLoading ? (
                      <p className="text-center text-gray-500">Loading cart...</p>
                    ) : error ? (
                      <p className="text-center text-red-600">{error}</p>
                    ) : cartItems.length === 0 ? (
                      <p className="text-center text-gray-500">Your cart is empty</p>
                    ) : (
                      <div className="flow-root">
                        <ul className="-my-6 divide-y divide-gray-200">
                          {cartItems.map((item) => (
                            <li key={item.id} className="py-6 flex">
                              <div className="flex-shrink-0 w-24 h-24 overflow-hidden rounded-md">
                                <img
                                  src={item.inventory_items.image_url}
                                  alt={item.inventory_items.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>

                              <div className="ml-4 flex-1 flex flex-col">
                                <div>
                                  <div className="flex justify-between text-base font-medium text-gray-900">
                                    <h3>{item.inventory_items.name}</h3>
                                    <p className="ml-4">
                                     ₹{item.inventory_items.price * item.quantity}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex-1 flex items-end justify-between text-sm">
                                  <p className="text-gray-500">Qty {item.quantity}</p>
                                  <button
                                    onClick={() => removeFromCart(item.id)}
                                    className="font-medium text-indigo-600 hover:text-indigo-500"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-gray-200 py-6 px-4 sm:px-6">
                  <div className="flex justify-between text-base font-medium text-gray-900">
                    <p>Subtotal</p>
                    <p>₹{totalAmount.toFixed(2)}</p>
                  </div>
                  <p className="mt-0.5 text-sm text-gray-500">
                    Shipping and taxes calculated at checkout
                  </p>
                  <div className="mt-6">
                    <button
                      onClick={handleCheckout}
                      className="w-full flex justify-center items-center px-6 py-3 border 
                               border-transparent rounded-md shadow-sm text-base font-medium 
                               text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      <CreditCard className="w-5 h-5 mr-2" />
                      Checkout
                    </button>
                  </div>
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