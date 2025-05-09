import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShopRecommendations } from '../components/ShopRecommendations';
import { useProfile } from '../hooks/useProfile';
import { Users } from 'lucide-react';
import { useAuthStore } from '../store';

export function ShopPage() {
  const { profile, isLoading } = useProfile();
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!profile?.bodyShape || !profile?.skinTone) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12 px-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Complete Your Analysis</h2>
        <p className="text-lg text-gray-600 mb-8">
          Please complete your body shape and skin tone analysis to view personalized recommendations.
        </p>
        <button
          onClick={() => navigate('/body-shape')}
          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#B252FF] to-[#F777F7] text-white
                   rounded-lg hover:opacity-90 transition-colors duration-200"
        >
          Start Analysis
        </button>
      </div>
    );
  }

  return (
    <div className="pb-8">
      {isAuthenticated && (
        <div className="fixed top-16 right-4 z-40">
          <Link
            to="/friend-circle-results"
            className="flex items-center gap-2 px-4 py-2 bg-white shadow-md rounded-full text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            <Users className="w-4 h-4 text-purple-600" />
            Style Circle
          </Link>
        </div>
      )}
      
      <ShopRecommendations bodyShape={profile.bodyShape!} skinTone={profile.skinTone!} />
    </div>
  );
} 