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
                   text-white bg-gradient-to-r from-[#B252FF] to-[#F777F7] 
                   hover:opacity-90 transition-opacity duration-200"
        >
          View Order Status
        </button>
        
        <button
          onClick={() => navigate('/')}
          className="w-full flex justify-center items-center gap-2 px-6 py-3
                   rounded-lg text-base font-medium relative
                   text-[#B252FF] hover:text-[#F777F7] transition-colors duration-200
                   before:absolute before:inset-0 before:rounded-lg before:p-[1px]
                   before:bg-gradient-to-r before:from-[#B252FF] before:to-[#F777F7]
                   before:content-[''] before:-z-10 bg-white"
        >
          <ShoppingBag className="w-5 h-5" />
          Continue Shopping
        </button>
      </div>
    </div>
  );
}