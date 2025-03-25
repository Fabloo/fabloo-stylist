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
      // Update profile with body shape
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
      <div className="max-w-2xl mx-auto text-center mt-10">
        

        <h2 className="text-3xl font-bold text-gray-900 mb-4">Body Shape Analysis</h2>
        <p className="text-lg text-gray-600 mb-8">
          Let's start by analyzing your body shape. Choose your preferred method.
        </p>
{/* Add Image Above Method Selection */}
        <img
          src="https://res.cloudinary.com/drvhoqgno/image/upload/v1742291530/Frame_1000003512_kf4boz.png"
          alt="Body Shape Analysis Guide"
          className="w-64 mx-auto mb-8"
        />
        <div className="flex flex-col gap-4 max-w-sm mx-auto mb-8">


          <label className="flex items-center justify-center gap-3 p-6 bg-gray-900
                     text-white rounded-xl hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <Upload className="w-6 h-6" />
            <span className="text-lg font-medium">Upload Photo</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>

          <button
            onClick={() => setMethod('quiz')}
            className="flex items-center justify-center gap-3 p-6 border-2 border-secondary 
                     text-secondary rounded-xl hover:bg-secondary/20 transition-colors"
          >
            <ClipboardList className="w-6 h-6" />
            <span className="text-lg font-medium">Take Quiz</span>
          </button>

          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg">
              {error}
            </div>
          )}
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
      </p> {/* Add Image Below the Text */}
  <div className="mb-6 flex justify-center">
    <img src="https://res.cloudinary.com/drvhoqgno/image/upload/v1742291530/Frame_1000003512_kf4boz.png" alt="Body Shape Analysis" className="w-64 h-auto" />
  </div>

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