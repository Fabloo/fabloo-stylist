import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { ShoppingBag, Check, AlertCircle, Filter, Sparkles, Palette, Share2, Heart } from 'lucide-react';
import type { BodyShape, SkinTone } from '../types';
import { getStyleRecommendations } from '../utils/styleRecommendations';
import { useCartStore } from '../store';
import { ProductDetail } from '../pages/ProductDetail';
import { supabase } from '../lib/supabase';
import { useCart } from '../hooks/useCart';
import { PieChart, Pie, Cell, Tooltip, TooltipProps } from "recharts";
import { useWishlist } from '../hooks/useWishlist';
import { toast } from 'react-toastify';
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
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(8);
  const { addToCart: addToCartStore } = useCartStore();
  const { fetchCart } = useCart();
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [cartSuccess, setCartSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'style' | 'color'>('all');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [colorPalette, setColorPalette] = useState<any>(null);
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
  const [sizeModalOpen, setSizeModalOpen] = useState<string | null>(null);
  const [isAnalysisExpanded, setIsAnalysisExpanded] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement | null>(null);
  const { addToWishlist, refreshWishlist, wishlistItems: currentWishlistItems } = useWishlist();
  
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
    const selectedSkinTone = skinTones.find((tone) => tone.name === skinTone.name);
    if (selectedSkinTone) {
      setColorPalette({
        primary: selectedSkinTone.shades.slice(0, 4),
        accent: selectedSkinTone.shades.slice(4, 8),
        neutral: selectedSkinTone.shades.slice(8, 12)
      });
    }
  }, []);

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

  const handleShare = async (dress: DressItem) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: dress.name,
          text: `Check out this ${dress.name} from Fabloo Stylist!`,
          url: window.location.href
        });
      } else {
        // Fallback for browsers that don't support Web Share API
        const shareUrl = window.location.href;
        await navigator.clipboard.writeText(shareUrl);
        setCartSuccess('Link copied to clipboard!');
        setTimeout(() => setCartSuccess(null), 2000);
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  useEffect(() => {
    async function fetchRecommendations() {
      try {
        // First, get all inventory items with their attributes
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

        // Add debug logging
        console.log('Body Shape Search:', bodyShape);
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
  }, [bodyShape, skinTone, filterType]);

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

  return (
    <div className="bg-white w-full h-full relative overflow-hidden">
      <div className="w-full mx-auto mt-8 flex flex-col items-center px-4">
        {/* AI Stylist Recommendations Section */}
        <div className="w-full bg-white shadow-lg rounded-lg p-3 max-w-3xl">
          <div className="text-center text-[#212121] text-[24px] font-semibold leading-[24px]  font-poppins mb-3">
            AI Stylist Recommended Picks
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-3">
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
                  ? 'https://res.cloudinary.com/dofgnvgo6/image/upload/v1738252491/Screenshot_2025-01-30_at_9.24.43_PM_oy2vhp.png'           
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
      </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 gap-2 sm:gap-6 mt-4 w-full max-w-3xl px-2 sm:px-0">
        {dresses.slice(0, visibleCount).map((dress) => (
            <div key={dress.id} className="group relative bg-white rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-200 flex flex-col">
            <div className="aspect-[3/4] overflow-hidden relative" style={{ minHeight: '200px' }}>
              <img 
                src={dress.image_url}
                alt={dress.name}
                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-200"
                style={{ position: 'absolute', top: '0', left: '0', width: '100%', height: '100%' }}
              />
              <div className="absolute top-2 right-2 flex gap-1.5">
                <button
                  onClick={() => handleShare(dress)}
                  className="bg-white/90 backdrop-blur-sm rounded-full p-1.5 hover:bg-white transition-colors duration-200 shadow-sm"
                >
                  <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <button
                  onClick={() => handleWishlist(dress)}
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
      </div>

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
                                onClick={() => {
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
                            onClick={() => setSizeModalOpen(null)}
                            className="flex-1 py-2.5 relative text-[#B252FF] hover:text-[#F777F7] text-sm font-medium
                                     rounded-lg transition-colors duration-200 bg-white
                                     before:absolute before:inset-0 before:rounded-lg before:p-[1px]
                                     before:bg-gradient-to-r before:from-[#B252FF] before:to-[#F777F7]
                                     before:content-[''] before:-z-10"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => addToCart(sizeModalOpen)}
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
    </div>
  );
}
