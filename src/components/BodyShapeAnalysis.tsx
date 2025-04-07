import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, ClipboardList } from 'lucide-react';
import { useProfile } from '../hooks/useProfile';
import type { BodyShape } from '../types';
import { analyzeBodyShape } from '../utils/bodyShapeAnalysis';

const QUIZ_QUESTIONS = [
  {
    id: 'shoulders',
    question: 'What best describes your shoulders?',
    options: [
      { id: 'broader', text: 'Broader than my hips', points: { 'inverted-triangle': 2, 'rectangle': 1 } },
      { id: 'same', text: 'About the same as my hips', points: { 'rectangle': 2, 'hourglass': 1 } },
      { id: 'narrower', text: 'Narrower than my hips', points: { 'pear': 2, 'hourglass': 1 } }
    ]
  },
  {
    id: 'waist',
    question: 'How would you describe your waist?',
    options: [
      { id: 'defined', text: 'Clearly defined, much smaller than bust/hips', points: { 'hourglass': 2 } },
      { id: 'somewhat', text: 'Somewhat defined', points: { 'rectangle': 1, 'pear': 1 } },
      { id: 'straight', text: 'Not very defined', points: { 'rectangle': 2, 'apple': 1 } }
    ]
  },
  {
    id: 'hips',
    question: 'How would you describe your hips?',
    options: [
      { id: 'wider', text: 'Wider than my shoulders and bust', points: { 'pear': 2 } },
      { id: 'balanced', text: 'In proportion with my shoulders', points: { 'hourglass': 2 } },
      { id: 'narrow', text: 'Narrower than my shoulders', points: { 'inverted-triangle': 2 } }
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
    const scores: Record<BodyShape, number> = {
      'hourglass': 0,
      'pear': 0,
      'rectangle': 0,
      'inverted-triangle': 0,
      'apple': 0
    };

    quizAnswers.forEach(answer => {
      const question = QUIZ_QUESTIONS.find(q => q.id === answer.questionId);
      const option = question?.options.find(o => o.id === answer.optionId);
      
      if (option?.points) {
        Object.entries(option.points).forEach(([shape, points]) => {
          scores[shape as BodyShape] += points;
        });
      }
    });

    // Find the body shape with the highest score
    let maxScore = 0;
    let result: BodyShape = 'hourglass'; // Default

    Object.entries(scores).forEach(([shape, score]) => {
      if (score > maxScore) {
        maxScore = score;
        result = shape as BodyShape;
      }
    });

    return result;
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
      console.log(bodyShape);
      updateProfile({
        bodyShape
      });
      setTimeout(() => {
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
      <div className="max-w-2xl mx-auto text-center mt-10 pb-32">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Body Shape Analysis</h2>
        <p className="text-lg text-gray-600 mb-4">
          Let's start by analyzing your body shape. Choose your preferred method.
        </p>
        
        {/* Example image */}
        <img 
          src="https://res.cloudinary.com/drvhoqgno/image/upload/v1742291530/Frame_1000003512_kf4boz.png"
          alt="Clothing examples"
          className="w-[180px] mx-auto mb-4"
        />

        {/* Upload Photo button moved below image */}
        <div className="w-[312px] mx-auto">
          <label className="block">
            <div className="w-full py-4 bg-gradient-to-r from-[#B252FF] to-[#F777F7] text-white text-[16px] font-medium leading-5 font-poppins rounded-[8px] shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center gap-2 cursor-pointer">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6.66667 6.66667V5C6.66667 3.15905 8.15905 1.66667 10 1.66667C11.841 1.66667 13.3333 3.15905 13.3333 5V6.66667M10 11.6667V13.3333M5 18.3333H15C16.3807 18.3333 17.5 17.214 17.5 15.8333V9.16667C17.5 7.78595 16.3807 6.66667 15 6.66667H5C3.61929 6.66667 2.5 7.78595 2.5 9.16667V15.8333C2.5 17.214 3.61929 18.3333 5 18.3333Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Upload Photo
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg mb-8">
            {error}
          </div>
        )}

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
              onClick={handleQuizStart}
              className="w-full py-4 bg-gradient-to-r from-[#B252FF] to-[#F777F7] text-white text-[16px] font-medium leading-5 font-poppins rounded-[8px] shadow-lg hover:shadow-xl transition-shadow"
            >
              Take Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (method === 'quiz') {
    return (
      <div className="max-w-2xl mx-auto text-center mt-10">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Body Shape Quiz</h2>
        <p className="text-lg text-gray-600 mb-6">
          Question {currentQuestion + 1} of {QUIZ_QUESTIONS.length}
        </p>
        
        <div className="bg-white p-8 rounded-xl shadow-sm">
          <div className="text-left">
            {/* Styles heading with proper spacing */}
            <div className="flex flex-col mb-8">
              <h3 className="text-xl font-medium text-gray-900 mb-6">Styles That Flatters On You</h3>
              <div className="flex justify-center gap-12">
                <img src="https://res.cloudinary.com/drvhoqgno/image/upload/v1742233399/Screenshot_2025-03-17_at_11.13.13_PM_vcz15d.png" alt="Dress style 1" className="h-24 w-auto" />
                <img src="https://res.cloudinary.com/drvhoqgno/image/upload/v1742233389/Screenshot_2025-03-17_at_11.13.04_PM_mxk2zf.png" alt="Dress style 2" className="h-24 w-auto" />
                <img src="https://res.cloudinary.com/drvhoqgno/image/upload/v1742233359/Screenshot_2025-03-17_at_11.12.34_PM_k8vyxe.png" alt="Dress style 3" className="h-24 w-auto" />
              </div>
            </div>

            <h3 className="text-xl font-medium text-gray-900 mb-4">
              {QUIZ_QUESTIONS[currentQuestion].question}
            </h3>
            <div className="space-y-3">
              {QUIZ_QUESTIONS[currentQuestion].options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleQuizAnswer(option.id)}
                  className="w-full p-4 text-left rounded-lg border hover:border-indigo-500 hover:bg-indigo-50"
                >
                  {option.text}
                </button>
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

      <div className="grid grid-cols-2 gap-4 mb-8">
        <button
          onClick={() => setMethod('quiz')}
          className="flex items-center justify-center gap-3 p-6 bg-black 
                   text-white rounded-xl hover:bg-indigo-700 transition-colors"
        >
          <ClipboardList className="w-6 h-6" />
          <span className="text-lg font-medium">Take Quiz</span>
        </button>

        <label className="flex items-center justify-center gap-3 p-6 bg-black
                       text-white rounded-xl hover:bg-indigo-700 transition-colors cursor-pointer">
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