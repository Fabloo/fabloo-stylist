import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, ClipboardList } from 'lucide-react';
import { useProfile } from '../hooks/useProfile';
import { SkinToneDetector } from './SkinToneDetector';
import type { SkinTone, QuizAnswer, BodyShape } from '../types';
import { CameraSkinToneAnalysis } from './CameraSkinToneAnalysis';

const SKIN_TONES: SkinTone[] = [
  { id: 'fair-cool', name: 'Fair Cool', hexColor: '#F5D0C5', season: 'cool' },
  { id: 'fair-warm', name: 'Fair Warm', hexColor: '#F7D5A6', season: 'warm' },
  { id: 'light-cool', name: 'Light Cool', hexColor: '#E8B593', season: 'cool' },
  { id: 'light-warm', name: 'Light Warm', hexColor: '#E6B98F', season: 'warm' },
  { id: 'medium-cool', name: 'Medium Cool', hexColor: '#C68863', season: 'cool' },
  { id: 'medium-warm', name: 'Medium Warm', hexColor: '#C68642', season: 'warm' },
  { id: 'deep-cool', name: 'Deep Cool', hexColor: '#8D5524', season: 'cool' },
  { id: 'deep-warm', name: 'Deep Warm', hexColor: '#8B4513', season: 'warm' },
  { id: 'neutral-light', name: 'Light Neutral', hexColor: '#E5B887', season: 'neutral' },
  { id: 'neutral-medium', name: 'Medium Neutral', hexColor: '#C68C53', season: 'neutral' },
  { id: 'neutral-deep', name: 'Deep Neutral', hexColor: '#8B4513', season: 'neutral' },
];

const QUIZ_QUESTIONS = [
  {
    id: 'veins',
    question: 'Look at the veins on your wrist. What color do they appear?',
    options: [
      { id: 'blue-purple', text: 'Blue or Purple', undertone: 'cool' },
      { id: 'green', text: 'Green', undertone: 'warm' },
      { id: 'both', text: 'Mix of both/Hard to tell', undertone: 'neutral' }
    ]
  },
  // {
  //   id: 'jewelry',
  //   question: 'Which jewelry tone looks best on your skin?',
  //   options: [
  //     { id: 'silver', text: 'Silver/Platinum', undertone: 'cool' },
  //     { id: 'gold', text: 'Gold', undertone: 'warm' },
  //     { id: 'both', text: 'Both look equally good', undertone: 'neutral' }
  //   ]
  // },
  {
    id: 'sun',
    question: 'How does your skin react to sun exposure?',
    options: [
      { id: 'burn', text: 'Burns easily, rarely tans', depth: 'light' },
      { id: 'tan', text: 'Tans easily, rarely burns', depth: 'deep' },
      { id: 'both', text: 'Sometimes burns, then tans', depth: 'medium' }
    ]
  }
];

type Props = {
  currentResults: {
    bodyShape?: BodyShape;
    skinTone?: SkinTone;
  };
  onComplete: (results: { skinTone: SkinTone }) => void;
};

