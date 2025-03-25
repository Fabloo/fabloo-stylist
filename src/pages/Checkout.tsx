import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { CreditCard, Truck, MapPin, Phone, Mail, User, HashIcon as CashIcon } from 'lucide-react';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

type CartItem = {
  id: string;
  quantity: number;
  size_selected: string;
  inventory_items: {
    id: string;
    name: string;
    price: number;
    description: string;
    image_url: string;
    sizes: string[];
  };
};

type ShippingAddress = {
  fullName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
};

type CheckoutStep = 'address' | 'payment' | 'review';

type Props = {
  onSuccess?: () => void;
};

const PAYMENT_METHODS = [
  // {
  //   id: 'upi',
  //   name: 'UPI',
  //   icon: CreditCard,
  //   description: 'Pay using UPI apps like Google Pay, PhonePe, or Paytm'
  // },
  // {
  //   id: 'card',
  //   name: 'Credit/Debit Card',
  //   icon: CreditCard,
  //   description: 'Secure payment with credit or debit card'
  // },
  // {
  //   id: 'netbanking',
  //   name: 'Net Banking',
  //   icon: CreditCard,
  //   description: 'Pay directly from your bank account'
  // },
  {
    id: 'cod',
    name: 'Cash on Delivery',
    icon: CashIcon,
    description: 'Pay when you receive your order'
  }
];

const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
];

