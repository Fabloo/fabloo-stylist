export type BodyShape = 'hourglass' | 'pear' | 'inverted-triangle' | 'rectangle' | 'apple';

export type SkinTone = {
  id?: string;
  name?: string;
  hexColor?: string;
  season?: 'warm' | 'cool' | 'neutral';
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

// Friend Circle Types
export type FriendStatus = 'pending' | 'joined' | 'rejected';

export interface Friend {
  id: string;
  user_id: string;
  friend_name: string;
  friend_email: string;
  friend_status: 'pending' | 'joined' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface SharedItem {
  id: string;
  sender_id: string;
  friend_circle_id: string;
  item_id: string;
  comment?: string;
  response_status: 'pending' | 'liked' | 'disliked';
  response_comment?: string;
  created_at: string;
  updated_at: string;
  // Additional data joined from other tables
  friend_name?: string;
  friend_email?: string;
  item_details?: {
    name: string;
    image_url: string;
    price: number;
  };
}

// Authentication types
export interface User {
  id: string;
  email: string;
  role?: string;
  username?: string;
}

// Product types
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  stock: number;
  sizes?: string[];
  dress_attributes?: string | Record<string, any>;
  brand_id?: number;
}

export interface Brand {
  id: number;
  Name: string;
  logo: string;
}