import { useState } from 'react';
import BodyShapeQuiz from './BodyShapeQuiz';

export default function BodyShapePage() {
  const [showQuiz, setShowQuiz] = useState(false);

  if (showQuiz) {
    return <BodyShapeQuiz />;
  }

  return (
    <div className="max-w-2xl mx-auto text-center mt-10 pb-32">
      <h2 className="text-3xl font-bold text-gray-900 mb-4">Body Shape Analysis</h2>
      <p className="text-lg text-gray-600 mb-8">
        Let's start by analyzing your body shape.
      </p>
      
      {/* Example image */}
      <img 
        src="https://res.cloudinary.com/drvhoqgno/image/upload/v1742291530/Frame_1000003512_kf4boz.png"
        alt="Clothing examples"
        className="w-[200px] mx-auto mb-4"
      />

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100">
        <div className="w-[312px] mx-auto space-y-3">
          {/* Info section with icon and text */}
          <div className="flex items-center gap-6 p-6 bg-white border border-[#EAEAEA] rounded-[12px]">
            <img 
              src="https://res.cloudinary.com/drvhoqgno/image/upload/v1743678198/Screenshot_2025-04-03_at_4.24.26_PM_1_nm9cfe.png"
              alt="Info"
              className="w-[64px] h-[64px]"
            />
            <p className="text-[#1A1A1A] text-[16px] leading-[24px] font-normal flex-1">
              Discover your perfect fit! Take our quick body shape quiz now!
            </p>
          </div>

          <button
            onClick={() => setShowQuiz(true)}
            className="w-full py-4 bg-gradient-to-r from-[#B252FF] to-[#F777F7] text-white text-[16px] font-medium leading-5 font-poppins rounded-[8px] shadow-lg hover:shadow-xl transition-shadow"
          >
            Take Quiz
          </button>
        </div>
      </div>
    </div>
  );
} 