import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  {
    id: 'features',
    question: 'What is your natural hair & eye color?',
    options: [
      { id: 'light-features', text: 'Light hair (blonde/red) & light eyes (blue/green)', undertone: 'cool' },
      { id: 'dark-features', text: 'Dark hair (brown/black) & dark eyes (brown)', undertone: 'warm' },
      { id: 'mixed-features', text: 'Mixed or medium features', undertone: 'neutral' }
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
  const location = useLocation();
  const { profile, updateProfile } = useProfile();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  // Check if we came here directly after body shape (without going through options)
  // If we did, redirect to the options page first
  useEffect(() => {
    // If we don't have the fromOptions flag in state, redirect to options
    if (!location.state?.fromOptions && currentResults.bodyShape && !redirecting) {
      console.log("Redirecting to skin tone options first - missing fromOptions state", location.state);
      setRedirecting(true);
      navigate('/skin-tone');
    }
  }, [location.state, currentResults, navigate, redirecting]);

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
      
      // Track quiz completion
      if (window.gtag) {
        window.gtag('event', 'Complete Quiz', {
          'event_category': 'Skin Tone Analysis',
          'event_label': skinTone.name
        });
      }

      // Update profile with skin tone
      updateProfile({ skinTone });
      
      setTimeout(() => {
        onComplete({ skinTone });
      }, 1500);
    }
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

  return (
    <div className="min-h-screen flex flex-col">
      {/* Add back button */}
      <button
        onClick={() => navigate('/skin-tone')}
        className="absolute top-4 left-4 p-2 text-gray-600 hover:text-gray-900"
      >
        ← Back
      </button>

      <div className="flex-1 max-w-md mx-auto w-full px-4 py-6 mb-20">
        {/* Header */}
        <h1 className="text-[32px] leading-[40px]  text-center mb-2">
          Skin Tone Quiz
        </h1>
        <p className="text-[16px] leading-[24px] text-[#666666] text-center mb-6">
          Answer a few questions to determine your skin tone
        </p>

        {/* Color Wheel Card */}
        <div className="bg-white p-6 rounded-[20px] shadow-sm mb-8 flex items-center gap-4">
          <div className="relative w-[140px] h-[140px] flex-shrink-0">
            {/* Color Wheel (SVG) */}
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <path d="M 50,50 L 100,50 A 50,50 0 0,1 93.3,75 Z" fill="#00C2AF" /> {/* Pastel Blue */}
              <path d="M 50,50 L 93.3,75 A 50,50 0 0,1 75,93.3 Z" fill="#009775" /> {/* Pastel Purple */}
              <path d="M 50,50 L 75,93.3 A 50,50 0 0,1 50,100 Z" fill="#99D6EA" /> {/* Light Blue */}
              <path d="M 50,50 L 50,100 A 50,50 0 0,1 25,93.3 Z" fill="#808286" /> {/* Pastel Red */}
              <path d="M 50,50 L 25,93.3 A 50,50 0 0,1 6.7,75 Z" fill="#F8E59A" /> {/* Pastel Green */}
              <path d="M 50,50 L 6.7,75 A 50,50 0 0,1 0,50 Z" fill="#F395C7" /> {/* Pastel Yellow */}
              <path d="M 50,50 L 0,50 A 50,50 0 0,1 6.7,25 Z" fill="#E3006D" /> {/* Light Purple */}
              <path d="M 50,50 L 6.7,25 A 50,50 0 0,1 25,6.7 Z" fill="#CE0037" /> {/* Pastel Pink */}
              <path d="M 50,50 L 25,6.7 A 50,50 0 0,1 50,0 Z" fill="#D2298E" /> {/* Light Sky Blue */}
              <path d="M 50,50 L 50,0 A 50,50 0 0,1 75,6.7 Z" fill="#7421B0" /> {/* Light Green */}
              <path d="M 50,50 L 75,6.7 A 50,50 0 0,1 93.3,25 Z" fill="#3A48BA" /> {/* Light Violet */}
              <path d="M 50,50 L 93.3,25 A 50,50 0 0,1 100,50 Z" fill="#006FC4" /> {/* Light Rose */}
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
          <div className="flex-1">
            <h3 className="text-[16px] leading-[24px] text-[#666666] text-center mb-6">
              Shades That Shine On You
            </h3>
          </div>
        </div>

        {/* Question Counter */}
        <p className="text-[14px] leading-[20px] font-medium tracking-wider text-[#666666] text-center mb-6 uppercase">
          Question {currentQuestion + 1} of {QUIZ_QUESTIONS.length}
        </p>

        {/* Question */}
        <div className="mb-6">
          <h2 className="text-[20px] leading-[36px] font-medium text-[#1A1A1A] mb-6">
            {QUIZ_QUESTIONS[currentQuestion].question.split(' ').map((word, i) => (
              word.toLowerCase() === 'veins' ? 
                <span key={i} className="font-bold">{word} </span> : 
                <span key={i}>{word} </span>
            ))}
          </h2>

          <div className="space-y-3">
            {QUIZ_QUESTIONS[currentQuestion].options.map((option) => (
              <button
                key={option.id}
                onClick={() => handleAnswer(option)}
                className="w-full p-4 text-left rounded-[14px] border border-transparent
                         hover:border-[#B252FF] bg-white hover:bg-gray-50 transition-colors
                         text-[#1A1A1A] text-[16px] leading-[24px]"
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