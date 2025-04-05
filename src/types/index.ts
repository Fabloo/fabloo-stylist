export type BodyShape = 'hourglass' | 'pear' | 'rectangle' | 'inverted-triangle' | 'apple';

export type SkinTone = {
  id: string;
  name: string;
  hexColor: string;
  season: 'warm' | 'cool' | 'neutral';
};

type SkinToneAnalysis = {
  id: string;
  confidence: number;
};

export type QuizAnswer = {
  id: string;
  text: string;
  undertone?: 'warm' | 'cool' | 'neutral';
  depth?: 'light' | 'medium' | 'deep';
};

export type AnalysisMethod = 'image' | 'quiz' | 'hybrid';

export type UserProfile = {
  id?: string;
  bodyShape?: BodyShape;
  skinTone?: SkinTone;
  preferences?: {
    style: string[];
    occasions: string[];
    priceRange: [number, number];
  };
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
};

export type AnalysisResult = {
  confidence: number;
  bodyShape?: BodyShape;
  skinTone?: SkinToneAnalysis;
  measurements?: {
    shoulders: number;
    bust: number;
    waist: number;
    hips: number;
  };
};