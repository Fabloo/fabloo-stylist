import { useNavigate } from 'react-router-dom';
import { Upload } from 'lucide-react';

export function SkinToneOptions() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between">
      <div className="max-w-2xl mx-auto text-center px-4 pt-6 pb-4 flex-1">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          Skin Tone Analysis
        </h2>
        <p className="text-base text-gray-600 mb-4">
        Choose your method: Take the quiz or upload a selfie.
        </p>

        {/* Quiz section */}
        <div className="w-full max-w-[312px] mx-auto mb-4">
          {/* Info section */}
          <div className="flex items-center gap-4 p-4 bg-white border border-[#EAEAEA] rounded-[12px] mb-4 shadow-sm">
            <img 
              src="https://res.cloudinary.com/drvhoqgno/image/upload/v1743678198/Screenshot_2025-04-03_at_4.24.26_PM_1_nm9cfe.png"
              alt="Info"
              className="w-[56px] h-[56px]"
            />
            <p className="text-[#1A1A1A] text-base leading-[22px] font-normal flex-1">
              Take our quick quiz to discover your skin tone!
            </p>
          </div>

          <button
            onClick={() => {
              console.log("Navigating to skin-tone-quiz with fromOptions: true");
              navigate('/skin-tone-quiz', { state: { fromOptions: true } });
            }}
            className="w-full py-4 bg-gradient-to-r from-[#B252FF] to-[#F777F7] text-white text-lg font-medium leading-5 font-poppins rounded-[8px] shadow-lg hover:shadow-xl transition-shadow"
          >
            Take Quiz
          </button>
        </div>

        {/* Example image */}
        <div className="mb-6">
          <p className="text-base text-gray-900 mb-4">Instructions for better skintone detection</p>
          <img
            src="https://res.cloudinary.com/dofgnvgo6/image/upload/v1744360394/Screenshot_2025-04-11_at_2.02.42_PM_tjg7q5.png"
            alt="Skin Tone Analysis"
            className="w-[180px] mx-auto"
          />
          <div className="text-gray-800 text-sm font-medium mt-2">
            <ul className="space-y-1 text-left max-w-[312px] mx-auto">
              <li>1. Take your photo in natural daylight</li>
              <li>2. Avoid harsh shadows or direct sunlight</li>
              <li>3. Make sure your face is fully visible</li>
              <li>4. Don't wear sunglasses, hats, or heavy makeup</li>
            </ul>
          </div>
        </div>

        {/* Upload Photo button */}
        <div className="w-full max-w-[312px] mx-auto">
          <label className="block">
            <div className="w-full py-4 bg-gradient-to-r from-[#B252FF] to-[#F777F7] text-white text-lg font-medium leading-5 font-poppins rounded-[8px] shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center gap-2 cursor-pointer">
              <Upload className="w-6 h-6" />
              <span>Upload Selfie</span>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  console.log("Uploading file, navigating to detector with file in state");
                  navigate('/skin-tone-detector', { 
                    state: { file: e.target.files[0], fromOptions: true }
                  });
                }
              }}
              className="hidden"
              capture="user"
            />
          </label>
        </div>
      </div>
    </div>
  );
} 