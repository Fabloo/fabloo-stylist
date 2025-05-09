export type BodyShape = 'hourglass' | 'pear' | 'inverted-triangle' | 'rectangle' | 'apple';

export type SkinTone = {
  id?: string;
  name?: string;
  hexColor?: string;
  season: 'warm' | 'cool' | 'neutral';
  undertone: 'warm' | 'cool' | 'neutral';
};

export type UserProfile = {
  id?: string;
  bodyShape?: BodyShape;
  skinTone?: SkinTone;
  created_at?: string;
  updated_at?: string;
  body_shape?: BodyShape;
  skin_tone?: SkinTone;
};

export type InventoryItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  image_url: string;
  image_url_2?: string;
  image_url_3?: string;
  brand_name?: string;
  sizes?: string[];
  body_shapes?: string[];
  color_tones?: string[];
  dress_type?: string[];
  created_at?: string;
  updated_at?: string;
};

export interface Friend {
  id: string;
  user_id: string;
  friend_name: string;
  friend_phone: string;
  friend_status: 'pending' | 'joined' | 'rejected';
  created_at: string;
  updated_at: string;
} 