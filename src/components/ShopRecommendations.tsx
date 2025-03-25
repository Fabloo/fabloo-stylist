import React, { useEffect, useState } from 'react';
import { ShoppingBag, Check, AlertCircle, Filter, Sparkles, Palette } from 'lucide-react';
import type { BodyShape, SkinTone } from '../types';
import { getStyleRecommendations } from '../utils/styleRecommendations';
import { useCartStore } from '../store';
import { ProductDetail } from '../pages/ProductDetail';
import { supabase } from '../lib/supabase';
import { useCart } from '../hooks/useCart';
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

  useEffect(() => {
    checkSession();
    const recommendations = getStyleRecommendations(bodyShape, skinTone);
    setColorPalette(recommendations.colors);
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
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add item to cart';
      setError(errorMessage);
      console.error('Error adding to cart:', err);
      setCartSuccess(null);
    } finally {
      setAddingToCart(null);
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
            
            // Split the combined string into an array, trim whitespace, and convert to lowercase
            const bodyShapes = attributes.body_shapes[0].split(',').map((shape: string) => shape.trim().toLowerCase());
            return bodyShapes.includes(bodyShape.toLowerCase());
          });
        } else if (filterType === 'color') {
          filteredDresses = data.filter(item => {
            if (!item.item_attributes || !Array.isArray(item.item_attributes)) return false;
            const attributes = item.item_attributes[0];
            if (!attributes || !attributes.color_tones) return false;
            
            // Split the combined string into an array, trim whitespace, and convert to lowercase
            const colorTones = attributes.color_tones[0].split(';').map((tone: string) => tone.trim().toLowerCase());
            return colorTones.includes(skinTone.season.toLowerCase());
          });
        } else {
          // For 'all' filter type
          filteredDresses = data.filter(item => {
            if (!item.item_attributes || !Array.isArray(item.item_attributes)) return false;
            const attributes = item.item_attributes[0];
            if (!attributes || !attributes.body_shapes || !attributes.color_tones) return false;
            
            const bodyShapes = attributes.body_shapes[0].split(',').map((shape: string) => shape.trim().toLowerCase());
            const colorTones = attributes.color_tones[0].split(',').map((tone: string) => tone.trim().toLowerCase());
            return bodyShapes.includes(bodyShape.toLowerCase()) && colorTones.includes(skinTone.season.toLowerCase());
          });
        }
        console.log(filteredDresses);

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
  }, [bodyShape, skinTone]);

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

   console.log(dresses);

  return (
    <div className="bg-white p-4 md:p-6">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            AI Stylist Recommended Picks
          </h3>
          
          <div className="flex items-center gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'style' | 'color')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 
                       focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">All Recommendations</option>
              <option value="style">By Body Shape</option>
              <option value="color">By Color Palette</option>
            </select>
          </div>
        </div>



        {/* Silhouette Recommendations */}
        <div className="mb-12">
          {/* <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
              {filterType === 'color' ? (
                <>
                  <Palette className="w-4 h-4 text-indigo-500" />
                  Colors That Complement Your Tone
                </>
              ) : (
                <>
                  <Filter className="w-4 h-4 text-indigo-500" />
                  Silhouettes That Celebrate Your Shape
                </>
              )}
            </h4>
            <p className="text-sm text-gray-600">
              {filterType === 'color' 
                ? `Perfect for ${skinTone.name}`
                : `Ideal for ${bodyShape} body type`}
            </p>
          </div> */}
          
          {/* Color Palette Display */}
          {(filterType === 'color' || filterType === 'all') && colorPalette && (
            <div className="mb-8">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <h5 className="text-xs font-medium text-gray-500 mb-2">Primary Colors</h5>
                  <div className="flex gap-2">
                    {colorPalette.primary.map((color: string, i: number) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full shadow-sm"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <h5 className="text-xs font-medium text-gray-500 mb-2">Accent Colors</h5>
                  <div className="flex gap-2">
                    {colorPalette.accent.map((color: string, i: number) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full shadow-sm"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <h5 className="text-xs font-medium text-gray-500 mb-2">Neutral Colors</h5>
                  <div className="flex gap-2">
                    {colorPalette.neutral.map((color: string, i: number) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full shadow-sm"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <p className="mb-2">How to use your color palette:</p>
                <ul className="list-disc list-inside space-y-1 pl-4">
                  <li>Primary colors: Use for main pieces like dresses and tops</li>
                  <li>Accent colors: Perfect for accessories and statement pieces</li>
                  <li>Neutral colors: Great for basics and layering pieces</li>
                </ul>
              </div>
            </div>
          )}
          

          {
            (filterType === 'style' || filterType === 'all') && (
              <div className="flex justify-center">
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
              alt={`${bodyShape} body shape silhouette`}
              className="h-28 opacity-90"
            />
          </div>
            )
          }
        </div>
      </div>



      {/* {
        filterType === 'color' && (
          <div className="mt-8 flex flex-col items-center space-y-6">
            <h4 className="text-sm font-medium text-gray-900">Shades That Shine on You</h4>
            <div className="flex items-center gap-3">
              {[...colorPalette.primary, ...colorPalette.accent, ...colorPalette.neutral].slice(0, 7).map((color: string, i: number) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full shadow-sm transition-transform hover:scale-110"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
        )
      } */}

<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-8">
        {dresses.length === 0 && (
          <div className="col-span-full text-center py-8">
            <p className="text-gray-600">No matching dresses found for your style profile.</p>
          </div>
        )}
        {dresses.slice(0, visibleCount).map((dress) => (
          <div
            key={dress.id}
            className="group relative bg-white cursor-pointer rounded-lg overflow-hidden
                       hover:shadow-lg transition-shadow duration-200 flex flex-col"
            onClick={() => setSelectedProduct(dress.id)}
          >
            <div className="aspect-[3/4] overflow-hidden relative">
              <img 
                src={dress.image_url}
                alt={dress.name}
                className="w-full h-full object-cover transform group-hover:scale-105
                           transition-transform duration-200"
              />
              {dress.stock < 5 && dress.stock > 0 && (
                <span className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1
                                 text-xs font-medium rounded">
                  Only {dress.stock} left
                </span>
              )}
            </div>
            <div className="p-4 flex flex-col flex-grow">
              <h4 className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
                {dress.name}
              </h4>
              {/* <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {dress.description}
              </p> */}
              
              <div className="mt-auto">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-lg font-semibold text-gray-900">₹{dress.price}</p>
                  {/* <p className="text-sm text-gray-500">
                    {dress.stock} in stock
                  </p> */}
                </div>

                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-600 mb-2">Select Size:</p>
                  {/* Mobile Dropdown */}
                  <div className="md:hidden">
                    <select
                      value={selectedSizes[dress.id] || ''}
                      onChange={(e) => {
                        setSelectedSizes(prev => ({
                          ...prev,
                          [dress.id]: e.target.value
                        }));
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                               focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select a size</option>
                      {(typeof dress.sizes === 'string' ? JSON.parse(dress.sizes) : dress.sizes)?.map((size: string) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Desktop Buttons */}
                  <div className="hidden md:flex flex-wrap gap-2">
                    {(typeof dress.sizes === 'string' ? JSON.parse(dress.sizes) : dress.sizes)?.map((size: string) => (
                      <button
                        key={size}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSizes(prev => ({
                            ...prev,
                            [dress.id]: size
                          }));
                        }}
                        className={`px-3 py-1 text-xs font-medium border rounded-full
                                 transition-colors focus:outline-none focus:ring-2 
                                 focus:ring-indigo-500 focus:ring-offset-1
                                 ${selectedSizes[dress.id] === size 
                                   ? 'bg-indigo-600 text-white border-indigo-600' 
                                   : 'border-gray-200 text-gray-600 hover:border-indigo-500 hover:text-indigo-500'
                                 }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                  {error && !selectedSizes[dress.id] && (
                    <p className="text-xs text-red-500 mt-1">Please select a size</p>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!selectedSizes[dress.id]) {
                      setError('Please select a size');
                      return;
                    }
                    addToCart(dress.id);
                  }}
                  disabled={addingToCart === dress.id || !isAuthenticated || !selectedSizes[dress.id]}
                  className={`w-full py-2.5 ${!selectedSizes[dress.id] ? 'bg-indigo-300' : 'bg-indigo-600'} text-white text-sm font-medium
                           rounded-lg hover:bg-indigo-700 transition-colors duration-200
                           disabled:opacity-50 disabled:cursor-not-allowed flex items-center
                           justify-center gap-2 shadow-sm`}
                >
                  {addingToCart === dress.id ? (
                    'Adding...'
                  ) : cartSuccess === dress.id ? (
                    <>
                      <Check className="w-4 h-4" />
                      Added!
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      {isAuthenticated ? 'Add to Cart' : 'Sign in to Add'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Load More Button */}
      {visibleCount < dresses.length && (
        <div className="flex justify-center mt-8">
          <button
            onClick={() => setVisibleCount(prev => prev + 8)}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
          >
            Load More
          </button>
        </div>
      )}



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
    </div>
  );
}