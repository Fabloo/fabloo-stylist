import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Package, ChevronDown } from 'lucide-react';
import { OrderTracking } from '../components/OrderTracking';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useAuthStore } from '../store';

type Order = {
  id: string;
  created_at: string;
  order_status: string;
  total_amount: number;
  tracking_number?: string;
  shipping_carrier?: string;
};

export function Profile() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, isLoading } = useAuth('/auth');
  const { profile, updateProfile } = useProfile();
  const { logout } = useAuthStore();
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({
    addressLine1: profile?.address_line1 || '',
    addressLine2: profile?.address_line2 || '',
    city: profile?.city || '',
    state: profile?.state || '',
    pincode: profile?.pincode || ''
  });
  console.log("authenticated", isAuthenticated)
  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
    }
    if (profile) {
      setAddressForm({
        addressLine1: profile?.address_line1 || '',
        addressLine2: profile?.address_line2 || '',
        city: profile?.city || '',
        state: profile?.state || '',
        pincode: profile?.pincode || ''
      });
    }
    console.log("addressForm", addressForm)
    console.log("profile", profile)
  }, [isAuthenticated, profile]);

  const fetchOrders = async () => {
    try {
      if (!isAuthenticated) return;
      setOrdersLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          created_at,
          order_status,
          status,
          total_amount,
          tracking_number,
          shipping_carrier
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(10);

        

      if (error) {
        console.error('Error fetching orders:', error);
        throw new Error('Failed to fetch orders');
      }

      console.log("order", data)

      setOrders(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
      console.error('Error fetching orders:', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      // Track Sign out event
      window.gtag('event', 'Sign out', {
        'event_category': 'Profile clicked',
        'event_label': 'Sign out'
      });

      setOrdersLoading(true);
      setError(null);
      await logout();
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log out');
      console.error('Error logging out:', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const resetProfileAnalysis = async () => {
    try {
      // Track Retake event
      window.gtag('event', 'Retake', {
        'event_category': 'Profile clicked',
        'event_label': 'Retake'
      });

      // First check if we have a session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('No active session');
      }

      // Update the profile directly in Supabase
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          body_shape: null,
          skin_tone: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.user.id);

      if (updateError) {
        throw updateError;
      }

      // Update local state through updateProfile
      await updateProfile({ 
        bodyShape: undefined, 
        skinTone: undefined 
      });

      // Navigate to the body shape analysis page
      navigate('/body-shape');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset profile analysis');
      console.error('Error resetting profile analysis:', err);
    }
  };

  const handleOrderClick = (orderId: string) => {
    // Track Order tracking event
    window.gtag('event', 'Order tracking', {
      'event_category': 'Profile clicked',
      'event_label': 'Order tracking'
    });
    
    setSelectedOrder(orderId);
  };

  const handleRecommendationsClick = () => {
    // Track Recommendation event
    window.gtag('event', 'Recommendation', {
      'event_category': 'Profile clicked',
      'event_label': 'Recommendation'
    });
    
    navigate('/recommendations');
  }
  
  
    
  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('No active session');
      }

      // Update the profile in Supabase
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          address_line1: addressForm.addressLine1,
          address_line2: addressForm.addressLine2,
          city: addressForm.city,
          state: addressForm.state,
          pincode: addressForm.pincode,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.user.id);

      if (updateError) {
        throw updateError;
      }

      // Update local state
      await updateProfile({
        address_line1: addressForm.addressLine1,
        address_line2: addressForm.addressLine2,
        city: addressForm.city,
        state: addressForm.state,
        pincode: addressForm.pincode
      });

      setIsEditingAddress(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update address');
      console.error('Error updating address:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="flex items-center justify-center gap-2 animate-pulse">
          <div className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
          <p className="text-lg text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <p className="text-lg text-gray-600 mb-4">Please sign in to view your profile</p>
        <button
          onClick={() => navigate('/auth')}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-black 
                   hover:text-indigo-700"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="space-y-6">
        {/* Profile Section */}
        <div className="bg-white p-8 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Your Profile</h1>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-700
                     transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Style Profile</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Body Shape
                  </label>
                  {profile?.bodyShape ? (
                    <p className="text-lg text-gray-900 capitalize">
                      {profile.bodyShape}
                    </p>
                  ) : (
                    <p className="text-lg text-gray-500">Not set</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Skin Tone
                  </label>
                  {profile?.skinTone ? (
                    <div className="flex items-center gap-3">
                      <div
                        className="w-6 h-6 rounded-full"
                        style={{ backgroundColor: profile.skinTone.hexColor }}
                      />
                      <p className="text-lg text-gray-900">{profile.skinTone.name}</p>
                    </div>
                  ) : (
                    <p className="text-lg text-gray-500">Not set</p>
                  )}
                </div>
              </div>
              <button
                onClick={resetProfileAnalysis}
                className="mt-4 w-full flex justify-center items-center px-6 py-3 border
                         border-transparent rounded-md shadow-sm text-base font-medium
                         text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                Retake Analysis
              </button>
            </div>

            {/* Address Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Shipping Address</h3>
              {isEditingAddress ? (
                <form onSubmit={handleAddressSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address Line 1
                    </label>
                    <input
                      type="text"
                      value={addressForm.addressLine1}
                      onChange={(e) => setAddressForm(prev => ({ ...prev, addressLine1: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address Line 2
                    </label>
                    <input
                      type="text"
                      value={addressForm.addressLine2}
                      onChange={(e) => setAddressForm(prev => ({ ...prev, addressLine2: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City
                      </label>
                      <input
                        type="text"
                        value={addressForm.city}
                        onChange={(e) => setAddressForm(prev => ({ ...prev, city: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        State
                      </label>
                      <input
                        type="text"
                        value={addressForm.state}
                        onChange={(e) => setAddressForm(prev => ({ ...prev, state: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pincode
                    </label>
                    <input
                      type="text"
                      value={addressForm.pincode}
                      onChange={(e) => setAddressForm(prev => ({ ...prev, pincode: e.target.value }))}
                      pattern="[0-9]{6}"
                      maxLength={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div className="flex gap-4">
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-black text-white rounded-md hover:bg-indigo-700 transition-colors"
                    >
                      Save Address
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingAddress(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div>
                  {profile?.address_line1 ? (
                    <div className="space-y-2">
                      <p className="text-gray-900">{profile.address_line1}</p>
                      {profile.address_line2 && (
                        <p className="text-gray-900">{profile.address_line2}</p>
                      )}
                      <p className="text-gray-900">
                        {profile.city}, {profile.state} - {profile.pincode}
                      </p>
                      <button
                        onClick={() => setIsEditingAddress(true)}
                        className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Edit Address
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-gray-500 mb-4">No address saved</p>
                      <button
                        onClick={() => setIsEditingAddress(true)}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Add Address
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Account Settings</h3>
              <button
                onClick={handleRecommendationsClick}
                className="w-full flex justify-center items-center px-6 py-3 border
                         border-transparent rounded-md shadow-sm text-base font-medium
                         text-white bg-gradient-to-r from-[#B252FF] to-[#F777F7] 
                         hover:opacity-90 transition-opacity duration-200"
              >
                View Style Recommendations
              </button>
            </div>
          </div>
        </div>

        {/* Orders Section */}
        {selectedOrder ? (
          <OrderTracking 
            orderId={selectedOrder} 
            onBack={() => setSelectedOrder(null)} 
          />
        ) : (
          <div className="bg-white p-8 rounded-xl shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Your Orders</h2>
            
            {orders.length === 0 ? (
              <p className="text-center text-gray-600 py-8">
                You haven't placed any orders yet
              </p>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => handleOrderClick(order.id)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50
                             hover:bg-gray-100 rounded-lg transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      <Package className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">
                          Order #{order.id.slice(0, 8)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-medium text-gray-900">
                          ₹{order.total_amount}
                        </p>
                        <p className="text-sm text-gray-600 capitalize">
                          {order.order_status}
                        </p>
                      </div>
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}