export function SkinToneAnalysis({ currentResults, onComplete }: Props) {
  const navigate = useNavigate();
  const { profile, updateProfile } = useProfile();
  const [method, setMethod] = useState<'camera' | 'quiz' | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState(false);

  // If we already have skin tone from profile, use that
  useEffect(() => {
    if (profile?.skinTone) {
      onComplete({ skinTone: profile.skinTone });
    }
  }, [profile, onComplete]);

  const determineSkinTone = (answers: QuizAnswer[]) => {
    const undertoneAnswer = answers.find(a => a.undertone)?.undertone || 'neutral';
    const depthAnswer = answers.find(a => a.depth)?.depth || 'medium';
    
    const matchingTone = SKIN_TONES.find(tone => 
      tone.id.includes(depthAnswer) && tone.season === undertoneAnswer
    );
    
    return matchingTone?.id || 'medium-neutral';
  };

  const handleAnswer = (answer: QuizAnswer) => {
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);

    if (currentQuestion < QUIZ_QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setIsAnalyzing(true);
      const skinTone = SKIN_TONES.find(tone => tone.id === determineSkinTone(newAnswers));
      if (!skinTone) throw new Error('Failed to determine skin tone');
      // Update profile with skin tone
      updateProfile({ skinTone });
      setTimeout(() => {
        onComplete({ skinTone });
      }, 1500);
    }
  };

  const handlePhotoResult = (skinTone: SkinTone) => {
    // Also update the profile when detected via photo
    updateProfile({ skinTone });
    setTimeout(() => {
      onComplete({ skinTone });
    }, 1500);
  };

  const handleSkinToneDetected = (skinTone: SkinTone) => {
    // Also update the profile when detected via camera
    updateProfile({ skinTone });
    onComplete({ skinTone });
  };

  const handleDetectionError = (error: string) => {
    setAnalysisError(true);
    setError("We're having trouble initializing the camera analysis. This could be due to browser compatibility issues or required permissions.");
    // Re-enable automatic fallback to quiz mode
    setTimeout(() => {
      setMethod('quiz');
      setAnalysisError(false);
      setError(null);
    }, 3000);
  };

  if (isAnalyzing) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Analyzing...</h2>
        <div className="space-y-4">
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-black rounded-full transition-all duration-1000"
              style={{ width: '60%' }}
            />
          </div>
          <p className="text-lg text-gray-600">Please wait while we process your information.</p>
        </div>
      </div>
    );
  }

  if (analysisError) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Analysis Not Available</h2>
        <p className="text-lg text-gray-600 mb-8">
          {error}
        </p>
        
        <div className="space-y-6">
          <button
            onClick={() => {
              setAnalysisError(false);
              setError(null);
              setMethod('camera');
            }}
            className="w-full flex items-center justify-center gap-3 p-6 bg-white 
                     border-2 border-gray-300 text-gray-700 rounded-xl 
                     hover:border-indigo-500 hover:bg-gray-50 transition-colors"
          >
            <Upload className="w-6 h-6" />
            <span className="text-lg font-medium">Retry Camera Analysis</span>
          </button>

          <button
            onClick={() => setMethod('quiz')}
            className="w-full flex items-center justify-center gap-3 p-6 bg-black 
                     text-white rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <ClipboardList className="w-6 h-6" />
            <span className="text-lg font-medium">Take Quiz Instead</span>
          </button>
        </div>
      </div>
    );
  }

  if (!method) {
    return (
      <div className="max-w-2xl mx-auto text-center mt-10">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Skin Tone Analysis</h2>
        <h4 className="text-lg text-gray-600 mb-6">Determine your Clothing Colors by your Color Type</h4>
        {/* <p className="text-lg text-gray-600 mb-8">
          Choose your preferred method to determine your skin tone
        </p> */}

<div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="flex justify-center mb-2">
            <div className="relative aspect-square mx-auto">
  {/* Color Wheel (SVG) */}
  <svg viewBox="0 0 100 100" className="w-full h-full">
    <path d="M 50,50 L 100,50 A 50,50 0 0,1 93.3,75 Z" fill="#2563eb" /> {/* blue-600 */}
    <path d="M 50,50 L 93.3,75 A 50,50 0 0,1 75,93.3 Z" fill="#581c87" /> {/* purple-900 */}
    <path d="M 50,50 L 75,93.3 A 50,50 0 0,1 50,100 Z" fill="#5eead4" /> {/* teal-300 */}
    <path d="M 50,50 L 50,100 A 50,50 0 0,1 25,93.3 Z" fill="#e11d48" /> {/* rose-600 */}
    <path d="M 50,50 L 25,93.3 A 50,50 0 0,1 6.7,75 Z" fill="#7dd3fc" /> {/* sky-300 */}
    <path d="M 50,50 L 6.7,75 A 50,50 0 0,1 0,50 Z" fill="#fef08a" /> {/* yellow-200 */}
    <path d="M 50,50 L 0,50 A 50,50 0 0,1 6.7,25 Z" fill="#f9a8d4" /> {/* pink-300 */}
    <path d="M 50,50 L 6.7,25 A 50,50 0 0,1 25,6.7 Z" fill="#e5e7eb" /> {/* gray-200 */}
    <path d="M 50,50 L 25,6.7 A 50,50 0 0,1 50,0 Z" fill="#60a5fa" /> {/* blue-400 */}
    <path d="M 50,50 L 50,0 A 50,50 0 0,1 75,6.7 Z" fill="#86efac" /> {/* green-300 */}
    <path d="M 50,50 L 75,6.7 A 50,50 0 0,1 93.3,25 Z" fill="#c4b5fd" /> {/* violet-300 */}
    <path d="M 50,50 L 93.3,25 A 50,50 0 0,1 100,50 Z" fill="#f9a8d4" /> {/* pink-200 */}
  </svg>

  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
    <img
      src="https://res.cloudinary.com/drvhoqgno/image/upload/v1742234094/Frame_1000003729_yhgkns.png" // Replace with actual image
      alt="Center Image"
      className="w-32 h-32 rounded-full border-2 border-white shadow-lg object-cover"
    />
  </div>
</div>
            </div>
            <p className="text-gray-800 text-sm font-medium">Shades That Shine On You</p>
          </div>
        
        {/* Guidelines Section */}
        {/* <div className="bg-gray-50 p-6 rounded-xl mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Guidelines for Good Results</h3>
          <ul className="space-y-3 text-left max-w-md mx-auto">
            <li className="flex items-center gap-2 text-gray-700">
              <span className="w-1.5 h-1.5 bg-black rounded-full" />
              Remove glasses
            </li>
            <li className="flex items-center gap-2 text-gray-700">
              <span className="w-1.5 h-1.5 bg-black rounded-full" />
              Use natural light
            </li>
            <li className="flex items-center gap-2 text-gray-700">
              <span className="w-1.5 h-1.5 bg-black rounded-full" />
              Keep neutral expression
            </li>
            <li className="flex items-center gap-2 text-gray-700">
              <span className="w-1.5 h-1.5 bg-black rounded-full" />
              Look directly at the camera
            </li>
          </ul>
        </div> */}

        <div className="flex flex-col gap-4 max-w-sm mx-auto mb-8">
          <button
            onClick={() => setMethod('quiz')}
            className="flex gap-1 items-center justify-center p-6 bg-black
                     text-white rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <ClipboardList className="w-8 h-8 text-white-600 mb-2" />
        
            <span className="text-sm font-medium text-white-900">Take Quiz</span>
          </button>

          {/* <button
            onClick={() => setMethod('camera')}
            className="flex items-center justify-center gap-3 p-6 border-2
                     border-gray-200 bg-white text-gray-900 rounded-xl 
                     hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <Upload className="w-6 h-6 text-gray-600" />
            <span className="text-sm font-medium text-gray-900">Use Camera</span>
          </button> */}

          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (method === 'camera') {
    return (
      <div className="max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">
          Skin Tone Analysis
        </h2>
        <p className="text-lg text-gray-600 mb-8 text-center">
          Position your face in good lighting for the best results
        </p>
        
        <CameraSkinToneAnalysis 
          onSkinToneDetected={handleSkinToneDetected}
          onError={handleDetectionError}
        />
      </div>
    );
  }

  if (method === 'quiz') {
    return (
      <div className="max-w-2xl mx-auto mt-10 p-4">
        <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">
          Quick Skin Tone Quiz
        </h2>
        <p className="text-lg text-center text-gray-600 mb-8">
          Question {currentQuestion + 1} of {QUIZ_QUESTIONS.length}
        </p>
        
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-xl font-medium text-gray-900 mb-6">
            {QUIZ_QUESTIONS[currentQuestion].question}
          </h3>
          
          <div className="space-y-4">
            {QUIZ_QUESTIONS[currentQuestion].options.map((option) => (
              <button
                key={option.id}
                onClick={() => handleAnswer(option)}
                className="w-full p-4 text-left rounded-lg border border-gray-200
                         hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
              >
                {option.text}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }
}