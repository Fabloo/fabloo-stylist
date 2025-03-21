import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, ClipboardList } from 'lucide-react';
import { useProfile } from '../hooks/useProfile';
import { SkinToneDetector } from './SkinToneDetector';
import type { SkinTone, QuizAnswer, BodyShape } from '../types';

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
  {
    id: 'jewelry',
    question: 'Which jewelry tone looks best on your skin?',
    options: [
      { id: 'silver', text: 'Silver/Platinum', undertone: 'cool' },
      { id: 'gold', text: 'Gold', undertone: 'warm' },
      { id: 'both', text: 'Both look equally good', undertone: 'neutral' }
    ]
  },
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
    setError(error);
    // Automatically switch to quiz mode after error
    setTimeout(() => {
      setMethod('quiz');
      setAnalysisError(false);
      setError(null);
    }, 2000);
  };

  if (isAnalyzing) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Analyzing...</h2>
        <div className="space-y-4">
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-600 rounded-full transition-all duration-1000"
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
            onClick={() => setMethod('quiz')}
            className="w-full flex items-center justify-center gap-3 p-6 bg-indigo-600 
                     text-white rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <ClipboardList className="w-6 h-6" />
            <span className="text-lg font-medium">Take Quiz Instead</span>
          </button>
          
          <button
            onClick={() => navigate('/recommendations')}
            className="w-full flex items-center justify-center gap-3 p-6 border-2
                     border-gray-300 rounded-xl hover:border-indigo-500 hover:bg-gray-50
                     transition-colors text-gray-700"
          >
            <span className="text-lg font-medium">Skip Skin Tone Analysis</span>
          </button>
        </div>
      </div>
    );
  }

  if (!method) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Skin Tone Analysis</h2>
        <p className="text-lg text-gray-600 mb-8">
          Choose your preferred method to determine your skin tone
        </p>
        
        {/* Guidelines Section */}
        <div className="bg-gray-50 p-6 rounded-xl mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Guidelines for Good Results</h3>
          <ul className="space-y-3 text-left max-w-md mx-auto">
            <li className="flex items-center gap-2 text-gray-700">
              <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
              Remove glasses
            </li>
            <li className="flex items-center gap-2 text-gray-700">
              <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
              Use natural light
            </li>
            <li className="flex items-center gap-2 text-gray-700">
              <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
              Keep neutral expression
            </li>
            <li className="flex items-center gap-2 text-gray-700">
              <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
              Look directly at the camera
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-4 max-w-sm mx-auto mb-8">
          <button
            onClick={() => setMethod('quiz')}
            className="flex flex-col items-center justify-center p-6 bg-indigo-600
                     text-white rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <ClipboardList className="w-8 h-8 text-white-600 mb-2" />
        
            <span className="text-sm font-medium text-white-900">Take Quiz</span>
          </button>

          <button
            onClick={() => setMethod('camera')}
            className="flex items-center justify-center gap-3 p-6 border-2
                     border-gray-200 bg-white text-gray-900 rounded-xl 
                     hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <Upload className="w-6 h-6 text-gray-600" />
            <span className="text-sm font-medium text-gray-900">Use Camera</span>
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

  if (method === 'camera') {
    return (
      <div className="max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">
          Skin Tone Analysis
        </h2>
        <p className="text-lg text-gray-600 mb-8 text-center">
          Position your face in good lighting for the best results
        </p>
        
        <SkinToneDetector
          onSkinToneDetected={handleSkinToneDetected}
          onError={handleDetectionError}
        />
      </div>
    );
  }

  if (method === 'quiz') {
    return (
      <div className="max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">
          Quick Skin Tone Quiz
        </h2>
        <p className="text-lg text-gray-600 mb-8">
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