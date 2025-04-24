import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProductFilters } from '../components/ProductFilters';
import { ProductFilter, Product } from '../lib/api/products';
import { supabase } from '../lib/supabase';
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react';

// Define types for filter options and categories
interface FilterOptions {
  brand_name: string[];
  fabric: string[];
  length: string[];
  color: string[];
  pattern: string[];
  neck: string[];
  occasion: string[];
  print: string[];
  shape: string[];
  sleeve_length: string[];
  sleeve_styling: string[];
  body_shapes: string[];
  color_tones: string[];
  dress_type: string[];
}

interface PriceRange {
  min: number;
  max: number;
}

export function ShopRecommendations() {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Partial<FilterOptions>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [priceRange, setPriceRange] = useState<PriceRange>({ min: 0, max: 10000 });

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
            brands:inventory_items_brand_id_fkey (
              id,
              Name,
              logo,
              return_policy,
              delivery_time
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
        
        // Transform the data to include brand name
        const transformedData = data?.map(item => {
          console.log('Raw item data:', item); // Debug log for raw item
          return {
            ...item,
            brand: item.brands // Map the brands data to brand property
          };
        }) || [];

        console.log('Transformed data:', transformedData); // Debug log for transformed data
        setRecommendations(transformedData);
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
      filters.body_shapes.length > 0 && 
      item.item_attributes?.body_shapes && 
      !item.item_attributes.body_shapes.some((shape: string) => 
        filters.body_shapes?.includes(shape)
      )
    ) {
      return false;
    }

    // Apply color tone filter
    if (
      filters.color_tones && 
      filters.color_tones.length > 0 && 
      item.item_attributes?.color_tones && 
      !item.item_attributes.color_tones.some((tone: string) => 
        filters.color_tones?.includes(tone)
      )
    ) {
      return false;
    }

    // Apply dress type filter
    if (
      filters.dress_type && 
      filters.dress_type.length > 0 && 
      item.item_attributes?.dress_type && 
      !item.item_attributes.dress_type.some((type: string) => 
        filters.dress_type?.includes(type)
      )
    ) {
      return false;
    }

    // Apply price range filter
    if (priceRange.min > 0 && item.price < priceRange.min) {
      return false;
    }
    if (priceRange.max < 10000 && item.price > priceRange.max) {
      return false;
    }

    return true;
  });

  const filterOptions: FilterOptions = {
    brand_name: ['Brand 1', 'Brand 2', 'Brand 3'],
    fabric: ['Cotton', 'Silk', 'Polyester', 'Linen', 'Chiffon'],
    length: ['Mini', 'Midi', 'Maxi', 'Knee Length'],
    color: ['Black', 'White', 'Red', 'Blue', 'Green', 'Purple'],
    pattern: ['Solid', 'Printed', 'Floral', 'Striped', 'Checked'],
    neck: ['V-Neck', 'Round Neck', 'Square Neck', 'Boat Neck'],
    occasion: ['Casual', 'Party', 'Formal', 'Wedding', 'Beach'],
    print: ['Floral', 'Abstract', 'Geometric', 'Animal', 'None'],
    shape: ['A-Line', 'Straight', 'Fit and Flare', 'Bodycon', 'Empire'],
    sleeve_length: ['Sleeveless', 'Short', '3/4th', 'Full'],
    sleeve_styling: ['Regular', 'Puff', 'Bell', 'Cap', 'Kimono'],
    body_shapes: [],
    color_tones: [],
    dress_type: []
  };

  // Update the filter button click handler
  const handleFilterClick = (category: keyof FilterOptions, option: string) => {
    const currentFilters = filters[category] || [];
    const newFilters = currentFilters.includes(option)
      ? currentFilters.filter((f: string) => f !== option)
      : [...currentFilters, option];
    setFilters({ ...filters, [category]: newFilters });
  };

  // Apply filters function
  const applyFilters = () => {
    setFilters(prevFilters => ({
      ...prevFilters,
      price: { min: priceRange.min, max: priceRange.max }
    }));
    setIsModalOpen(false);
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
              {filteredRecommendations.map((item) => {
                console.log('Rendering item:', item); // Debug log for rendered item
                return (
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
                    <div className="p-2 sm:p-3 flex flex-col flex-grow">
                      <h4 className="text-[13px] sm:text-[15px] font-medium text-gray-900 mb-1 line-clamp-2 min-h-[32px] sm:min-h-[40px]">
                        {item.name}
                      </h4>
                      <p className="text-[12px] sm:text-[14px] font-medium text-[#BC4BF8] mb-2">
                        {item.brand?.Name}
                      </p>
                      <div className="mt-auto">
                        <div className="flex justify-between items-center mb-2 sm:mb-3">
                          <p className="text-[13px] sm:text-[15px] font-semibold text-gray-900 tracking-tight">₹{item.price}</p>
                        </div>
                        <button className="w-full py-2 sm:py-2.5 bg-gradient-to-r from-[#B252FF] to-[#F777F7] text-white text-xs sm:text-sm font-medium rounded-lg hover:opacity-90 transition-opacity duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="w-3.5 h-3.5 sm:w-4 sm:h-4">
                            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path>
                            <path d="M3 6h18"></path>
                            <path d="M16 10a4 4 0 0 1-8 0"></path>
                          </svg>
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
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
                        {options.map((option: string) => (
                          <button
                            key={option}
                            onClick={() => handleFilterClick(category as keyof FilterOptions, option)}
                            className={`px-3 py-1.5 rounded-full text-sm ${
                              (filters[category as keyof FilterOptions] || []).includes(option)
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
                      onClick={applyFilters}
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