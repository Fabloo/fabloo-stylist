import type { BodyShape, SkinTone } from '../types';

type StyleTip = {
  title: string;
  description: string;
  do: string[];
  avoid: string[];
};

type ClothingItem = {
  type: string;
  description: string;
  features: string[];
  image: string;
};

type ColorPalette = {
  primary: string[];
  accent: string[];
  neutral: string[];
};

const BODY_SHAPE_STYLE_TIPS: Record<BodyShape, StyleTip> = {
  'hourglass': {
    title: 'Balanced Proportions',
    description: 'Your shoulders and hips are about the same width with a defined waist.',
    do: [
      'Wear fitted clothing that shows your waist',
      'Choose wrap dresses and belted styles',
      'Try high-waisted bottoms',
      'Opt for V-neck and sweetheart necklines'
    ],
    avoid: [
      'Oversized or boxy clothing that hides your shape',
      'Shapeless shift dresses',
      'Bulky layers around the waist',
      'High necklines that add bulk'
    ]
  },
  'pear': {
    title: 'Lower Body Focus',
    description: 'Your hips are wider than your shoulders with a defined waist.',
    do: [
      'Draw attention to your upper body with bright colors',
      'Wear boat necks and statement shoulders',
      'Choose A-line skirts and dark bottoms',
      'Try structured jackets that hit at the hip'
    ],
    avoid: [
      'Skinny jeans with tight tops',
      'Pencil skirts with fitted tops',
      'Heavy patterns on bottom half',
      'Cropped jackets that end at the waist'
    ]
  },
  'rectangle': {
    title: 'Straight and Athletic',
    description: 'Your shoulders, waist, and hips are similar in width.',
    do: [
      'Create curves with peplum tops and wrap dresses',
      'Layer with different lengths',
      'Use belts to define your waist',
      'Try ruffles and gathered details'
    ],
    avoid: [
      'Straight shift dresses without shape',
      'Monochromatic looks without definition',
      'Oversized, shapeless clothing',
      'Very fitted clothing without detail'
    ]
  },
  'inverted-triangle': {
    title: 'Upper Body Focus',
    description: 'Your shoulders are wider than your hips.',
    do: [
      'Balance proportions with full skirts',
      'Choose wide-leg pants',
      'Wear V-necks to minimize shoulders',
      'Try darker colors on top, lighter on bottom'
    ],
    avoid: [
      'Shoulder pads or puffy sleeves',
      'Halter necks and boat necks',
      'Skinny jeans with fitted tops',
      'Heavy patterns on top'
    ]
  },
  'apple': {
    title: 'Mid-Body Focus',
    description: 'Your middle section is wider than your hips and shoulders.',
    do: [
      'Create vertical lines with long necklaces',
      'Choose empire waist dresses',
      'Wear open necklines and longer tops',
      'Try monochromatic outfits for length'
    ],
    avoid: [
      'Clingy fabrics around the midsection',
      'Belts at the natural waist',
      'Cropped tops and short jackets',
      'Bulky materials and heavy patterns'
    ]
  }
};

const BODY_SHAPE_RECOMMENDATIONS: Record<BodyShape, ClothingItem[]> = {
  'hourglass': [
    {
      type: 'Dresses',
      description: 'Wrap dresses and fitted styles that accentuate your waist',
      features: ['Wrap style', 'Belt or waist definition', 'V-neckline'],
      image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&q=80&w=1000',
    },
    {
      type: 'Tops',
      description: 'Fitted tops that highlight your natural curves',
      features: ['V-neck or scoop neck', 'Waist-length', 'Structured fit'],
      image: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&q=80&w=1000',
    },
  ],
  'pear': [
    {
      type: 'Tops',
      description: 'Tops that add volume to your upper body',
      features: ['Boat necks', 'Puff sleeves', 'Structured shoulders'],
      image: 'https://images.unsplash.com/photo-1551803091-e20673f15770?auto=format&fit=crop&q=80&w=1000',
    },
    {
      type: 'Bottoms',
      description: 'A-line or flared skirts that balance your proportions',
      features: ['A-line cut', 'Dark colors', 'Smooth fabrics'],
      image: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?auto=format&fit=crop&q=80&w=1000',
    },
  ],
  'rectangle': [
    {
      type: 'Dresses',
      description: 'Styles that create curves and definition',
      features: ['Ruching', 'Draping', 'Belt details'],
      image: 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&q=80&w=1000',
    },
    {
      type: 'Layering',
      description: 'Pieces that add dimension to your silhouette',
      features: ['Cropped jackets', 'Asymmetric hems', 'Textured fabrics'],
      image: 'https://images.unsplash.com/photo-1525450824786-227cbef70703?auto=format&fit=crop&q=80&w=1000',
    },
  ],
  'inverted-triangle': [
    {
      type: 'Bottoms',
      description: 'Styles that add volume to your lower body',
      features: ['Wide-leg pants', 'Full skirts', 'Light colors'],
      image: 'https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?auto=format&fit=crop&q=80&w=1000',
    },
    {
      type: 'Tops',
      description: 'Fitted tops that balance your shoulders',
      features: ['Simple necklines', 'Fitted sleeves', 'Solid colors'],
      image: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&q=80&w=1000',
    },
  ],
  'apple': [
    {
      type: 'Dresses',
      description: 'Empire waist and A-line styles that create length',
      features: ['Empire waist', 'Vertical details', 'Flowing fabrics'],
      image: 'https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?auto=format&fit=crop&q=80&w=1000',
    },
    {
      type: 'Tops',
      description: 'Tops that elongate your torso',
      features: ['V-necks', 'Long line cuts', 'Dark solid colors'],
      image: 'https://images.unsplash.com/photo-1525450824786-227cbef70703?auto=format&fit=crop&q=80&w=1000',
    },
  ],
};

const SEASON_COLOR_PALETTES: Record<string, ColorPalette> = {
  'warm': {
    primary: ['#E5B887', '#D4A373', '#C68642'],
    accent: ['#8B4513', '#A0522D', '#CD853F'],
    neutral: ['#DEB887', '#D2B48C', '#BC8F8F'],
  },
  'cool': {
    primary: ['#B0C4DE', '#87CEEB', '#ADD8E6'],
    accent: ['#4682B4', '#5F9EA0', '#6495ED'],
    neutral: ['#F0F8FF', '#E6E6FA', '#F8F8FF'],
  },
  'neutral': {
    primary: ['#D3D3D3', '#DCDCDC', '#E8E8E8'],
    accent: ['#A9A9A9', '#808080', '#696969'],
    neutral: ['#F5F5F5', '#FFFFFF', '#EFEFEF'],
  },
};

export function getStyleRecommendations(bodyShape: BodyShape, skinTone: SkinTone) {
  const shapeRecommendations = BODY_SHAPE_RECOMMENDATIONS[bodyShape];
  const colorPalette = SEASON_COLOR_PALETTES[skinTone.season];

  return {
    fits: shapeRecommendations,
    colors: colorPalette,
    styleTips: BODY_SHAPE_STYLE_TIPS[bodyShape]
  };
}