export function Checkout({ onSuccess }: Props) {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [fetchingCart, setFetchingCart] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<{
    payment?: string;
    address?: string;
  }>({});
  const [address, setAddress] = useState<ShippingAddress>({
    fullName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: ''
  });
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('address');

  useEffect(() => {
    fetchCartItems();
  }, []);

  const fetchCartItems = async () => {
    try {
      setFetchingCart(true);
      setError(null);

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Please sign in to continue');
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        throw userError;
      }
      if (!user) {
        throw new Error('Please sign in to continue');
      }

      const { data, error } = await supabase
      .from('cart_items')
      .select(`
        id,
        quantity,
        size_selected,
        inventory_items!inner (
          id,
          name,
          description,
          price,
          image_url,
          stock
        )
      `)
      .eq('user_id', user.id);

      // const { data, error } = await supabase
      //   .from('cart_items')
      //   .select(`
      //     id,
      //     quantity,
      //     size_selected,
      //     inventory_items (
      //       id,
      //       name,
      //       price,
      //       description,
      //       image_url,
      //       sizes,
      //     )
      //   `)
      //   .eq('user_id', user.id);

      if (error) {
        throw new Error(`Failed to fetch cart items: ${error.message}`);
      }

      setCartItems(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'An unexpected error occurred while fetching your cart';
      setError(errorMessage);
      console.error('Error fetching cart:', err);
    } finally {
      setFetchingCart(false);
    }
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setAddress(prev => ({ ...prev, [name]: value }));
  };

  const validateAddress = () => {
    const required = ['fullName', 'addressLine1', 'city', 'state', 'pincode', 'phone', 'email'];
    const missing = required.filter(field => !address[field as keyof ShippingAddress]);
    
    if (missing.length > 0) {
      throw new Error(`Please fill in all required fields: ${missing.join(', ')}`);
    }

    if (!/^\d{6}$/.test(address.pincode)) {
      throw new Error('Please enter a valid 6-digit pincode');
    }

    if (!/^\d{10}$/.test(address.phone)) {
      throw new Error('Please enter a valid 10-digit phone number');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.email)) {
      throw new Error('Please enter a valid email address');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset errors
    setError(null);
    setValidationErrors({});

    try {
      setLoading(true);

      // Check for empty cart first
      if (!cartItems || cartItems.length === 0) {
        navigate('/cart'); // Redirect to cart page
        return;
      }

      // Validate payment method
      if (!paymentMethod) {
        setValidationErrors(prev => ({ ...prev, payment: 'Please select a payment method' }));
        return;
      }

      try {
        validateAddress();
      } catch (err) {
        setValidationErrors(prev => ({ 
          ...prev, 
          address: err instanceof Error ? err.message : 'Invalid address'
        }));
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('Please sign in to continue');
      }

      // Calculate total amount
      const totalAmount = cartItems.reduce(
        (sum, item) => sum + (item.inventory_items.price * item.quantity),
        0
      );

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
          user_id: session.user.id,
          status: 'pending',
          order_status: 'pending',
          total_amount: totalAmount,
          payment_method: paymentMethod,
          shipping_address: address,
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items with size information
      const orderItems = cartItems.map(item => ({
        order_id: order.id,
        item_id: item.inventory_items.id,
        quantity: item.quantity,
        price: item.inventory_items.price,
        size_selected: item.size_selected
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Update order status to processing after items are added
      const { error: statusError } = await supabase
        .from('orders')
        .update({ 
          status: 'pending',
          order_status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (statusError) throw statusError;

      // Clear cart
      const { error: clearCartError } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', session.user.id)
        .in('id', cartItems.map(item => item.id));

      if (clearCartError) throw clearCartError;

      // Refresh cart items after successful order
      await fetchCartItems();
      // Redirect to success page
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place order');
      console.error('Checkout error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Add empty cart redirect
  useEffect(() => {
    if (!fetchingCart && (!cartItems || cartItems.length === 0)) {
      navigate('/cart');
    }
  }, [cartItems, fetchingCart, navigate]);

  const CheckoutProgress = () => (
    <div className="mb-8">
      <div className="flex justify-between items-center">
        {['address', 'payment', 'review'].map((step, idx) => (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center
                ${currentStep === step 
                  ? 'bg-black text-white'
                  : 'bg-gray-200 text-gray-600'}`}>
                {idx + 1}
              </div>
              <span className="mt-2 text-sm font-medium capitalize">{step}</span>
            </div>
            {idx < 2 && (
              <div className="flex-1 h-0.5 bg-gray-200 mx-4" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  const nextStep = () => {
    if (currentStep === 'address') {
      try {
        validateAddress();
        setCurrentStep('payment');
      } catch (err) {
        setValidationErrors(prev => ({ 
          ...prev, 
          address: err instanceof Error ? err.message : 'Invalid address'
        }));
      }
    } else if (currentStep === 'payment') {
      if (!paymentMethod) {
        setValidationErrors(prev => ({ ...prev, payment: 'Please select a payment method' }));
        return;
      }
      setCurrentStep('review');
    }
  };

  const previousStep = () => {
    if (currentStep === 'payment') {
      setCurrentStep('address');
    } else if (currentStep === 'review') {
      setCurrentStep('payment');
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'address':
        return (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Truck className="w-5 h-5 text-black" />
              Shipping Address
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  <User className="w-4 h-4 text-black" />
                  Full Name
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={address.fullName}
                  onChange={handleAddressChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm 
                            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 
                            transition-colors duration-200"
                  required
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  <Phone className="w-4 h-4 text-black" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={address.phone}
                  onChange={handleAddressChange}
                  pattern="\d{10}"
                  maxLength={10}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm 
                            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 
                            transition-colors duration-200"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  <Mail className="w-4 h-4 text-black" />
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={address.email}
                  onChange={handleAddressChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm 
                            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 
                            transition-colors duration-200"
                  required
                />
              </div>

              {/* PIN Code */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1">PIN Code</label>
                <input
                  type="text"
                  name="pincode"
                  value={address.pincode}
                  onChange={handleAddressChange}
                  pattern="\d{6}"
                  maxLength={6}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm 
                            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 
                            transition-colors duration-200"
                  required
                />
              </div>

              {/* Address Line 1 */}
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  <MapPin className="w-4 h-4 text-black" />
                  Address Line 1
                </label>
                <input
                  type="text"
                  name="addressLine1"
                  value={address.addressLine1}
                  onChange={handleAddressChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm 
                            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 
                            transition-colors duration-200"
                  required
                />
              </div>

              {/* Address Line 2 */}
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700 mb-1">
                  Address Line 2 (Optional)
                </label>
                <input
                  type="text"
                  name="addressLine2"
                  value={address.addressLine2}
                  onChange={handleAddressChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm 
                            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 
                            transition-colors duration-200"
                />
              </div>

              {/* City */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  name="city"
                  value={address.city}
                  onChange={handleAddressChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm 
                            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 
                            transition-colors duration-200"
                  required
                />
              </div>

              {/* State */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1">State</label>
                <select
                  name="state"
                  value={address.state}
                  onChange={handleAddressChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm 
                            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 
                            transition-colors duration-200"
                  required
                >
                  <option value="">Select State</option>
                  {STATES.map(state => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={nextStep}
                className="px-6 py-2.5 bg-black text-white rounded-lg hover:bg-indigo-700"
              >
                Continue to Payment
              </button>
            </div>
          </div>
        );

      case 'payment':
        return (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment Method
            </h2>

            <div className="space-y-4">
              {PAYMENT_METHODS.map((method) => (
                <label
                  key={method.id}
                  className={`flex items-start gap-4 p-6 border-2 rounded-xl cursor-pointer 
                               transition-all duration-200 hover:shadow-md
                               ${paymentMethod === method.id
                                 ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                                 : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.id}
                    checked={paymentMethod === method.id}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mt-1 h-4 w-4 text-black focus:ring-indigo-500"
                  />
                  <div>
                    <div className="flex items-center gap-2 font-medium text-gray-900">
                      <method.icon className="w-5 h-5" />
                      {method.name}
                    </div>
                    <p className="text-sm text-gray-600">{method.description}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="mt-6 flex justify-between">
              <button
                type="button"
                onClick={previousStep}
                className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={nextStep}
                className="px-6 py-2.5 bg-black text-white rounded-lg hover:bg-indigo-700"
              >
                Continue to Review
              </button>
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Order Review</h2>
            
            {fetchingCart ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
              </div>
            ) : cartItems.length === 0 ? (
              <p className="text-center text-gray-500">Your cart is empty</p>
            ) : (
              <div className="">
                <div className="flex flex-col gap-4 h-44 overflow-y-auto">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-4 rounded-lg 
                                              hover:bg-gray-50 transition-colors duration-200">
                    <img
                      src={item.inventory_items.image_url}
                      alt={item.inventory_items.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {item.inventory_items.name}
                      </h4>
                      <p className="text-sm text-gray-600">
                        Size: {item.size_selected} • Qty: {item.quantity}
                      </p>
                    </div>
                    <p className="font-medium text-gray-900">
                      ₹{(item.inventory_items.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
                </div>
                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Subtotal</span>
                    <span>₹{cartItems.reduce((sum, item) => 
                      sum + (Number(item.inventory_items.price) * item.quantity), 0
                    ).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Shipping</span>
                    <span>Free</span>
                  </div>
                  <div className="flex justify-between font-medium text-gray-900 text-lg">
                    <span>Total</span>
                    <span>₹{cartItems.reduce((sum, item) => 
                      sum + (Number(item.inventory_items.price) * item.quantity), 0
                    ).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
            
            {validationErrors.address && (
              <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm mb-4">
                {validationErrors.address}
              </div>
            )}

            <div className="mt-6 flex justify-between">
              <button
                type="button"
                onClick={previousStep}
                className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || cartItems.length === 0}
                className="px-6 py-2.5 bg-black text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Place Order'}
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
        Complete Your Order
      </h1>

      <CheckoutProgress />

      <form onSubmit={handleSubmit}>
        {renderStepContent()}
        
        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}
      </form>
    </div>
  );
}