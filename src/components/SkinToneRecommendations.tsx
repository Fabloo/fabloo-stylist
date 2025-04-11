import { useLocation, useNavigate } from 'react-router-dom';
import type { SkinTone } from '../types';

export default function SkinToneRecommendations() {
  const location = useLocation();
  const navigate = useNavigate();
  const skinTone = location.state?.skinTone as SkinTone;

  if (!skinTone) {
    return navigate('/skin-tone');
  }

  const getRecommendations = (tone: SkinTone) => {
    const recommendations = {
      'fair-cool': {
        colors: ['Navy', 'Purple', 'Pink', 'Blue'],
        avoid: ['Orange', 'Bright Yellow', 'Gold']
      },
      'fair-warm': {
        colors: ['Peach', 'Golden Yellow', 'Coral', 'Ivory'],
        avoid: ['Black', 'Navy', 'Gray']
      },
      // Add more recommendations for other skin tones
    };

    return recommendations[tone.id] || { colors: [], avoid: [] };
  };

  const recommendations = getRecommendations(skinTone);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-[32px] font-bold text-center mb-8">
        Your Color Recommendations
      </h1>

      {/* Skin Tone Result */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
        <div className="flex items-center gap-4 mb-6">
          <div 
            className="w-16 h-16 rounded-full"
            style={{ backgroundColor: skinTone.hexColor }}
          />
          <div>
            <h2 className="text-xl font-medium">{skinTone.name}</h2>
            <p className="text-gray-600">Your identified skin tone</p>
          </div>
        </div>
      </div>

      {/* Color Recommendations */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
        <h2 className="text-[24px] font-medium mb-6">Colors That Flatter You</h2>
        <div className="grid grid-cols-2 gap-4">
          {recommendations.colors.map((color, index) => (
            <div 
              key={index}
              className="p-4 rounded-lg bg-gray-50 text-center"
            >
              {color}
            </div>
          ))}
        </div>
      </div>

      {/* Colors to Avoid */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
        <h2 className="text-[24px] font-medium mb-6">Colors to Use Sparingly</h2>
        <div className="grid grid-cols-2 gap-4">
          {recommendations.avoid.map((color, index) => (
            <div 
              key={index}
              className="p-4 rounded-lg bg-gray-50 text-center text-gray-600"
            >
              {color}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
        <div className="w-[312px] mx-auto space-y-3">
          <button
            onClick={() => navigate('/skin-tone')}
            className="w-full py-4 bg-gradient-to-r from-[#B252FF] to-[#F777F7] text-white text-[16px] font-medium leading-5 font-poppins rounded-[8px] shadow-lg hover:shadow-xl transition-shadow"
          >
            Try Again
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full py-4 border border-gray-200 text-gray-900 text-[16px] font-medium leading-5 font-poppins rounded-[8px] hover:bg-gray-50 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
} 