import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { ShoppingBag, Share2, Heart, Search, X, ChevronRight, Filter, Check, ChevronUp, Users } from 'lucide-react';
import type { BodyShape, SkinTone } from '../types';
import { getStyleRecommendations } from '../utils/styleRecommendations';
import { useCartStore } from '../store';
import { ProductDetail } from '../pages/ProductDetail';
import { supabase } from '../lib/supabase';
import { useCart } from '../hooks/useCart';
import { useWishlist } from '../hooks/useWishlist';
import { toast } from 'react-toastify';
import { ShareWithFriends } from './ShareWithFriends';
import { motion, AnimatePresence } from 'framer-motion';
type Props = {
  bodyShape: BodyShape;
  skinTone: SkinTone;
};

type DressItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  stock: number;
  sizes?: string[];
  dress_attributes?: string;
  brand_id?: number;
};

type Brand = {
  id: number;
  Name: string;
  logo: string;
};

// Define skin tone categories with representative colors and recommended shades
const skinTones = [
  { name: "Fair Cool", color: "#F3D9D4", shades: ["#00C2AF", "#B8C9E1", "#5BC2E7", "#6787B7", "#57728B", "#3E6991", "#808286", "#CDB5A7", "#F57EB6", "#AD96DC", "#3A48BA", "#ECB3CB"] },
  { name: "Fair Warm", color: "#F6CBA6", shades: ["#6DCDB8", "#6CC24A", "#C4D600", "#FEEF00", "#FF8F1C", "#F69F23", "#FDD26E", "#FF2600", "#7421B0", "#3A48BA", "#00A499", "#2DCCD3"] },
  { name: "Light Cool", color: "#E6B8A2", shades: ["#C26E60", "#C05131", "#DB864E", "#CDA788", "#FAC712", "#FDAA63", "#F5E1A4", "#7C4D3A", "#946037", "#52463F", "#BBC592", "#507F70"] },
  { name: "Medium Cool", color: "#C48E78", shades: ["#71C5E8", "#06352E", "#00A376", "#FEEF00", "#FAC712", "#F69F23", "#FB6312", "#FF2600", "#93328E", "#7421B0", "#3A48BA", "#00649B"] },
  { name: "Deep Cool", color: "#8D5D4C", shades: ["#00C2AF", "#003057", "#57728B", "#6787B7", "#57728B", "#007681", "#006F62", "#BCBDBE", "#C4A4A7", "#BF0D3E", "#D2298E", "#7421B0"] },
  { name: "Medium Warm", color: "#B8764D", shades: ["#00C2AF", "#009775", "#99D6EA", "#808286", "#F8E59A", "#F395C7", "#E3006D", "#CE0037", "#D2298E", "#7421B0", "#3A48BA", "#006FC4"] },
  { name: "Deep Warm", color: "#6D3B2E", shades: ["#94FFF2", "#00B500", "#A9FF03", "#FFF278", "#F9B087", "#E54520", "#3A1700", "#FB6312", "#D2298E", "#6802C1", "#001ECC", "#006FC4"] },
  { name: "Light Neutral", color: "#D9A68D", shades: ["#00C2AF", "#009775", "#7FD200", "#F8E59A", "#FEFEFE", "#F395C7", "#FB6312", "#FF2600", "#D2298E", "#963CBD", "#3A48BA", "#0082BA"] },
  { name: "Medium Neutral", color: "#A46B52", shades: ["#6BCABA", "#00B500", "#7FD200", "#FEEF00", "#B4A91F", "#A07400", "#205C40", "#9D4815", "#946037", "#C4622D", "#F68D2E", "#00778B"] },
  { name: "Light Warm", color: "#E6B98F", shades: ["#00C2AF", "#00B500", "#7FD200", "#FEEF00", "#FAC712", "#FF8D6D", "#FF8200", "#FF2600", "#E40046", "#A77BCA", "#3A48BA", "#006FC4"] },
  { name: "Deep Neutral", color: "#714233", shades: ["#00C2AF", "#0E470E", "#9AEA0F", "#FEEF00", "#FFC200", "#F69F23", "#FF592C", "#FF2600", "#CE0037", "#7421B0", "#3A48BA", "#006FC4"] }
];


