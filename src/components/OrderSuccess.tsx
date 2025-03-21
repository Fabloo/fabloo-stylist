import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ShoppingBag } from 'lucide-react';

export function OrderSuccess() {
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto text-center py-16">
      <div className="mb-8">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
      </div>
      
      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        Order Placed Successfully!
      </h1>
      
      <p className="text-lg text-gray-600 mb-8">
        Thank you for your order. We'll send you a confirmation email with your order details.
      </p>

      <div className="space-y-4">
        <button
          onClick={() => navigate('/profile')}
          className="w-full flex justify-center items-center px-6 py-3 border
                   border-transparent rounded-lg shadow-sm text-base font-medium
                   text-white bg-indigo-600 hover:bg-indigo-700"
        >
          View Order Status
        </button>
        
        <button
          onClick={() => navigate('/')}
          className="w-full flex justify-center items-center gap-2 px-6 py-3
                   border-2 border-gray-300 rounded-lg text-base font-medium
                   text-gray-700 hover:bg-gray-50"
        >
          <ShoppingBag className="w-5 h-5" />
          Continue Shopping
        </button>
      </div>
    </div>
  );
}