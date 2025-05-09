import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCheck, ShoppingBag } from 'lucide-react';

export function ReviewSuccess() {
  const navigate = useNavigate();
  const { itemId } = useParams();
  
  return (
    <div className="w-full max-w-md mx-auto min-h-screen flex flex-col bg-white p-4">
      {/* Header */}
      <header className="flex items-center justify-center mb-6">
        <img 
          src="https://res.cloudinary.com/dofgnvgo6/image/upload/v1744363320/Union_1_ugzdfs.svg" 
          alt="Fabloo Logo" 
          className="h-8"
        />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 15, stiffness: 300 }}
          className="p-6 text-center"
        >
          {/* Confetti Decorations */}
          <div className="absolute top-20 right-32">
            <svg width="34" height="30" viewBox="0 0 34 30" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M31.5 0L34 12L23 7.5L31.5 0Z" fill="#61DAFB"/>
              <path d="M15 14L19.5 30L8.5 25.5L15 14Z" fill="#F77777"/>
              <path d="M0 5.5L14.5 6.5L7 17L0 5.5Z" fill="#B252FF"/>
            </svg>
          </div>
          <div className="absolute bottom-40 left-32">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 0L17.5 10.5H28L19.5 17L23 28L14 21.5L5 28L8.5 17L0 10.5H10.5L14 0Z" fill="#55B938"/>
            </svg>
          </div>
          
          <div className="mx-auto flex items-center justify-center w-16 h-16 bg-green-50 rounded-full mb-4">
            <CheckCheck className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Thank You!</h1>
          <p className="text-gray-600 mb-6">
            For the lovely contribution to your friend's style journey! Your feedback will help them make better fashion choices.
          </p>
          
          <div className="bg-purple-50 p-6 rounded-xl w-full max-w-sm mb-8">
            <h4 className="text-lg font-semibold text-gray-800 mb-2">Your Personal Stylist for</h4>
            <h2 className="text-2xl font-bold text-purple-800 mb-4">Smart Shopping</h2>
            
            <p className="text-sm text-gray-600 mb-4">
              Let our AI be your stylist bestie to find your perfect outfit!
            </p>
            
            <button
              onClick={() => navigate('/auth')}
              className="w-full py-3 bg-gradient-to-r from-[#B252FF] to-[#F777F7] text-white font-medium rounded-lg"
            >
              Sign In Now
            </button>
            
            <p className="text-xs text-gray-500 mt-2 text-center">
              *ONLY FOR FEMALES*
            </p>
          </div>
          
          {/* <button
            onClick={() => navigate('/shop')}
            className="w-full py-3 border border-[#B252FF] text-[#B252FF] font-medium rounded-lg flex items-center justify-center gap-2"
          >
            <ShoppingBag className="w-4 h-4" />
            Continue Shopping
          </button> */}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="mt-8 text-center text-xs text-gray-500">
        <p>Receive from your stylist and get AI-personalized experiences in future</p>
      </footer>
    </div>
  );
} 