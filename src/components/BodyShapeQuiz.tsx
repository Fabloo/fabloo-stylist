import { useState } from 'react';

// Body shape determination logic
function getBodyShape(q1: string | null, q2: string | null) {
  if (q1 === 'A') {
    if (q2 === 'A' || q2 === 'B') return 'Pear';
    if (q2 === 'C') return 'Apple';
  } else if (q1 === 'B') {
    if (q2 === 'A') return 'Hourglass';
    if (q2 === 'B') return 'Rectangle';
    if (q2 === 'C') return 'Apple';
  } else if (q1 === 'C') {
    if (q2 === 'A') return 'Hourglass';
    if (q2 === 'B' || q2 === 'C') return 'Inverted Triangle';
  }
  return 'Unknown';
}

export default function BodyShapeQuiz() {
  const [q1, setQ1] = useState<string | null>(null);
  const [q2, setQ2] = useState<string | null>(null);
  const [bodyShape, setBodyShape] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(1);

  const handleNext = () => {
    if (currentQuestion === 1 && q1) {
      setCurrentQuestion(2);
    } else if (currentQuestion === 2 && q2) {
      const shape = getBodyShape(q1, q2);
      setBodyShape(shape);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pb-32">
      <h1 className="text-[32px] font-bold text-center mb-4">
        Body Shape Quiz
      </h1>
      
      <h2 className="text-[24px] text-gray-600 text-center mb-16">
        Question {currentQuestion} of 2
      </h2>

      {currentQuestion === 1 ? (
        <>
          <h3 className="text-[24px] font-medium mb-8">
            What best describes your bust to hips ratio?
          </h3>
          
          <div className="space-y-4">
            <button 
              className={`w-full p-4 rounded-xl border transition-all ${
                q1 === 'C' ? 'border-[#FF69B4] bg-[#FFF5F9]' : 'border-[#EAEAEA] hover:border-[#FF69B4]'
              }`}
              onClick={() => setQ1('C')}
            >
              <img 
                src="https://res.cloudinary.com/drvhoqgno/image/upload/v1744267887/Frame_1000003690_fjexso.png" 
                alt="Bust wider than hips"
                className="w-full"
              />
            </button>

            <button 
              className={`w-full p-4 rounded-xl border transition-all ${
                q1 === 'B' ? 'border-[#FF69B4] bg-[#FFF5F9]' : 'border-[#EAEAEA] hover:border-[#FF69B4]'
              }`}
              onClick={() => setQ1('B')}
            >
              <img 
                src="https://res.cloudinary.com/drvhoqgno/image/upload/v1744267887/Frame_1000003690_fjexso.png" 
                alt="Bust equal to hips"
                className="w-full"
              />
            </button>

            <button 
              className={`w-full p-4 rounded-xl border transition-all ${
                q1 === 'A' ? 'border-[#FF69B4] bg-[#FFF5F9]' : 'border-[#EAEAEA] hover:border-[#FF69B4]'
              }`}
              onClick={() => setQ1('A')}
            >
              <img 
                src="https://res.cloudinary.com/drvhoqgno/image/upload/v1744272483/Frame_1000003685_3_rqwboz.png" 
                alt="Bust narrower than hips"
                className="w-full"
              />
            </button>
          </div>
        </>
      ) : (
        <>
          <h3 className="text-[24px] font-medium mb-8">
            What best describes your waist?
          </h3>
          
          <div className="space-y-4">
            <button 
              className={`w-full p-4 rounded-xl border transition-all ${
                q2 === 'A' ? 'border-[#FF69B4] bg-[#FFF5F9]' : 'border-[#EAEAEA] hover:border-[#FF69B4]'
              }`}
              onClick={() => setQ2('A')}
            >
              <img 
                src="https://res.cloudinary.com/drvhoqgno/image/upload/v1744268153/Frame_1000003686_1_y6c5sk.png" 
                alt="Defined waist"
                className="w-full"
              />
            </button>

            <button 
              className={`w-full p-4 rounded-xl border transition-all ${
                q2 === 'B' ? 'border-[#FF69B4] bg-[#FFF5F9]' : 'border-[#EAEAEA] hover:border-[#FF69B4]'
              }`}
              onClick={() => setQ2('B')}
            >
              <img 
                src="https://res.cloudinary.com/drvhoqgno/image/upload/v1744268226/Frame_1000003685_1_djvosn.png" 
                alt="Straight waist"
                className="w-full"
              />
            </button>

            <button 
              className={`w-full p-4 rounded-xl border transition-all ${
                q2 === 'C' ? 'border-[#FF69B4] bg-[#FFF5F9]' : 'border-[#EAEAEA] hover:border-[#FF69B4]'
              }`}
              onClick={() => setQ2('C')}
            >
              <img 
                src="https://res.cloudinary.com/drvhoqgno/image/upload/v1744268226/Frame_1000003685_1_djvosn.png" 
                alt="Fuller waist"
                className="w-full"
              />
            </button>
          </div>
        </>
      )}

      {/* Navigation Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          {currentQuestion === 2 && (
            <button
              onClick={() => setCurrentQuestion(1)}
              className="text-gray-900 font-medium"
            >
              Previous
            </button>
          )}
          <div className="flex gap-1">
            <div className={`w-2 h-2 rounded-full ${currentQuestion === 1 ? 'bg-gray-900' : 'bg-gray-300'}`}></div>
            <div className={`w-2 h-2 rounded-full ${currentQuestion === 2 ? 'bg-gray-900' : 'bg-gray-300'}`}></div>
          </div>
          <button
            onClick={handleNext}
            disabled={currentQuestion === 1 ? !q1 : !q2}
            className="px-6 py-2 bg-black text-white rounded-full font-medium disabled:opacity-50"
          >
            {currentQuestion === 2 ? 'Get Results' : 'Next'}
          </button>
        </div>
      </div>

      {bodyShape && (
        <div className="fixed inset-0 bg-white z-50 p-4">
          <h3 className="text-[32px] font-bold text-center mb-8">
            Your Body Shape is: {bodyShape}
          </h3>
          {/* Add body shape description and recommendations here */}
        </div>
      )}
    </div>
  );
} 