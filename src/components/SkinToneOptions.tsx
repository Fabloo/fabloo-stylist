import { useNavigate } from 'react-router-dom';
import { Upload } from 'lucide-react';

export function SkinToneOptions() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex flex-col items-center px-4 py-8">
      <div className="max-w-md w-full mx-auto text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          SkinTone Analysis
        </h2>
        <p className="text-lg text-gray-600 mb-6">
          What Colors Suit You Best? Let's Find Out
        </p>
        
        <div className="text-center mb-8">
          <p className="text-xl text-gray-800 mb-6">
            Analyze Your Skin Tone for Get Personalized Style Colors in Seconds
          </p>
          
          {/* Top Color Wheel */}
          <div className="relative w-72 h-72 mx-auto mb-12">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {/* Deep Purple */}
              <path d="M 50,50 L 75,6.7 A 50,50 0 0,1 93.3,25 Z" fill="#5D2D5D" />
              {/* Blue */}
              <path d="M 50,50 L 93.3,25 A 50,50 0 0,1 100,50 Z" fill="#3A57A6" />
              {/* Teal */}
              <path d="M 50,50 L 100,50 A 50,50 0 0,1 93.3,75 Z" fill="#7FBFB6" />
              {/* Burgundy */}
              <path d="M 50,50 L 93.3,75 A 50,50 0 0,1 75,93.3 Z" fill="#83253F" />
              {/* Light Blue */}
              <path d="M 50,50 L 75,93.3 A 50,50 0 0,1 50,100 Z" fill="#9CBBDC" />
              {/* Pink */}
              <path d="M 50,50 L 50,100 A 50,50 0 0,1 25,93.3 Z" fill="#D85C8C" />
              {/* Yellow */}
              <path d="M 50,50 L 25,93.3 A 50,50 0 0,1 6.7,75 Z" fill="#F8E8A2" />
              {/* Light Blue-Green */}
              <path d="M 50,50 L 6.7,75 A 50,50 0 0,1 0,50 Z" fill="#CAECF2" />
              {/* Lavender */}
              <path d="M 50,50 L 0,50 A 50,50 0 0,1 6.7,25 Z" fill="#C4B5D8" />
              {/* Mint Green */}
              <path d="M 50,50 L 6.7,25 A 50,50 0 0,1 25,6.7 Z" fill="#A5D7B9" />
              {/* Light Pink */}
              <path d="M 50,50 L 25,6.7 A 50,50 0 0,1 50,0 Z" fill="#FADCE6" />
              {/* Light Gray */}
              <path d="M 50,50 L 50,0 A 50,50 0 0,1 75,6.7 Z" fill="#D5D8DD" />
            </svg>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-lg">
                <img
                  src="https://res.cloudinary.com/drvhoqgno/image/upload/v1743339615/pixelcut-export__2_-removebg_tlsny4.png"
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
          
          {/* Bottom Color Wheel */}
          <div className="relative w-72 h-72 mx-auto mb-12">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {/* Dark Blue */}
              <path d="M 50,50 L 25,6.7 A 50,50 0 0,1 50,0 Z" fill="#263A80" />
              {/* Light Green */}
              <path d="M 50,50 L 50,0 A 50,50 0 0,1 75,6.7 Z" fill="#B6D7A3" />
              {/* Blue */}
              <path d="M 50,50 L 75,6.7 A 50,50 0 0,1 93.3,25 Z" fill="#7FB2E5" />
              {/* Salmon */}
              <path d="M 50,50 L 93.3,25 A 50,50 0 0,1 100,50 Z" fill="#F0A08F" />
              {/* Yellow */}
              <path d="M 50,50 L 100,50 A 50,50 0 0,1 93.3,75 Z" fill="#F8E08E" />
              {/* Teal */}
              <path d="M 50,50 L 93.3,75 A 50,50 0 0,1 75,93.3 Z" fill="#59A3A7" />
              {/* Red */}
              <path d="M 50,50 L 75,93.3 A 50,50 0 0,1 50,100 Z" fill="#E04A35" />
              {/* Orange */}
              <path d="M 50,50 L 50,100 A 50,50 0 0,1 25,93.3 Z" fill="#E77A34" />
              {/* Light Gray */}
              <path d="M 50,50 L 25,93.3 A 50,50 0 0,1 6.7,75 Z" fill="#D8D8D0" />
              {/* Coral Pink */}
              <path d="M 50,50 L 6.7,75 A 50,50 0 0,1 0,50 Z" fill="#F5B1A4" />
              {/* Light Turquoise */}
              <path d="M 50,50 L 0,50 A 50,50 0 0,1 6.7,25 Z" fill="#8BC9DB" />
            </svg>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-lg">
                <img
                  src="https://res.cloudinary.com/drvhoqgno/image/upload/v1743339615/pixelcut-export__2_-removebg_tlsny4.png"
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>


          <div className='fixed bottom-0 left-0 right-0 bg-white py-4'>
          
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Choose Your Method
          </h3>
          
          {/* Method Buttons */}
          <div className="flex flex-row justify-center items-center gap-4 max-w-sm mx-auto">
            <button
              onClick={() => {
                console.log("Navigating to skin-tone-quiz with fromOptions: true");
                navigate('/skin-tone-quiz', { state: { fromOptions: true } });
              }}
              className="w-1/2 py-3 bg-gradient-to-r from-[#B252FF] to-[#F777F7] text-white text-lg font-medium rounded-[12px] shadow-lg hover:shadow-xl transition-shadow"
            >
              Start Quiz
            </button>
            
            <label className="block">
              <div className="w-full py-3 px-2 flex items-center justify-center gap-2 bg-white border border-[#B252FF] text-[#B252FF] text-lg font-medium rounded-[12px] shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <Upload className="w-5 h-5" />
                <span>Take Selfie</span>
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
      </div>
    </div>
  );
} 