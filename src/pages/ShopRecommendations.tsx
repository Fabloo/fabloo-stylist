import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProductFilters } from '../components/ProductFilters';
import { ProductFilter, Product } from '../lib/api/products';
import { supabase } from '../lib/supabase';
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react';

export function ShopRecommendations() {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ProductFilter>({});
  const [showFilters, setShowFilters] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 10000 });

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get user's skin tone and body shape from localStorage
        const skinTone = localStorage.getItem('skinTone');
        const bodyShape = localStorage.getItem('bodyShape');

        if (!skinTone || !bodyShape) {
          setError('Please complete your profile to get recommendations');
          return;
        }

        const parsedSkinTone = JSON.parse(skinTone);
        const parsedBodyShape = JSON.parse(bodyShape);

        // Fetch recommendations based on user's profile
        const { data, error: fetchError } = await supabase
          .from('inventory_items')
          .select(`
            *,
            brand:brand_id (
              id,
              Name
            ),
            item_attributes (
              body_shapes,
              color_tones,
              dress_type
            )
          `)
          .contains('item_attributes->body_shapes', [parsedBodyShape.shape])
          .contains('item_attributes->color_tones', [parsedSkinTone.undertone]);

        if (fetchError) throw fetchError;
        setRecommendations(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch recommendations');
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  const filteredRecommendations = recommendations.filter((item) => {
    // Apply body shape filter
    if (
      filters.body_shapes && 
      Array.isArray(filters.body_shapes) && 
      filters.body_shapes.length > 0 && 
      !item.item_attributes?.body_shapes?.some((shape) => 
        filters.body_shapes?.includes(shape)
      )
    ) {
      return false;
    }

    // Apply color tone filter
    if (
      filters.color_tones && 
      Array.isArray(filters.color_tones) && 
      filters.color_tones.length > 0 && 
      !item.item_attributes?.color_tones?.some((tone) => 
        filters.color_tones?.includes(tone)
      )
    ) {
      return false;
    }

    // Apply dress type filter
    if (
      filters.dress_type && 
      Array.isArray(filters.dress_type) && 
      filters.dress_type.length > 0 && 
      !item.item_attributes?.dress_type?.some((type) => 
        filters.dress_type?.includes(type)
      )
    ) {
      return false;
    }

    // Apply price range filter
    if (typeof filters.minPrice === 'number' && item.price < filters.minPrice) {
      return false;
    }
    if (typeof filters.maxPrice === 'number' && item.price > filters.maxPrice) {
      return false;
    }

    return true;
  });

  const filterOptions = {
    brand_name: ['Brand 1', 'Brand 2', 'Brand 3'], // This will be populated from your data
    fabric: ['Cotton', 'Silk', 'Polyester', 'Linen', 'Chiffon'],
    length: ['Mini', 'Midi', 'Maxi', 'Knee Length'],
    color: ['Black', 'White', 'Red', 'Blue', 'Green', 'Purple'],
    pattern: ['Solid', 'Printed', 'Floral', 'Striped', 'Checked'],
    neck: ['V-Neck', 'Round Neck', 'Square Neck', 'Boat Neck'],
    occasion: ['Casual', 'Party', 'Formal', 'Wedding', 'Beach'],
    print: ['Floral', 'Abstract', 'Geometric', 'Animal', 'None'],
    shape: ['A-Line', 'Straight', 'Fit and Flare', 'Bodycon', 'Empire'],
    sleeve_length: ['Sleeveless', 'Short', '3/4th', 'Full'],
    sleeve_styling: ['Regular', 'Puff', 'Bell', 'Cap', 'Kimono']
  };

  return (
    <>
      <div className="container mx-auto px-4 py-8 pb-20">
        {/* Analysis Result Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Your analysis result</h2>
          <p className="text-gray-600">View your body shape and skin tone analysis</p>
          <div className="flex justify-center mt-4">
            <button
              className="w-[164px] flex items-center justify-center gap-1.5 py-2.5
                       bg-gradient-to-r from-[#B252FF] to-[#F777F7] text-white text-sm font-medium 
                       rounded-lg hover:opacity-90 transition-opacity duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="font-medium">View More</span>
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Section */}
        <div className="w-full mb-8">
          {/* Remove the ProductFilters component since we're using our own filter button and modal */}
        </div>

        {/* AI Stylist Recommended Picks Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-6">AI Stylist Recommended Picks</h2>
          <div className="flex gap-4 mb-6">
            <button className="px-4 py-2 bg-purple-600 text-white rounded-full">All</button>
            <button className="px-4 py-2 bg-white text-gray-700 rounded-full">By Color Palette</button>
            <button className="px-4 py-2 bg-white text-gray-700 rounded-full">By Body Shape</button>
          </div>
        </div>

        {/* Recommendations Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500">{error}</p>
            </div>
          ) : filteredRecommendations.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No recommendations found matching your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredRecommendations.map((item) => (
                <div
                  key={item.id}
                  className="group cursor-pointer"
                  onClick={() => navigate(`/product/${item.id}`)}
                >
                  <div className="relative aspect-square overflow-hidden rounded-lg">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {item.image_url_2 && (
                      <img
                        src={item.image_url_2}
                        alt={item.name}
                        className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      />
                    )}
                  </div>
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-900">{item.name}</h3>
                    <p className="mt-1 text-sm text-gray-500">{item.brand?.Name}</p>
                    <p className="mt-1 text-sm font-medium text-gray-900">₹{item.price}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.item_attributes?.body_shapes?.map((shape) => (
                        <span
                          key={shape}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                        >
                          {shape}
                        </span>
                      ))}
                      {item.item_attributes?.color_tones?.map((tone) => (
                        <span
                          key={tone}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                        >
                          {tone}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 mb-20">
        {/* ... existing content sections ... */}
      </div>

      {/* Simplified Sticky Filter Button */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t shadow-md" style={{ zIndex: 50 }}>
        <div className="container mx-auto px-4 py-4">
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full bg-purple-600 text-white px-6 py-3 rounded-full shadow-lg 
                     flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors"
          >
            <SlidersHorizontal size={20} />
            <span>Filter {Object.keys(filters).length > 0 ? `(${Object.keys(filters).length})` : ''}</span>
          </button>
        </div>
      </div>

      {/* Simplified Filter Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50" style={{ zIndex: 100 }}>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              <div className="relative bg-white rounded-lg w-full max-w-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold">Filters</h3>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-6 max-h-[60vh] overflow-y-auto">
                  {/* Price Range */}
                  <div>
                    <h4 className="font-medium mb-3">Price Range</h4>
                    <div className="flex gap-4">
                      <input
                        type="number"
                        placeholder="Min"
                        value={priceRange.min}
                        onChange={(e) => setPriceRange({ ...priceRange, min: Number(e.target.value) })}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={priceRange.max}
                        onChange={(e) => setPriceRange({ ...priceRange, max: Number(e.target.value) })}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Filter Options */}
                  {Object.entries(filterOptions).map(([category, options]) => (
                    <div key={category}>
                      <h4 className="font-medium mb-3 capitalize">{category.replace('_', ' ')}</h4>
                      <div className="flex flex-wrap gap-2">
                        {options.map((option) => (
                          <button
                            key={option}
                            onClick={() => {
                              const currentFilters = filters[category] || [];
                              const newFilters = currentFilters.includes(option)
                                ? currentFilters.filter(f => f !== option)
                                : [...currentFilters, option];
                              setFilters({ ...filters, [category]: newFilters });
                            }}
                            className={`px-3 py-1.5 rounded-full text-sm ${
                              filters[category]?.includes(option)
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="sticky bottom-0 left-0 right-0 bg-white pt-4 mt-6 border-t">
                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        setFilters({});
                        setPriceRange({ min: 0, max: 10000 });
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Clear All
                    </button>
                    <button
                      onClick={() => {
                        setFilters({ ...filters, minPrice: priceRange.min, maxPrice: priceRange.max });
                        setIsModalOpen(false);
                      }}
                      className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 