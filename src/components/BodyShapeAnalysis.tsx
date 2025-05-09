import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload } from 'lucide-react';
import { useProfile } from '../hooks/useProfile';
import type { BodyShape } from '../types';
import { analyzeBodyShape } from '../utils/bodyShapeAnalysis';

const QUIZ_QUESTIONS = [
  {
    id: 'proportions',
    question: 'Which of these three images most resembles your bust to hip ratio?',
    options: [
      { 
        id: 'bust-narrow', 
        text: 'Bust narrower than hips',
        image: 'https://res.cloudinary.com/drvhoqgno/image/upload/v1744267839/Frame_1000003685_lys4qt.png',
        points: { 'pear': 2, 'rectangle': 1 }
      },
      { 
        id: 'balanced', 
        text: 'Bust about the same as hips',
        image: 'https://res.cloudinary.com/drvhoqgno/image/upload/v1744267887/Frame_1000003690_fjexso.png',
        points: { 'hourglass': 2, 'rectangle': 1 }
      },
      { 
        id: 'bust-wide', 
        text: 'Bust wider than hips',
        image: 'https://res.cloudinary.com/dofgnvgo6/image/upload/v1744371508/Frame_1000003692_mrjmcj.png',
        points: { 'apple': 2, 'inverted-triangle': 1 }
      }
    ]
  },
  {
    id: 'waist',
    question: 'Which of these three images most resembles your waist?',
    options: [
      { 
        id: 'defined', 
        text: 'Waist significantly smaller',
        image: 'https://res.cloudinary.com/drvhoqgno/image/upload/v1744268153/Frame_1000003686_1_y6c5sk.png',
        points: { 'hourglass': 2 }
      },
      { 
        id: 'somewhat', 
        text: 'Waist similar to bust/hips',
        image: 'https://res.cloudinary.com/drvhoqgno/image/upload/v1744268226/Frame_1000003685_1_djvosn.png',
        points: { 'rectangle': 2 }
      },
      { 
        id: 'straight', 
        text: 'Waist larger',
        image: 'https://res.cloudinary.com/drvhoqgno/image/upload/v1744268226/Frame_1000003685_1_djvosn.png',
        points: { 'apple': 2 }
      }
    ]
  }
];

type Props = {
  currentShape?: BodyShape;
  onComplete: (bodyShape: BodyShape) => void;
};

type QuizAnswer = {
  questionId: string;
  optionId: string;
};

declare global {
  interface Window {
    gtag: (command: string, event: string, params: any) => void;
  }
}

// Body shape images
const BODY_SHAPE_IMAGES = {
  rectangle: "https://res.cloudinary.com/drvhoqgno/image/upload/v1744268226/rectangle_body_type.png",
  hourglass: "https://res.cloudinary.com/drvhoqgno/image/upload/v1744268226/hourglass_body_type.png",
  apple: "https://res.cloudinary.com/drvhoqgno/image/upload/v1744268226/apple_body_type.png",
  pear: "https://res.cloudinary.com/drvhoqgno/image/upload/v1744268226/pear_body_type.png",
  "inverted-triangle": "https://res.cloudinary.com/drvhoqgno/image/upload/v1744268226/inverted_triangle_body_type.png"
};