export function ShopRecommendations({ bodyShape, skinTone }: Props) {
  const [dresses, setDresses] = useState<DressItem[]>([]);
  const [brands, setBrands] = useState<Record<number, Brand>>({});
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(8);
  const { addToCart: addToCartStore } = useCartStore();
  const { fetchCart } = useCart();
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [cartSuccess, setCartSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'style' | 'color' | 'attributes' | 'brand'>('all');
  const [selectedBrand, setSelectedBrand] = useState<number | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [colorPalette, setColorPalette] = useState<any>(null);
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
  const [sizeModalOpen, setSizeModalOpen] = useState<string | null>(null);
  const [isAnalysisExpanded, setIsAnalysisExpanded] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement | null>(null);
  const { addToWishlist, refreshWishlist, wishlistItems: currentWishlistItems } = useWishlist();
  
  // Friend circle sharing states
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedDressForShare, setSelectedDressForShare] = useState<DressItem | null>(null);
  
  // New filter states
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [attributeFilters, setAttributeFilters] = useState<Record<string, string[]>>({});
  const [allAttributeOptions, setAllAttributeOptions] = useState<Record<string, {value: string, count: number}[]>>({});
  const [attributeSearchTerm, setAttributeSearchTerm] = useState('');
  
  // New UI states
  const [activeAttributeCategory, setActiveAttributeCategory] = useState<string | null>(null);
  
  // Priority attributes for filtering
  const priorityAttributes: string[] = [
    'Fabric', 'Length', 'Primary color', 'Pattern', 'Neck', 
    'Occasion', 'Print', 'Shape', 'Sleeve length', 'Sleeve styling'
  ];

  // Create a lookup map for wishlist items for efficient checking
  const wishlistItemMap = useMemo(() => {
    const map = new Map();
    if (currentWishlistItems && currentWishlistItems.length > 0) {
      currentWishlistItems.forEach(item => {
        if (item.item_id) {
          map.set(item.item_id, item);
        }
      });
    }
    return map;
  }, [currentWishlistItems]);

  // Check if an item is in the wishlist
  const isInWishlist = useCallback((itemId: string) => {
    return wishlistItemMap.has(itemId);
  }, [wishlistItemMap]);

  useEffect(() => {
    checkSession();
    // Find the matching skin tone based on the season
    const selectedSkinTone = skinTones.find((tone) => {
      const toneName = tone.name.toLowerCase().trim();
      return toneName.includes(skinTone.season.toLowerCase());
    });
    
    if (selectedSkinTone) {
      setColorPalette({
        primary: selectedSkinTone.shades.slice(0, 4),
        accent: selectedSkinTone.shades.slice(4, 8),
        neutral: selectedSkinTone.shades.slice(8, 12)
      });
    }
  }, [skinTone.season]);

  const checkSession = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      setIsAuthenticated(!!session && !sessionError);
    } catch (err) {
      console.error('Session check error:', err);
      setIsAuthenticated(false);
    }
  };

  const recommendations = getStyleRecommendations(bodyShape, skinTone);

  const addToCart = async (itemId: string) => {
    try {
      if (!isAuthenticated) {
        throw new Error('Please sign in to continue');
      }

      if (!selectedSizes[itemId]) {
        setError('Please select a size');
        return;
      }

      setError(null);
      setAddingToCart(itemId);
      setCartSuccess(null);

      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (!userId) {
        throw new Error('User not found');
      }

      const { error } = await supabase
        .from('cart_items')
        .upsert(
          { 
            user_id: userId, 
            item_id: itemId, 
            quantity: 1,
            size_selected: selectedSizes[itemId]
          },
          { onConflict: 'user_id,item_id' }
        );

      if (error) throw error;

      setCartSuccess(itemId);
      await fetchCart();
      setTimeout(() => {
        setCartSuccess(null);
        setSelectedSizes(prev => {
          const newSizes = { ...prev };
          delete newSizes[itemId];
          return newSizes;
        });
      }, 1000);
      setSizeModalOpen(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add item to cart';
      setError(errorMessage);
      console.error('Error adding to cart:', err);
      setCartSuccess(null);
    } finally {
      setAddingToCart(null);
    }
  };

  const handleShare = async (e: React.MouseEvent, dress: DressItem) => {
    try {
      e.stopPropagation();
      if (!isAuthenticated) {
        setError('Please sign in to share with friends');
        setTimeout(() => setError(null), 3000);
        return;
      }

      // Open the share modal with the selected dress
      setSelectedDressForShare(dress);
      setShareModalOpen(true);
    } catch (err) {
      // Only log error if it's not a user cancellation
      if (!(err instanceof Error) || err.name !== 'AbortError') {
        console.error('Error sharing:', err);
      }
    }
  };

  const NormalShare = async (e: React.MouseEvent, dress: DressItem) => {
    try {
      e.stopPropagation();
      const baseUrl = window.location.origin;
      const productUrl = `${baseUrl}/product/${dress.id}`;
      const shareText = `Check out this ${dress.name} from Fabloo Stylist!`;
      
      if (navigator.share) {
        await navigator.share({
          title: dress.name,
          text: shareText,
          url: productUrl
        });
        setCartSuccess('Item shared successfully!');
      } else {
        // Fallback for browsers that don't support Web Share API
        await navigator.clipboard.writeText(`${shareText}\n\n${productUrl}`);
        setCartSuccess('Link copied to clipboard! You can now paste it in WhatsApp or any other app.');
      }
      setTimeout(() => setCartSuccess(null), 2000);
    } catch (err) {
      // Only log error if it's not a user cancellation
      if (!(err instanceof Error) || err.name !== 'AbortError') {
        console.error('Error sharing:', err);
        setError('Failed to share item. Please try again.');
        setTimeout(() => setError(null), 3000);
      }
    }
  };

  

  useEffect(() => {
    async function fetchRecommendations() {
      try {
        // Fetch brands first
        const { data: brandsData, error: brandsError } = await supabase
          .from('brands')
          .select('*')
          .order('Name');
        
        if (brandsError) throw brandsError;
        
        // Create a lookup map for brands
        const brandsMap = (brandsData || []).reduce((acc: Record<number, Brand>, brand: Brand) => {
          acc[brand.id] = brand;
          return acc;
        }, {});

        console.log('Fetched brands:', brandsMap);
        
        setBrands(brandsMap);
        
        // Then, get all inventory items with their attributes
        const { data, error } = await supabase
          .from('inventory_items')
          .select(`
            *,
            item_attributes!inner (
              body_shapes,
              color_tones
            )
          `)
          .gt('stock', 0);

        if (error) throw error;
        if (!data) throw new Error('No data returned');

        // Parse dress attributes to extract all possible filter options
        const attributeOptionsMap: Record<string, Map<string, number>> = {};
        
        data.forEach(item => {
          if (!item.dress_attributes) return;
          
          let attributes: Record<string, any> = {};
          try {
            if (typeof item.dress_attributes === 'string') {
              // Enhanced sanitization for malformed JSON
              let sanitizedAttrs = item.dress_attributes;
              
              // Try to fix common JSON errors
              sanitizedAttrs = sanitizedAttrs
                .replace(/'/g, '"')
                .replace(/(\w+):/g, '"$1":') // Convert attribute names to quoted strings
                .replace(/:\s*"([^"]*)(?=\s*[,}])/g, ':"$1"') // Ensure string values are properly quoted
                .replace(/,\s*}/g, '}') // Remove trailing commas
                .replace(/,\s*]/g, ']')
                // Handle additional spacing issues in JSON
                .replace(/\n/g, '')
                .replace(/\r/g, '')
                .replace(/\t/g, '')
                .replace(/\s+/g, ' ')
                .trim();
              
              // Attempt to make it valid JSON by wrapping in curly braces if not present
              if (!sanitizedAttrs.startsWith('{')) {
                sanitizedAttrs = '{' + sanitizedAttrs;
              }
              if (!sanitizedAttrs.endsWith('}')) {
                sanitizedAttrs = sanitizedAttrs + '}';
              }
              
              // Make sure we have balanced brackets
              const openBraces = (sanitizedAttrs.match(/\{/g) || []).length;
              const closeBraces = (sanitizedAttrs.match(/\}/g) || []).length;
              
              if (closeBraces > openBraces) {
                // Too many closing braces, remove extras from the end
                sanitizedAttrs = sanitizedAttrs.substring(0, sanitizedAttrs.lastIndexOf('}') + 1);
              } else if (openBraces > closeBraces) {
                // Too many opening braces, add closing braces
                for (let i = 0; i < openBraces - closeBraces; i++) {
                  sanitizedAttrs += '}';
                }
              }
              
              try {
                // Try parsing with our sanitized string
                attributes = JSON.parse(sanitizedAttrs);
              } catch (parseError) {
                console.warn('First parse attempt failed, trying more aggressive sanitization');
                
                // Try to extract valid key-value pairs only
                const keyValuePairs: Record<string, any> = {};
                const pattern = /"([^"]+)"\s*:\s*"([^"]*)"/g;
                let match;
                
                while ((match = pattern.exec(sanitizedAttrs)) !== null) {
                  const key = match[1];
                  const value = match[2];
                  if (key && value !== undefined) {
                    keyValuePairs[key] = value;
                  }
                }
                
                // Also try to extract array values
                const arrayPattern = /"([^"]+)"\s*:\s*\[(.*?)\]/g;
                while ((match = arrayPattern.exec(sanitizedAttrs)) !== null) {
                  const key = match[1];
                  const arrayString = match[2];
                  if (key && arrayString) {
                    // Try to parse the array values
                    try {
                      const arrayItems = arrayString.split(',').map(item => {
                        // Clean up each item and remove quotes
                        const cleaned = item.trim().replace(/^"(.*)"$/, '$1');
                        return cleaned;
                      });
                      keyValuePairs[key] = arrayItems;
                    } catch (e) {
                      console.warn(`Failed to parse array value for ${key}:`, e);
                    }
                  }
                }
                
                // If we found any valid pairs, use them
                if (Object.keys(keyValuePairs).length > 0) {
                  attributes = keyValuePairs;
                } else {
                  // Last resort: create a fallback with common attributes if available
                  const commonAttrs = [
                    'shape', 'Length', 'Fabric', 'primary color', 'Pattern', 
                    'Neck', 'Occasion', 'Print', 'Sleeve length', 'Sleeve styling'
                  ];
                  
                  commonAttrs.forEach(attr => {
                    const match = sanitizedAttrs.match(new RegExp(`"${attr}"\\s*:\\s*"([^"]*)"`, 'i'));
                    if (match && match[1]) {
                      attributes[attr] = match[1];
                    }
                  });
                }
              }
            } else if (typeof item.dress_attributes === 'object') {
              attributes = item.dress_attributes;
            }
            
            // Extract attributes and count their occurrences
            Object.entries(attributes).forEach(([key, value]) => {
              if (value === undefined || value === null) return;
              
              // Normalize key - capitalize first letter, rest lowercase
              let normalizedKey = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
              
              // Replace underscores with spaces
              normalizedKey = normalizedKey.replace(/_/g, ' ');
              
              // Skip certain technical keys that aren't useful for filtering
              const keysToSkip = ['id', 'created_at', 'updated_at', 'dress_attributes', 'dress attributes'];
              if (keysToSkip.includes(normalizedKey.toLowerCase())) {
                return;
              }
              
              if (!attributeOptionsMap[normalizedKey]) {
                attributeOptionsMap[normalizedKey] = new Map();
              }
              
              // Handle different value types
              if (Array.isArray(value)) {
                // For array values, add each item individually
                value.forEach((item: any) => {
                  const stringItem = String(item).trim();
                  if (stringItem) {
                    const currentCount = attributeOptionsMap[normalizedKey].get(stringItem) || 0;
                    attributeOptionsMap[normalizedKey].set(stringItem, currentCount + 1);
                  }
                });
              } else {
                // For string/number values
                const stringValue = String(value).trim();
                if (stringValue) {
                  const currentCount = attributeOptionsMap[normalizedKey].get(stringValue) || 0;
                  attributeOptionsMap[normalizedKey].set(stringValue, currentCount + 1);
                }
              }
            });
          } catch (err) {
            console.error('Error parsing dress attributes:', err, 'for item:', item.id, 'with value:', item.dress_attributes);
          }
        });
        
        // Now add priority to common filter attributes so they appear at the top
        const attributeOptions: Record<string, {value: string, count: number}[]> = {};
        
        // First add priority attributes in order
        priorityAttributes.forEach(attr => {
          const normalizedAttr = attr.charAt(0).toUpperCase() + attr.slice(1).toLowerCase();
          // Find the attribute in our map (case insensitive)
          const matchingKey = Object.keys(attributeOptionsMap).find(
            key => key.toLowerCase() === normalizedAttr.toLowerCase()
          );
          
          if (matchingKey && attributeOptionsMap[matchingKey].size >= 1) {
            attributeOptions[matchingKey] = Array.from(attributeOptionsMap[matchingKey].entries())
              .map(([value, count]) => ({ value, count }))
              .sort((a, b) => b.count - a.count);
          }
        });

        // Then add all other attributes
        Object.entries(attributeOptionsMap).forEach(([key, valueMap]) => {
          // Skip if already added as a priority attribute
          if (attributeOptions[key]) return;
          
          // Only include attributes with at least 1 possible value
          if (valueMap.size >= 1) {
            attributeOptions[key] = Array.from(valueMap.entries())
              .map(([value, count]) => ({ value, count }))
              .sort((a, b) => b.count - a.count);
          }
        });

        // Set the extracted attribute options
        setAllAttributeOptions(attributeOptions);
        
        let filteredDresses = data;

        // Apply filters based on selection
        if (filterType === 'style') {
          filteredDresses = data.filter(item => {
            if (!item.item_attributes || !Array.isArray(item.item_attributes)) return false;
            const attributes = item.item_attributes[0];
            if (!attributes || !attributes.body_shapes) return false;
            
            // Directly use the array for comparison
            const bodyShapes = attributes.body_shapes.map((shape: string) => shape.toLowerCase());
            return bodyShapes.includes(bodyShape.toLowerCase());
          });
        } else if (filterType === 'color') {
          filteredDresses = data.filter(item => {
            if (!item.item_attributes || !Array.isArray(item.item_attributes)) return false;
            const attributes = item.item_attributes[0];
            if (!attributes || !attributes.color_tones) return false;
            
            const colorTones = attributes.color_tones.map((tone: string) => tone.toLowerCase());
            return colorTones.includes(skinTone.season.toLowerCase());
          });
        } else if (filterType === 'attributes') {
          filteredDresses = data.filter(item => {
            // Check if the item has dress_attributes
            if (!item.dress_attributes) return false;
            
            try {
              // Parse dress_attributes
              let attrs: Record<string, any>;
              if (typeof item.dress_attributes === 'string') {
                // Enhanced sanitization for malformed JSON
                let sanitizedAttrs = item.dress_attributes;
                
                // Try to fix common JSON errors by replacing single quotes with double quotes
                sanitizedAttrs = sanitizedAttrs
                  .replace(/'/g, '"')
                  .replace(/(\w+):/g, '"$1":') // Convert attribute names to quoted strings
                  .replace(/:\s*"([^"]*)(?=\s*[,}])/g, ':"$1"') // Ensure string values are properly quoted
                  .replace(/,\s*}/g, '}') // Remove trailing commas
                  .replace(/,\s*]/g, ']')
                  // Handle additional spacing issues in JSON
                  .replace(/\n/g, '')
                  .replace(/\r/g, '')
                  .replace(/\t/g, '')
                  .replace(/\s+/g, ' ')
                  .trim();
                
                // Attempt to make it valid JSON by wrapping in curly braces if not present
                if (!sanitizedAttrs.startsWith('{')) {
                  sanitizedAttrs = '{' + sanitizedAttrs;
                }
                if (!sanitizedAttrs.endsWith('}')) {
                  sanitizedAttrs = sanitizedAttrs + '}';
                }
                
                // Make sure we have balanced brackets
                const openBraces = (sanitizedAttrs.match(/\{/g) || []).length;
                const closeBraces = (sanitizedAttrs.match(/\}/g) || []).length;
                
                if (closeBraces > openBraces) {
                  // Too many closing braces, remove extras from the end
                  sanitizedAttrs = sanitizedAttrs.substring(0, sanitizedAttrs.lastIndexOf('}') + 1);
                } else if (openBraces > closeBraces) {
                  // Too many opening braces, add closing braces
                  for (let i = 0; i < openBraces - closeBraces; i++) {
                    sanitizedAttrs += '}';
                  }
                }
                
                try {
                  // Try parsing with our sanitized string
                  attrs = JSON.parse(sanitizedAttrs);
                } catch (parseError) {
                  console.warn('Failed to parse dress attributes, using empty object instead:', parseError);
                  attrs = {};
                  return false; // Skip items with invalid attributes
                }
              } else if (typeof item.dress_attributes === 'object') {
                attrs = item.dress_attributes;
              } else {
                return false;
              }
              
              // Check if product matches all selected attribute filters
              return Object.entries(attributeFilters).every(([filterKey, selectedValues]) => {
                if (!selectedValues.length) return true; // Skip if no values selected for this attribute
                
                // Find the corresponding attribute in the product (case insensitive)
                const productAttrEntry = Object.entries(attrs).find(
                  ([attrKey]) => attrKey.toLowerCase() === filterKey.toLowerCase()
                );
                
                if (!productAttrEntry) return false;
                
                const [_, productAttrValue] = productAttrEntry;
                
                // Handle array values
                if (Array.isArray(productAttrValue)) {
                  // Check if any of the product's array values match any of the selected filter values
                  return productAttrValue.some(arrayItem => {
                    const normalizedArrayItem = String(arrayItem).trim().toLowerCase();
                    return selectedValues.some(selectedValue => 
                      normalizedArrayItem.includes(selectedValue.toLowerCase())
                    );
                  });
                }
                
                // Handle string/number values
                const normalizedProductValue = String(productAttrValue).trim().toLowerCase();
                return selectedValues.some(value => 
                  normalizedProductValue.includes(value.toLowerCase())
                );
              });
            } catch (err) {
              console.error('Error checking product for attribute filters:', err);
              return false;
            }
          });
        } else if (filterType === 'brand') {
          filteredDresses = data.filter(item => {
            if (!item.brand_id) return false;
            return item.brand_id === selectedBrand;
          });
        } else {
          // For 'all' filter type
          filteredDresses = data.filter(item => {
            if (!item.item_attributes || !Array.isArray(item.item_attributes)) return false;
            const attributes = item.item_attributes[0];
            if (!attributes || !attributes.body_shapes || !attributes.color_tones) return false;
            
            const bodyShapes = attributes.body_shapes.map((shape: string) => shape.toLowerCase());
            const colorTones = attributes.color_tones.map((tone: string) => tone.toLowerCase());
            
            return bodyShapes.includes(bodyShape.toLowerCase()) || 
                   colorTones.includes(skinTone.season.toLowerCase());
          });
        }

        // Apply attribute filters regardless of the filter type if they are set
        if (Object.values(attributeFilters).some(values => values.length > 0)) {
          filteredDresses = filteredDresses.filter(item => {
            if (!item.dress_attributes) return false;
            
            try {
              let attrs: Record<string, any>;
              if (typeof item.dress_attributes === 'string') {
                // Enhanced sanitization for malformed JSON
                let sanitizedAttrs = item.dress_attributes;
                
                // Try to fix common JSON errors by replacing single quotes with double quotes
                sanitizedAttrs = sanitizedAttrs
                  .replace(/'/g, '"')
                  .replace(/(\w+):/g, '"$1":') // Convert attribute names to quoted strings
                  .replace(/:\s*"([^"]*)(?=\s*[,}])/g, ':"$1"') // Ensure string values are properly quoted
                  .replace(/,\s*}/g, '}') // Remove trailing commas
                  .replace(/,\s*]/g, ']')
                  // Handle additional spacing issues in JSON
                  .replace(/\n/g, '')
                  .replace(/\r/g, '')
                  .replace(/\t/g, '')
                  .replace(/\s+/g, ' ')
                  .trim();
                
                // Attempt to make it valid JSON by wrapping in curly braces if not present
                if (!sanitizedAttrs.startsWith('{')) {
                  sanitizedAttrs = '{' + sanitizedAttrs;
                }
                if (!sanitizedAttrs.endsWith('}')) {
                  sanitizedAttrs = sanitizedAttrs + '}';
                }
                
                // Make sure we have balanced brackets
                const openBraces = (sanitizedAttrs.match(/\{/g) || []).length;
                const closeBraces = (sanitizedAttrs.match(/\}/g) || []).length;
                
                if (closeBraces > openBraces) {
                  // Too many closing braces, remove extras from the end
                  sanitizedAttrs = sanitizedAttrs.substring(0, sanitizedAttrs.lastIndexOf('}') + 1);
                } else if (openBraces > closeBraces) {
                  // Too many opening braces, add closing braces
                  for (let i = 0; i < openBraces - closeBraces; i++) {
                    sanitizedAttrs += '}';
                  }
                }
                
                try {
                  // Try parsing with our sanitized string
                  attrs = JSON.parse(sanitizedAttrs);
                } catch (parseError) {
                  console.warn('Failed to parse dress attributes, using empty object instead:', parseError);
                  attrs = {};
                  return false; // Skip items with invalid attributes
                }
              } else if (typeof item.dress_attributes === 'object') {
                attrs = item.dress_attributes;
              } else {
                return false;
              }
              
              // Check if product matches all selected attribute filters
              return Object.entries(attributeFilters).every(([filterKey, selectedValues]) => {
                if (!selectedValues.length) return true; // Skip if no values selected for this attribute
                
                // Find the corresponding attribute in the product (case insensitive)
                const productAttrEntry = Object.entries(attrs).find(
                  ([attrKey]) => attrKey.toLowerCase() === filterKey.toLowerCase()
                );
                
                if (!productAttrEntry) return false;
                
                const [_, productAttrValue] = productAttrEntry;
                
                // Handle array values
                if (Array.isArray(productAttrValue)) {
                  // Check if any of the product's array values match any of the selected filter values
                  return productAttrValue.some(arrayItem => {
                    const normalizedArrayItem = String(arrayItem).trim().toLowerCase();
                    return selectedValues.some(selectedValue => 
                      normalizedArrayItem.includes(selectedValue.toLowerCase())
                    );
                  });
                }
                
                // Handle string/number values
                const normalizedProductValue = String(productAttrValue).trim().toLowerCase();
                return selectedValues.some(value => 
                  normalizedProductValue.includes(value.toLowerCase())
                );
              });
            } catch (err) {
              console.error('Error checking product for attribute filters:', err);
              return false;
            }
          });
        }

        console.log('Filtered Dresses:', filteredDresses);
        setDresses(filteredDresses);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load recommendations';
        setError(errorMessage);
        console.error('Error fetching recommendations:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchRecommendations();
  }, [bodyShape, skinTone, filterType, selectedBrand, attributeFilters]);

  const loadMoreItems = useCallback(() => {
    setVisibleCount(prev => prev + 8);
  }, []);

  useEffect(() => {
    const options = {
      root: null,
      rootMargin: '20px',
      threshold: 0.1
    };

    observerRef.current = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (entry.isIntersecting && dresses.length > visibleCount) {
        loadMoreItems();
      }
    }, options);

    if (loadingRef.current) {
      observerRef.current.observe(loadingRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [dresses.length, visibleCount, loadMoreItems]);

  // Function to toggle an attribute filter value
  const toggleAttributeFilter = (attributeKey: string, value: string) => {
    setAttributeFilters(prev => {
      const currentValues = prev[attributeKey] || [];
      
      // If value is already selected, remove it, otherwise add it
      const updatedValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      
      // Return updated filters, removing the attribute entirely if no values selected
      return {
        ...prev,
        [attributeKey]: updatedValues
      };
    });
  };

  // Reset all attribute filters
  const clearAllAttributeFilters = () => {
    setAttributeFilters({});
  };

  // Filter attribute options based on search term
  const filteredAttributeOptions = useMemo(() => {
    if (!attributeSearchTerm) return allAttributeOptions;
    
    const searchTerm = attributeSearchTerm.toLowerCase();
    const filtered: Record<string, {value: string, count: number}[]> = {};
    
    Object.entries(allAttributeOptions).forEach(([key, options]) => {
      // Include the attribute if its key or any of its values match the search term
      if (key.toLowerCase().includes(searchTerm)) {
        filtered[key] = options;
      } else {
        const matchingOptions = options.filter(opt => 
          opt.value.toLowerCase().includes(searchTerm)
        );
        if (matchingOptions.length > 0) {
          filtered[key] = matchingOptions;
        }
      }
    });
    
    return filtered;
  }, [allAttributeOptions, attributeSearchTerm]);

  // Count the total number of applied filters
  const appliedFilterCount = useMemo(() => {
    return Object.values(attributeFilters).reduce(
      (count, values) => count + values.length, 
      0
    );
  }, [attributeFilters]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading recommendations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  const handleWishlist = async (dress: DressItem) => {
    try {
      if (!isAuthenticated) {
        setError('Please sign in to add items to your wishlist');
        setTimeout(() => setError(null), 3000);
        return;
      }

      // If already in wishlist, show message
      if (isInWishlist(dress.id)) {
        setCartSuccess(`"${dress.name}" is already in your wishlist`);
        setTimeout(() => setCartSuccess(null), 2000);
        return;
      }

      // Show loading state for the wishlist action
      setAddingToCart(`wishlist-${dress.id}`);
      setError(null);
      
      try {
        await addToWishlist({
          id: dress.id,
          name: dress.name,
          price: dress.price,
          description: dress.description,
          image_url: dress.image_url,
        });
        
        // Refresh wishlist data to ensure UI is up to date
        await refreshWishlist();
        
        // Set success message
        toast.success(`Added "${dress.name}" to wishlist`);
      } catch (wishlistError) {
        if (wishlistError instanceof Error && wishlistError.message.includes('already in wishlist')) {
          setCartSuccess(`"${dress.name}" is already in your wishlist`);
        } else {
          throw wishlistError; // re-throw if it's not an "already in wishlist" error
        }
      }
      
      // Clear success message after delay
      setTimeout(() => setCartSuccess(null), 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add to wishlist';
      setError(errorMessage);
      setTimeout(() => setError(null), 3000);
    } finally {
      setAddingToCart(null);
    }
  };

  const getBrandName = (id: number | undefined) => {
    return brands[id ?? -1]?.Name || 'Unknown Brand';
  };




  return (
    <div className="bg-white w-full h-full relative overflow-hidden">
      <div className="w-full mx-auto mt-8 flex flex-col items-center px-4 pb-20">
        {/* AI Stylist Recommendations Section */}
        <div className="w-full bg-white shadow-lg rounded-lg p-3 max-w-3xl">
          <div className="text-center text-[#212121] text-[24px] font-semibold leading-[24px]  font-poppins mb-3">
            AI Stylist Recommended Picks
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
            <button 
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-full text-s font-normal leading-[14.4px] ${
                filterType === 'all' 
                  ? 'bg-[#EAEAEA] text-[#212121] border border-[#EAEAEA]' 
                  : 'bg-white text-[#565656] border border-[#EAEAEA]'
              }`}
            >
              All
            </button>
            <button 
              onClick={() => setFilterType('color')}
              className={`px-3 py-1 rounded-full text-xs font-normal leading-[14.4px] ${
                filterType === 'color' 
                  ? 'bg-[#EAEAEA] text-[#212121] border border-[#EAEAEA]' 
                  : 'bg-white text-[#565656] border border-[#EAEAEA]'
              }`}
            >
              By Color Palette
            </button>
            <button 
              onClick={() => setFilterType('style')}
              className={`px-3 py-1 rounded-full text-xs font-normal leading-[14.4px] ${
                filterType === 'style' 
                  ? 'bg-[#EAEAEA] text-[#212121] border border-[#EAEAEA]' 
                  : 'bg-white text-[#565656] border border-[#EAEAEA]'
              }`}
            >
              By Body Shape
            </button>
            <button
              onClick={() => {
                setFilterType('attributes');
                setFilterModalOpen(true);
                // Set first category as active when opening modal
                if (Object.keys(allAttributeOptions).length > 0) {
                  setActiveAttributeCategory(Object.keys(allAttributeOptions)[0]);
                }
              }}
              className={`px-3 py-1 rounded-full text-xs font-normal leading-[14.4px] flex items-center ${
                filterType === 'attributes' || appliedFilterCount > 0
                  ? 'bg-[#EAEAEA] text-[#212121] border border-[#EAEAEA]' 
                  : 'bg-white text-[#565656] border border-[#EAEAEA]'
              }`}
            >
              <span>By Attributes</span>
              {appliedFilterCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center w-4 h-4 text-[10px] bg-purple-500 text-white rounded-full">
                  {appliedFilterCount}
                </span>
              )}
            </button>
            {/* <button 
              onClick={() => setFilterType('brand')}
              className={`px-3 py-1 rounded-full text-xs font-normal leading-[14.4px] ${
                filterType === 'brand' 
                  ? 'bg-[#EAEAEA] text-[#212121] border border-[#EAEAEA]' 
                  : 'bg-white text-[#565656] border border-[#EAEAEA]'
              }`}
            >
              By Brand
            </button> */}
          </div>

          {/* Color Palette Section */}
          {(filterType === 'color' || filterType === 'all') && colorPalette && (
            <div className="mb-3 overflow-x-auto">
              <div className="flex gap-3 min-w-max px-2 py-1">
                {[...colorPalette.primary, ...colorPalette.accent, ...colorPalette.neutral].map((color: string, i: number) => (
                      <div
                        key={i}
                    className="w-8 h-8 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                    ))}
              </div>
            </div>
          )}
          
          {/* Dress Styles Section */}
          {(filterType === 'style' || filterType === 'all') && (
            <div className="mb-3">
                <img 
              src={
                bodyShape === 'pear' 
                  ? 'https://res.cloudinary.com/dofgnvgo6/image/upload/v1744359997/Screenshot_2025-04-11_at_1.56.02_PM_mmuqxr.png'           
                : bodyShape === 'inverted-triangle' 
                  ? 'https://res.cloudinary.com/drvhoqgno/image/upload/v1742304942/Screenshot_2025-03-18_at_7.05.33_PM_jpi0dh.png'
                  : bodyShape === 'rectangle'
                  ? 'https://res.cloudinary.com/dofgnvgo6/image/upload/v1738253153/Screenshot_2025-01-30_at_9.35.44_PM_qjvypa.png'
                  : bodyShape === 'apple'
                  ? 'https://res.cloudinary.com/dofgnvgo6/image/upload/v1738253494/Screenshot_2025-01-30_at_9.41.24_PM_tedlxo.png'
                  : bodyShape === 'hourglass'
                  ? 'https://res.cloudinary.com/dofgnvgo6/image/upload/v1738253864/Screenshot_2025-01-30_at_9.47.36_PM_jorwsk.png'
                  : ''
              } 
                alt={`${bodyShape} body shape recommended styles`}
                className="w-full h-[107px] object-cover rounded-lg"
            />
          </div>
          )}

          {/* Attribute Filters Section */}
          {(filterType === 'attributes' || appliedFilterCount > 0) && !filterModalOpen && (
            <div className="mb-3">
              <div className="p-3 border border-[#EAEAEA] rounded-lg bg-gray-50">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-medium text-gray-700">Applied Filters:</h4>
                  {appliedFilterCount > 0 && (
                    <button 
                      onClick={clearAllAttributeFilters}
                      className="text-xs text-red-500 font-medium"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                
                {appliedFilterCount > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(attributeFilters).map(([attr, values]) => 
                      values.map(value => (
                        <div 
                          key={`${attr}-${value}`} 
                          className="flex items-center bg-purple-50 rounded-full px-2.5 py-1 border border-purple-100"
                        >
                          <span className="text-xs font-medium text-purple-800">{attr}: {value}</span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleAttributeFilter(attr, value);
                            }}
                            className="ml-1 text-purple-500 hover:text-purple-700"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500">
                    No filters applied. Click "By Attributes" to add filters.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Brand Filters Section */}
          {filterType === 'brand' && (
            <div className="mb-3">
              <div className="p-3 border border-[#EAEAEA] rounded-lg bg-gray-50">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Select Brand:</h4>
                <div className="grid grid-cols-2 gap-2 max-h-[150px] overflow-y-auto pr-1">
                  {Object.values(brands).map((brand) => (
                    <button
                      key={brand.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBrand(brand.id === selectedBrand ? null : brand.id);
                      }}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-left ${
                        brand.id === selectedBrand 
                          ? 'bg-purple-100 border border-purple-300 text-purple-800' 
                          : 'bg-white border border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-xs font-medium truncate">{brand.Name}</span>
                      {brand.id === selectedBrand && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
                {selectedBrand && (
                  <div className="mt-2 flex justify-end">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBrand(null);
                      }}
                      className="text-xs text-purple-600 hover:text-purple-800"
                    >
                      Clear Selection
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
      </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 gap-2 sm:gap-6 mt-4 w-full max-w-3xl px-2 sm:px-0">
        {dresses.slice(0, visibleCount).map((dress) => (
            
            <div key={dress.id} className="group relative bg-white rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-200 flex flex-col">
            <div 
              className="aspect-[3/4] overflow-hidden relative cursor-pointer" 
              style={{ minHeight: '200px' }}
              onClick={() => setSelectedProduct(dress.id)}
            >
              <img 
                src={dress.image_url}
                alt={dress.name}
                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-200"
                style={{ position: 'absolute', top: '0', left: '0', width: '100%', height: '100%' }}
              />
              <div className="absolute bottom-2 right-2 flex gap-1.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    NormalShare(e, dress);
                  }}
                  className="bg-white/90 backdrop-blur-sm rounded-full p-1.5 hover:bg-white transition-colors duration-200 shadow-sm"
                >
                  <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShare(e, dress);
                  }}
                  className="bg-white/90 backdrop-blur-sm rounded-full p-1.5 hover:bg-white transition-colors duration-200 shadow-sm"
                >
                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleWishlist(dress);
                  }}
                  className={`bg-white/90 backdrop-blur-sm rounded-full p-1.5 hover:bg-white transition-colors duration-200 shadow-sm ${
                    addingToCart === `wishlist-${dress.id}` ? 'animate-pulse' : ''
                  }`}
                  disabled={addingToCart === `wishlist-${dress.id}`}
                >
                  <Heart 
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                      isInWishlist(dress.id) ? 'text-pink-500' : 
                      addingToCart === `wishlist-${dress.id}` ? 'text-pink-500' : 'text-gray-600'
                    }`} 
                    fill={isInWishlist(dress.id) || addingToCart === `wishlist-${dress.id}` ? "#ec4899" : "none"}
                  />
                </button>
              </div>
            </div>
              <div className="p-2 sm:p-3 flex flex-col flex-grow">
                <h4 className="text-[13px] sm:text-[15px] font-medium text-gray-900 mb-1 line-clamp-2 min-h-[32px] sm:min-h-[40px]">
                  {dress.name}
                </h4>
                <div className="flex items-center justify-between mb-1">
                  {dress.brand_id && brands[dress.brand_id] && (
                    <div className="flex items-center gap-1">
                      <p className="text-[11px] sm:text-[12px] font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
                        {getBrandName(dress.brand_id)}
                      </p>
                    </div>
                  )}
                </div>
                <div className="mt-auto">
                  <div className="flex justify-between items-center mb-2 sm:mb-3">
                    <p className="text-[13px] sm:text-[15px] font-semibold text-gray-900 tracking-tight">₹{dress.price}</p>
                  </div>
                  <button
                    onClick={() => {
                      if (!isAuthenticated) {
                        setError('Please sign in to continue');
                        return;
                      }
                      setSizeModalOpen(dress.id);
                    }}
                    className="w-full py-2 sm:py-2.5 bg-gradient-to-r from-[#B252FF] to-[#F777F7] text-white text-xs sm:text-sm font-medium rounded-lg hover:opacity-90 transition-opacity duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 sm:w-4 sm:h-4">
                      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path>
                      <path d="M3 6h18"></path>
                      <path d="M16 10a4 4 0 0 1-8 0"></path>
                    </svg>
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Loading Indicator */}
        {dresses.length > visibleCount && (
          <div ref={loadingRef} className="w-full flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-black rounded-full animate-spin"></div>
          </div>
        )}

        {/* Bottom Filter Button */}
        <div className="fixed bottom-0 left-0 right-0 flex justify-center p-4 bg-gradient-to-t from-white via-white to-white z-30">
          <button
            onClick={() => setFilterModalOpen(true)}
            className="w-full max-w-3xl py-3 px-4 border border-[#B252FF] rounded-full text-[#B252FF] font-medium text-sm flex items-center justify-center gap-2 shadow-lg"
          >
            <Filter size={18} />
            Filter Products
            {appliedFilterCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-[10px] bg-white text-purple-600 rounded-full font-bold">
                {appliedFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Attribute Filters Modal */}
      <AnimatePresence>
        {filterModalOpen && (
          <motion.div 
            className="fixed inset-0 z-50 flex flex-col items-end justify-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Backdrop */}
            <motion.div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFilterModalOpen(false)}
            />
            
            {/* Filter Panel */}
            <motion.div 
              className="relative w-full h-[100vh] max-h-[1000px] bg-white rounded-t-3xl overflow-hidden flex flex-col"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              {/* Handle Bar */}
              <div className="w-full flex justify-center pt-3 pb-1">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
              </div>
              
              {/* Header */}
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
                <div className="flex items-center gap-4">
                  {appliedFilterCount > 0 && (
                    <button 
                      onClick={clearAllAttributeFilters}
                      className="text-sm font-medium text-rose-500"
                    >
                      Clear All
                    </button>
                  )}
                  <button 
                    onClick={() => setFilterModalOpen(false)}
                    className="rounded-full p-1 hover:bg-gray-100"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              {/* Content */}
              <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                {/* Left Sidebar - Categories */}
                <div className="w-full md:w-1/3 border-r border-gray-100 overflow-y-auto bg-gray-50 h-full max-h-[calc(85vh-140px)]">
                  <div className="py-2">
                    {/* Add category headers for organization */}
                    {Object.keys(allAttributeOptions).some(key => 
                      priorityAttributes.some(attr => {
                        const normalizedAttr = attr.charAt(0).toUpperCase() + attr.slice(1).toLowerCase();
                        return key.toLowerCase() === normalizedAttr.toLowerCase();
                      })
                    ) && (
                      <div className="px-6 py-2">
                        <span className="text-xs font-bold text-gray-500 uppercase">Common Filters</span>
                      </div>
                    )}
                    
                    {/* First show priority attributes */}
                    {Object.keys(allAttributeOptions).filter(key => {
                      // Skip "Dress_attributes" and similar keys
                      const keysToSkip = ['dress_attributes', 'dress attributes'];
                      if (keysToSkip.includes(key.toLowerCase().replace(/_/g, ' '))) {
                        return false;
                      }
                      
                      return priorityAttributes.some(attr => {
                        const normalizedAttr = attr.charAt(0).toUpperCase() + attr.slice(1).toLowerCase();
                        return key.toLowerCase() === normalizedAttr.toLowerCase();
                      });
                    }).map((attributeKey) => (
                      <div key={attributeKey} className="border-b border-gray-100">
                        <button
                          onClick={() => {
                            // Toggle the active category - if clicking the currently active one, close it
                            setActiveAttributeCategory(prevCategory => 
                              prevCategory === attributeKey ? null : attributeKey
                            );
                          }}
                          className={`w-full px-6 py-4 text-left flex justify-between items-center
                            ${activeAttributeCategory === attributeKey 
                              ? 'bg-white border-l-4 border-purple-500' 
                              : 'border-l-4 border-transparent'
                            }`}
                        >
                          <div className="flex flex-col">
                            <span className={`text-sm font-medium ${
                              activeAttributeCategory === attributeKey 
                                ? 'text-purple-800' 
                                : 'text-gray-800'
                            }`}>
                              {attributeKey}
                            </span>
                            {attributeFilters[attributeKey]?.length > 0 && (
                              <span className="text-xs text-purple-600 mt-0.5">
                                {attributeFilters[attributeKey].length} selected
                              </span>
                            )}
                          </div>
                          <div className="flex items-center">
                            {activeAttributeCategory === attributeKey && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent triggering the parent button
                                  setActiveAttributeCategory(null);
                                }}
                                className="mr-2 p-1 rounded-full bg-gray-100 hover:bg-gray-200"
                              >
                                <X size={16} className="text-gray-600" />
                              </button>
                            )}
                            <ChevronRight size={16} className={`transform transition-transform ${
                              activeAttributeCategory === attributeKey 
                                ? 'text-purple-500 rotate-90' 
                                : 'text-gray-400'
                            }`} />
                          </div>
                        </button>
                        
                        {/* Show the attribute content directly below when active */}
                        {activeAttributeCategory === attributeKey && (
                          <div className="bg-white px-4 py-3 border-t border-gray-100">
                            <div className="grid grid-cols-1 gap-2">
                              {filteredAttributeOptions[attributeKey]?.map(({value, count}) => (
                                <label 
                                  key={`${attributeKey}-${value}`}
                                  className="flex items-center gap-3 cursor-pointer group"
                                >
                                  <div className={`
                                    w-5 h-5 flex items-center justify-center rounded-full border flex-shrink-0
                                    ${attributeFilters[attributeKey]?.includes(value)
                                      ? 'bg-gradient-to-r from-[#B252FF] to-[#F777F7] border-transparent'
                                      : 'border-gray-300 group-hover:border-purple-300 bg-white'
                                    }
                                  `}>
                                    {attributeFilters[attributeKey]?.includes(value) && (
                                      <Check className="h-3 w-3 text-white" />
                                    )}
                                    <input 
                                      type="checkbox"
                                      className="sr-only"
                                      checked={attributeFilters[attributeKey]?.includes(value) || false}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        toggleAttributeFilter(attributeKey, value);
                                      }}
                                    />
                                  </div>
                                  <div className="flex-1 flex items-center justify-between">
                                    <span className="text-sm text-gray-800 truncate">{value}</span>
                                    <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-500 flex-shrink-0">{count}</span>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {/* Add separator and header for other attributes */}
                    {Object.keys(allAttributeOptions).some(key => 
                      !priorityAttributes.some(attr => {
                        const normalizedAttr = attr.charAt(0).toUpperCase() + attr.slice(1).toLowerCase();
                        return key.toLowerCase() === normalizedAttr.toLowerCase();
                      })
                    ) && (
                      <div className="px-6 py-2 mt-4">
                        <span className="text-xs font-bold text-gray-500 uppercase">More Filters</span>
                      </div>
                    )}
                    
                    {/* Then show remaining attributes */}
                    {Object.keys(allAttributeOptions).filter(key => {
                      // Skip "Dress_attributes" and similar keys
                      const keysToSkip = ['dress_attributes', 'dress attributes'];
                      if (keysToSkip.includes(key.toLowerCase().replace(/_/g, ' '))) {
                        return false;
                      }
                      
                      return !priorityAttributes.some(attr => {
                        const normalizedAttr = attr.charAt(0).toUpperCase() + attr.slice(1).toLowerCase();
                        return key.toLowerCase() === normalizedAttr.toLowerCase();
                      });
                    }).map((attributeKey) => (
                      <div key={attributeKey} className="border-b border-gray-100">
                        <button
                          onClick={() => {
                            // Toggle the active category - if clicking the currently active one, close it
                            setActiveAttributeCategory(prevCategory => 
                              prevCategory === attributeKey ? null : attributeKey
                            );
                          }}
                          className={`w-full px-6 py-4 text-left flex justify-between items-center
                            ${activeAttributeCategory === attributeKey 
                              ? 'bg-white border-l-4 border-purple-500' 
                              : 'border-l-4 border-transparent'
                            }`}
                        >
                          <div className="flex flex-col">
                            <span className={`text-sm font-medium ${
                              activeAttributeCategory === attributeKey 
                                ? 'text-purple-800' 
                                : 'text-gray-800'
                            }`}>
                              {attributeKey}
                            </span>
                            {attributeFilters[attributeKey]?.length > 0 && (
                              <span className="text-xs text-purple-600 mt-0.5">
                                {attributeFilters[attributeKey].length} selected
                              </span>
                            )}
                          </div>
                          <div className="flex items-center">
                            {activeAttributeCategory === attributeKey && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent triggering the parent button
                                  setActiveAttributeCategory(null);
                                }}
                                className="mr-2 p-1 rounded-full bg-gray-100 hover:bg-gray-200"
                              >
                                <X size={16} className="text-gray-600" />
                              </button>
                            )}
                            <ChevronRight size={16} className={`transform transition-transform ${
                              activeAttributeCategory === attributeKey 
                                ? 'text-purple-500 rotate-90' 
                                : 'text-gray-400'
                            }`} />
                          </div>
                        </button>
                        
                        {/* Show the attribute content directly below when active */}
                        {activeAttributeCategory === attributeKey && (
                          <div className="bg-white px-4 py-3 border-t border-gray-100">
                            <div className="grid grid-cols-1 gap-2">
                              {filteredAttributeOptions[attributeKey]?.map(({value, count}) => (
                                <label 
                                  key={`${attributeKey}-${value}`}
                                  className="flex items-center gap-3 cursor-pointer group"
                                >
                                  <div className={`
                                    w-5 h-5 flex items-center justify-center rounded-full border flex-shrink-0
                                    ${attributeFilters[attributeKey]?.includes(value)
                                      ? 'bg-gradient-to-r from-[#B252FF] to-[#F777F7] border-transparent'
                                      : 'border-gray-300 group-hover:border-purple-300 bg-white'
                                    }
                                  `}>
                                    {attributeFilters[attributeKey]?.includes(value) && (
                                      <Check className="h-3 w-3 text-white" />
                                    )}
                                    <input 
                                      type="checkbox"
                                      className="sr-only"
                                      checked={attributeFilters[attributeKey]?.includes(value) || false}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        toggleAttributeFilter(attributeKey, value);
                                      }}
                                    />
                                  </div>
                                  <div className="flex-1 flex items-center justify-between">
                                    <span className="text-sm text-gray-800 truncate">{value}</span>
                                    <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-500 flex-shrink-0">{count}</span>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Right Content - Options */}
                <div className="w-full md:w-2/3 flex-1 flex flex-col h-full">
                  {/* Search Bar */}
                  <div className="sticky top-0 bg-white p-4 border-b border-gray-100 z-10">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search attributes..."
                        value={attributeSearchTerm}
                        onChange={(e) => setAttributeSearchTerm(e.target.value)}
                        className="w-full py-2.5 pl-10 pr-4 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300"
                      />
                      <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                      {attributeSearchTerm && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAttributeSearchTerm('');
                          }}
                          className="absolute right-3 top-2.5"
                        >
                          <X className="w-4 h-4 text-gray-400" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Search Results Panel - Only show when searching */}
                  {attributeSearchTerm && (
                    <div className="flex-1 overflow-y-auto h-full max-h-[calc(85vh-190px)] p-4">
                      <div className="text-sm font-medium text-gray-700 mb-4">
                        Search results for "{attributeSearchTerm}"
                      </div>
                      
                      {Object.entries(filteredAttributeOptions).map(([attributeKey, options]) => (
                        <div key={attributeKey} className="mb-6">
                          <h3 className="text-sm font-semibold text-gray-700 mb-2">{attributeKey}</h3>
                          <div className="grid grid-cols-1 gap-2">
                            {options.map(({value, count}) => (
                              <label 
                                key={`${attributeKey}-${value}`}
                                className="flex items-center gap-3 cursor-pointer group"
                              >
                                <div className={`
                                  w-5 h-5 flex items-center justify-center rounded-full border flex-shrink-0
                                  ${attributeFilters[attributeKey]?.includes(value)
                                    ? 'bg-gradient-to-r from-[#B252FF] to-[#F777F7] border-transparent'
                                    : 'border-gray-300 group-hover:border-purple-300 bg-white'
                                  }
                                `}>
                                  {attributeFilters[attributeKey]?.includes(value) && (
                                    <Check className="h-3 w-3 text-white" />
                                  )}
                                  <input 
                                    type="checkbox"
                                    className="sr-only"
                                    checked={attributeFilters[attributeKey]?.includes(value) || false}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      toggleAttributeFilter(attributeKey, value);
                                    }}
                                  />
                                </div>
                                <div className="flex-1 flex items-center justify-between">
                                  <span className="text-sm text-gray-800 truncate">{value}</span>
                                  <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-500 flex-shrink-0">{count}</span>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                      
                      {Object.keys(filteredAttributeOptions).length === 0 && (
                        <div className="p-8 text-center">
                          <p className="text-gray-500">No attributes match your search.</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Empty state when no search and no category selected */}
                  {!attributeSearchTerm && !activeAttributeCategory && (
                    <div className="flex-1 flex items-center justify-center flex-col p-">
                      <div className="text-gray-400 mb-4">
                        <Filter size={30} />
                      </div>
                      <p className="text-gray-500 text-center">
                        Select a filter category from the left<br />or search for attributes above
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Apply Button */}
              <div className="border-t border-gray-100 p-4 mt-auto">
                <button
                  onClick={() => setFilterModalOpen(false)}
                  className="w-full py-3 bg-gradient-to-r from-[#B252FF] to-[#F777F7] text-white font-medium rounded-full flex items-center justify-center gap-2"
                >
                  Apply Filters
                  {appliedFilterCount > 0 && (
                    <span className="flex items-center justify-center h-5 w-5 bg-white text-purple-600 rounded-full text-xs font-bold">
                      {appliedFilterCount}
                    </span>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setSelectedProduct(null)} />
            <div className="relative bg-white w-full max-w-4xl rounded-xl shadow-2xl">
              <ProductDetail id={selectedProduct} onClose={() => setSelectedProduct(null)} />
            </div>
          </div>
        </div>
      )}

      {/* Size Selection Modal */}
      {sizeModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity" 
              onClick={() => setSizeModalOpen(null)}
            />
            
            <div className="relative bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden transform transition-all">
              {/* Get the selected dress details */}
              {(() => {
                const selectedDress = dresses.find(d => d.id === sizeModalOpen);
                if (!selectedDress) return null;
                
                return (
                  <>
                    {/* Responsive layout for the modal */}
                    <div className="flex flex-col sm:flex-row">
                      <div className="w-full sm:w-1/3 relative" style={{ minHeight: '200px' }}>
                        <img 
                          src={selectedDress.image_url} 
                          alt={selectedDress.name}
                          className="h-64 sm:h-full w-full object-contain sm:object-cover"
                          style={{ maxHeight: '300px' }}
                        />
                      </div>
                      
                      <div className="w-full sm:w-2/3 p-4 sm:p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">{selectedDress.name}</h3>
                        <p className="text-xl font-bold text-gray-900 mb-4">₹{selectedDress.price}</p>
                        
                        <div className="mb-6">
                          <p className="text-sm font-medium text-gray-700 mb-3">Select Your Size:</p>
                          <div className="grid grid-cols-4 sm:grid-cols-3 gap-2">
                            {(typeof selectedDress.sizes === 'string' ? JSON.parse(selectedDress.sizes) : selectedDress.sizes)?.map((size: string) => (
                              <button
                                key={size}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSizes(prev => ({
                                    ...prev,
                                    [sizeModalOpen]: size
                                  }));
                                }}
                                className={`px-2 sm:px-3 py-2 text-sm font-medium border rounded-lg
                                         transition-all focus:outline-none
                                         ${selectedSizes[sizeModalOpen] === size 
                                           ? 'bg-black text-white border-black shadow-md transform scale-105' 
                                           : 'border-gray-300 text-gray-700 hover:border-indigo-500 hover:text-indigo-500'
                                         }`}
                              >
                                {size}
                              </button>
                            ))}
                          </div>
                          {error && !selectedSizes[sizeModalOpen] && (
                            <p className="text-xs text-red-500 mt-2">Please select a size</p>
                          )}
                        </div>
                        
                        <div className="flex gap-3 mt-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSizeModalOpen(null);
                            }}
                            className="flex-1 py-2.5 relative text-[#B252FF] hover:text-[#F777F7] text-sm font-medium
                                     rounded-lg transition-colors duration-200 bg-white
                                     before:absolute before:inset-0 before:rounded-lg before:p-[1px]
                                     before:bg-gradient-to-r before:from-[#B252FF] before:to-[#F777F7]
                                     before:content-[''] before:-z-10"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(sizeModalOpen);
                            }}
                            disabled={!selectedSizes[sizeModalOpen] || addingToCart === sizeModalOpen}
                            className="flex-1 py-2.5 bg-gradient-to-r from-[#B252FF] to-[#F777F7] text-white text-sm font-medium
                                     rounded-lg hover:opacity-90 transition-opacity duration-200
                                     disabled:opacity-50 disabled:cursor-not-allowed flex items-center
                                     justify-center gap-2"
                          >
                            {addingToCart === sizeModalOpen ? (
                              'Adding...'
                            ) : (
                              <>
                                <ShoppingBag className="w-4 h-4" />
                                Add to Cart
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Friend Circle Share Modal */}
      {selectedDressForShare && (
        <ShareWithFriends
          isOpen={shareModalOpen}
          onClose={() => {
            setShareModalOpen(false);
            setSelectedDressForShare(null);
          }}
          itemId={selectedDressForShare.id}
          itemName={selectedDressForShare.name}
          itemImage={selectedDressForShare.image_url}
          onSuccess={() => {
            toast.success(`${selectedDressForShare.name} shared with your friends!`);
          }}
        />
      )}
    </div>
  );
}
