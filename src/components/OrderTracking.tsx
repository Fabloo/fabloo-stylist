import React, { useState, useEffect } from 'react';
import { Package, ArrowLeft, TruckIcon, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Order = {
  id: string;
  created_at: string;
  order_status: string;
  total_amount: number;
  tracking_number?: string;
  shipping_carrier?: string;
  shipping_address: {
    fullName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
  };
  order_items: {
    id: string;
    quantity: number;
    price: number;
    size_selected: string;
    inventory_items: {
      id: string;
      name: string;
      price: number;
      description: string;
      image_url: string;
      sizes: string[];
      body_shapes: string[];
      color_tones: string[];
      dress_type: string[];
      stock: number;
    };
  }[];
};

type Props = {
  orderId: string;
  onBack: () => void;
};

const STATUS_STEPS = {
  'pending': 0,
  'processing': 1,
  'shipped': 2,
  'delivered': 3,
  'cancelled': -1
};

export function OrderTracking({ orderId, onBack }: Props) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [submittingReturn, setSubmittingReturn] = useState(false);

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            inventory_items (
              name,
              description,
              image_url,
              sizes
            )
          )
        `)
        .eq('id', orderId)
        .single();

        console.log("orderData", orderData)

      if (orderError) throw orderError;
      if (!orderData) throw new Error('Order not found');

      setOrder(orderData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order');
      console.error('Error fetching order:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSubmittingReturn(true);
      setError(null);

      if (!returnReason.trim()) {
        throw new Error('Please provide a reason for return');
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Please sign in to continue');

      const { error: returnError } = await supabase
        .from('returns')
        .insert([{
          order_id: orderId,
          user_id: user.id,
          reason: returnReason.trim()
        }]);

      if (returnError) throw returnError;

      setShowReturnForm(false);
      setReturnReason('');
      await fetchOrder(); // Refresh order data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit return request');
    } finally {
      setSubmittingReturn(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error || 'Order not found'}</p>
        <button
          onClick={onBack}
          className="text-indigo-600 hover:text-indigo-700"
        >
          Go back
        </button>
      </div>
    );
  }

  const currentStep = STATUS_STEPS[order.order_status as keyof typeof STATUS_STEPS];

  return (
    <div className="bg-white p-6 rounded-xl">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5 mr-1" />
          Back to Orders
        </button>
        <div className="text-right">
          <p className="text-sm text-gray-600">Order ID</p>
          <p className="font-medium">{order.id}</p>
        </div>
      </div>

      {/* Order Status */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Status</h3>
        <div className="relative">
          {/* Progress Bar */}
          <div className="h-1 bg-gray-200 absolute top-5 left-0 right-0">
            <div 
              className="h-full bg-indigo-600 transition-all duration-500"
              style={{ 
                width: order.order_status === 'cancelled' 
                  ? '0%'
                  : `${(currentStep / 3) * 100}%` 
              }}
            />
          </div>

          {/* Status Steps */}
          <div className="relative flex justify-between">
            {['pending', 'processing', 'shipped', 'delivered'].map((status, index) => {
              const isActive = index <= currentStep && order.order_status !== 'cancelled';
              const isCurrent = index === currentStep && order.order_status !== 'cancelled';

              return (
                <div 
                  key={status}
                  className={`flex flex-col items-center ${
                    isActive ? 'text-indigo-600' : 'text-gray-400'
                  }`}
                >
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center
                             ${isCurrent ? 'ring-2 ring-indigo-600 ring-offset-2' : ''}
                             ${isActive ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}
                  >
                    {index === 0 && <Package className="w-5 h-5" />}
                    {index === 1 && <TruckIcon className="w-5 h-5" />}
                    {index === 2 && <TruckIcon className="w-5 h-5" />}
                    {index === 3 && <CheckCircle className="w-5 h-5" />}
                  </div>
                  <span className="mt-2 text-sm capitalize">{status}</span>
                </div>
              );
            })}
          </div>
        </div>

        {order.order_status === 'cancelled' && (
          <div className="mt-6 p-4 bg-red-50 rounded-lg flex items-center gap-2 text-red-700">
            <XCircle className="w-5 h-5" />
            This order has been cancelled
          </div>
        )}

        {order.order_status === 'shipped' && order.tracking_number && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Tracking Number</p>
            <p className="font-medium">{order.tracking_number}</p>
            {order.shipping_carrier && (
              <p className="text-sm text-gray-600 mt-2">{order.shipping_carrier}</p>
            )}
          </div>
        )}
      </div>

      {/* Order Items */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h3>
        <div className="space-y-4">
          {order.order_items.map((item) => (
            <div key={item.id} className="flex items-center gap-4">
              <img
                src={item.inventory_items.image_url}
                alt={item.inventory_items.name}
                className="w-16 h-16 object-cover rounded-lg"
              />
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">
                  {item.inventory_items.name}
                </h4>
                <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                <p className="text-sm text-gray-600">Size: {item.size_selected}</p>
              </div>
              <p className="font-medium text-gray-900">
                ₹{(item.price * item.quantity).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Shipping Address */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Shipping Address</h3>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="font-medium text-gray-900">{order.shipping_address.fullName}</p>
          <p className="text-gray-600">{order.shipping_address.addressLine1}</p>
          {order.shipping_address.addressLine2 && (
            <p className="text-gray-600">{order.shipping_address.addressLine2}</p>
          )}
          <p className="text-gray-600">
            {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.pincode}
          </p>
        </div>
      </div>

      {/* Return Request */}
      {order.order_status === 'delivered' && !showReturnForm && (
        <button
          onClick={() => setShowReturnForm(true)}
          className="w-full py-3 border-2 border-gray-200 rounded-lg text-gray-700
                   hover:border-gray-300 transition-colors"
        >
          Request Return
        </button>
      )}

      {showReturnForm && (
        <form onSubmit={handleReturnSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Return
            </label>
            <textarea
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg
                       focus:ring-2 focus:ring-indigo-500 h-32"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={submittingReturn}
              className="flex-1 py-3 bg-indigo-600 text-white rounded-lg
                       hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {submittingReturn ? 'Submitting...' : 'Submit Return Request'}
            </button>
            <button
              type="button"
              onClick={() => setShowReturnForm(false)}
              className="flex-1 py-3 border-2 border-gray-200 rounded-lg text-gray-700
                       hover:border-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}