export function BodyShapeAnalysis({ currentShape, onComplete }: Props) {
  const navigate = useNavigate();
  const { profile, updateProfile } = useProfile();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<'upload' | 'quiz' | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);

  // If we already have a shape from profile, use that
  useEffect(() => {
    if (profile?.bodyShape) {
      onComplete(profile.bodyShape);
    }
  }, [profile, onComplete]);

  const determineBodyShape = (quizAnswers: QuizAnswer[]) => {
    const proportions = quizAnswers.find(a => a.questionId === 'proportions')?.optionId;
    const waist = quizAnswers.find(a => a.questionId === 'waist')?.optionId;
    
    if (!proportions || !waist) return 'hourglass'; // Default fallback

    // New logic based on the provided rules
    if (proportions === 'bust-narrow') {
      if (waist === 'defined') return 'pear';
      if (waist === 'somewhat') return 'rectangle';
      return 'apple';
    }
    
    if (proportions === 'balanced') {
      if (waist === 'defined') return 'hourglass';
      if (waist === 'somewhat') return 'rectangle';
      return 'apple';
    }
    
    if (proportions === 'bust-wide') {
      if (waist === 'defined') return 'apple';
      if (waist === 'somewhat') return 'rectangle';
      return 'apple';
    }

    return 'hourglass'; // Default fallback
  };

  const handleQuizAnswer = (optionId: string) => {
    // Track quiz question events with bodyshape-specific category
    window.gtag('event', `Q${currentQuestion + 1}`, {
      'event_category': 'Bodyshape Quiz',
      'event_label': `Q${currentQuestion + 1}`
    });

    const newAnswers = [...answers, { 
      questionId: QUIZ_QUESTIONS[currentQuestion].id, 
      optionId 
    }];
    setAnswers(newAnswers);

    if (currentQuestion < QUIZ_QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setIsAnalyzing(true);
      const bodyShape = determineBodyShape(newAnswers);
      console.log("Body shape determined:", bodyShape);
      updateProfile({
        bodyShape
      });
      setTimeout(() => {
        console.log("Calling onComplete with bodyShape:", bodyShape);
        onComplete(bodyShape);
        setIsAnalyzing(false);
      }, 1500);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    // Track Upload Photo event with bodyshape-specific category
    window.gtag('event', 'Upload Photo', {
      'event_category': 'Bodyshape Quiz',
      'event_label': 'Upload Photo'
    });

    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image size should be less than 10MB');
      return;
    }
    
    try {
      setIsAnalyzing(true);
      
      // Process the image and get body shape
      const result = await analyzeBodyShape(file);
      if (!result) {
        throw new Error('Analysis failed to produce a result');
      }
      onComplete(result);
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Analysis failed. Please try again with a different photo.';
      setError(errorMessage);
      console.error('Analysis error:', err);
      setMethod(null); // Reset method selection on error
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleQuizStart = () => {
    // Track Quiz event with bodyshape-specific category
    window.gtag('event', 'Quiz', {
      'event_category': 'Bodyshape Quiz',
      'event_label': 'Quiz'
    });
    setMethod('quiz');
  };

  if (isAnalyzing) {
    return (
      <div className="max-w-2xl mx-auto text-center mt-10">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Analyzing...</h2>
        <p className="text-lg text-gray-600">Please wait while we process your information.</p>
      </div>
    );
  }

  if (!method) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        {/* Header */}
        <div className="px-4 pt-6 pb-4 text-center">
          <h2 className="text-xl font-bold text-black mb-1">Body Shape Analysis</h2>
          <p className="text-sm text-gray-700">
            Find styles that flatter your unique shape.
          </p>
          <div className="h-px bg-gray-200 w-full mt-5"></div>
        </div>

        {/* Main content */}
        <div className="px-4 pt-5 flex-1">
          <h3 className="text-lg font-semibold text-black text-center mb-6">
            Discover Your Perfect Fit!
          </h3>

          {/* Body Shape Grid */}
          <div className="grid grid-cols-2 gap-4 mb-20">
            {/* Rectangle */}
            <div className="flex flex-col items-center">
              <div className="h-36 w-24 bg-[#FFF3EC] rounded-md mb-2 flex items-center justify-center">
                <img 
                  src="https://res.cloudinary.com/dmafmaoif/image/upload/v1746693095/Screenshot_2025-04-30_at_1.32.54_PM_2_zpvjqx.png" 
                  alt="Rectangle body shape"
                  className="h-32"
                />
              </div>
              <span className="text-black text-sm">Rectangle</span>
            </div>

            {/* Hourglass */}
            <div className="flex flex-col items-center">
              <div className="h-36 w-24 bg-[#FFFBE5] rounded-md mb-2 flex items-center justify-center">
                <img 
                  src="https://res.cloudinary.com/dmafmaoif/image/upload/v1746693095/Frame_2147228348_vpp2yk.png" 
                  alt="Hourglass body shape"
                  className="h-32"
                />
              </div>
              <span className="text-black text-sm">Hourglass</span>
            </div>

            {/* Apple */}
            <div className="flex flex-col items-center">
              <div className="h-36 w-24 bg-[#F4FFF0] rounded-md mb-2 flex items-center justify-center">
                <img 
                  src="https://res.cloudinary.com/dmafmaoif/image/upload/v1746693095/Frame_2147228348-1_ehkebk.png" 
                  alt="Apple body shape"
                  className="h-32"
                />
              </div>
              <span className="text-black text-sm">Apple</span>
            </div>

            {/* Pear */}
            <div className="flex flex-col items-center">
              <div className="h-36 w-24 bg-[#E5F9FF] rounded-md mb-2 flex items-center justify-center">
                <img 
                  src="https://res.cloudinary.com/dmafmaoif/image/upload/v1746693095/Frame_2147228348-2_qaz57s.png" 
                  alt="Pear body shape"
                  className="h-32"
                />
              </div>
              <span className="text-black text-sm">Pear</span>
            </div>

            {/* Inverted Triangle */}
            <div className="flex flex-col items-center col-span-2 mx-auto">
              <div className="h-36 w-24 bg-[#FAECFF] rounded-md mb-2 flex items-center justify-center">
                  <img 
                    src="https://res.cloudinary.com/dmafmaoif/image/upload/v1746693095/Frame_2147228348-3_ti8mje.png" 
                  alt="Inverted Triangle body shape"
                  className="h-32"
                />
              </div>
              <span className="text-black text-sm">Inverted Triangle</span>
            </div>
          </div>

        

         <div className='fixed bottom-0 left-0 right-0 bg-white'>

          {/* Choose Method */}
          <h3 className="text-lg font-semibold text-black text-center mb-3">
            Choose Your Method
          </h3>

          {/* Method selection buttons */}
          <div className="flex flex-row gap-4 max-w-xs pb-4 mx-auto">
            <button
              onClick={handleQuizStart}
              className="w-full py-3 bg-[#D259FF] text-white text-base font-semibold rounded-lg"
            >
              Start Quiz
            </button>

            <label className="w-full py-3 bg-white border border-[#D259FF] text-[#D259FF] text-base font-semibold rounded-lg flex items-center justify-center gap-2 cursor-pointer">
              <Upload className="w-5 h-5" />
              <span>Upload Photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg mt-4 text-base max-w-xs mx-auto">
              {error}
            </div>
          )}
        </div>
        </div>
      </div>
    );
  }

  if (method === 'quiz') {
    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="flex items-center px-4 py-3 border-b border-gray-200">
          <button 
            onClick={() => setMethod(null)}
            className="flex items-center text-gray-600 text-base"
          >
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        </div>

        {/* Quiz Content */}
        <div className="px-4 pt-6">
          <h1 className="text-[32px] font-bold text-gray-900 mb-2 text-center">
            Bodyshape Quiz
          </h1>
          <p className="text-base text-gray-600 mb-8 text-center">
            Answer a few questions to determine your body shape
          </p>

          <h2 className="text-xl text-gray-900 mb-6">
            {QUIZ_QUESTIONS[currentQuestion].question}
          </h2>

          <div className="space-y-4 max-w-[312px] mx-auto mb-20">
            {QUIZ_QUESTIONS[currentQuestion].options.map((option) => (
              <button
                key={option.id}
                onClick={() => handleQuizAnswer(option.id)}
                className="w-full aspect-[2.5/1] bg-[#EFD7EF] rounded-xl border border-[#FFE2E2] hover:border-[#B252FF] transition-colors overflow-hidden relative"
              >
                <img 
                  src={option.image} 
                  alt={option.text}
                  className="w-full h-full object-contain"
                />
              </button>
            ))}
          </div>

          {/* Progress Dots */}
          <div className="fixed bottom-6 left-0 right-0">
            <div className="flex gap-1 justify-center">
              {QUIZ_QUESTIONS.map((_, idx) => (
                <div 
                  key={idx}
                  className={`h-[3px] w-8 rounded-full ${
                    idx === currentQuestion ? 'bg-[#B252FF]' : 'bg-[#E5E5E5]'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto text-center">
      <h2 className="text-3xl font-bold text-gray-900 mb-4">Body Shape Analysis</h2>
      <p className="text-lg text-gray-600 mb-8">
        Let's start by analyzing your body shape. Choose your preferred method.
      </p>

      <div className="flex flex-row gap-4 mb-8">
        <button
          onClick={() => setMethod('quiz')}
          className="flex items-center justify-center gap-3 p-6 bg-[#D259FF] 
                   text-white rounded-xl hover:bg-[#B252FF] transition-colors"
        >
          <span className="text-lg font-medium">Start Quiz</span>
        </button>

        <label className="flex items-center justify-center gap-3 p-6 bg-white
                       border border-[#D259FF] text-[#D259FF] rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
          <Upload className="w-6 h-6" />
          <span className="text-lg font-medium">Upload Photo</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>

        {error && (
          <div className="col-span-2 p-4 bg-red-50 text-red-700 rounded-lg">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}