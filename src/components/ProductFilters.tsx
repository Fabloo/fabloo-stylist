import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, X, SlidersHorizontal } from 'lucide-react';
import { ProductFilter, getFilterOptions } from '../lib/api/products';

interface FilterSection {
  title: string;
  key: keyof ProductFilter;
  options: string[];
  type: 'checkbox' | 'radio' | 'range';
}

interface ProductFiltersProps {
  onFilterChange: (filters: ProductFilter) => void;
  activeFilters: ProductFilter;
  className?: string;
}

export function ProductFilters({ onFilterChange, activeFilters, className = '' }: ProductFiltersProps) {
  const [filterOptions, setFilterOptions] = useState<Record<string, string[]>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 10000 });
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const options = await getFilterOptions();
        setFilterOptions(options);
      } catch (error) {
        console.error('Failed to fetch filter options:', error);
      }
    };

    fetchFilterOptions();
  }, []);

  const filterSections: FilterSection[] = [
    { title: 'Brand', key: 'brand_id', options: filterOptions.brand_id || [], type: 'checkbox' },
    { title: 'Price Range', key: 'minPrice', options: [], type: 'range' },
    { title: 'Fabric', key: 'fabric', options: filterOptions.fabric || [], type: 'checkbox' },
    { title: 'Length', key: 'length', options: filterOptions.length || [], type: 'checkbox' },
    { title: 'Primary Colour', key: 'primary_colour', options: filterOptions.primary_colour || [], type: 'checkbox' },
    { title: 'Pattern', key: 'pattern', options: filterOptions.pattern || [], type: 'checkbox' },
    { title: 'Neck', key: 'neck', options: filterOptions.neck || [], type: 'checkbox' },
    { title: 'Occasion', key: 'occasion', options: filterOptions.occasion || [], type: 'checkbox' },
    { title: 'Print', key: 'print', options: filterOptions.print || [], type: 'checkbox' },
    { title: 'Shape', key: 'shape', options: filterOptions.shape || [], type: 'checkbox' },
    { title: 'Sleeve Length', key: 'sleeve_length', options: filterOptions.sleeve_length || [], type: 'checkbox' },
    { title: 'Sleeve Styling', key: 'sleeve_styling', options: filterOptions.sleeve_styling || [], type: 'checkbox' }
  ];

  const toggleSection = (title: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const handleFilterChange = (key: keyof ProductFilter, value: any) => {
    if (key === 'minPrice' || key === 'maxPrice') {
      onFilterChange({
        ...activeFilters,
        [key]: value
      });
    } else {
      onFilterChange({
        ...activeFilters,
        [key]: value
      });
    }
  };

  const handlePriceRangeChange = (type: 'min' | 'max', value: number) => {
    const newRange = { ...priceRange, [type]: value };
    setPriceRange(newRange);
    onFilterChange({
      ...activeFilters,
      minPrice: newRange.min,
      maxPrice: newRange.max
    });
  };

  const clearFilter = (key: keyof ProductFilter) => {
    const newFilters = { ...activeFilters };
    if (key === 'minPrice' || key === 'maxPrice') {
      delete newFilters.minPrice;
      delete newFilters.maxPrice;
      setPriceRange({ min: 0, max: 10000 });
    } else {
      delete newFilters[key];
    }
    onFilterChange(newFilters);
  };

  const clearAllFilters = () => {
    onFilterChange({});
    setPriceRange({ min: 0, max: 10000 });
  };

  return (
    <>
      {/* Desktop Filter Panel */}
      <div className={`hidden md:block bg-white p-4 rounded-lg shadow-sm ${className}`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Filters</h2>
          <button
            onClick={clearAllFilters}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear All
          </button>
        </div>

        {/* Active Filters */}
        {Object.entries(activeFilters).length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-2">Active Filters:</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(activeFilters).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => clearFilter(key as keyof ProductFilter)}
                  className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-sm"
                >
                  <span>{key}: {Array.isArray(value) ? value.join(', ') : value}</span>
                  <X size={14} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filter Sections */}
        <div className="space-y-4">
          {filterSections.map(section => (
            <div key={section.title} className="border-b pb-4">
              <button
                onClick={() => toggleSection(section.title)}
                className="w-full flex justify-between items-center py-2"
              >
                <span className="font-medium">{section.title}</span>
                {expandedSections[section.title] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {expandedSections[section.title] && (
                <div className="mt-2 space-y-2">
                  {section.type === 'range' ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={priceRange.min}
                          onChange={(e) => handlePriceRangeChange('min', Number(e.target.value))}
                          className="w-24 px-2 py-1 border rounded"
                          placeholder="Min"
                        />
                        <input
                          type="number"
                          value={priceRange.max}
                          onChange={(e) => handlePriceRangeChange('max', Number(e.target.value))}
                          className="w-24 px-2 py-1 border rounded"
                          placeholder="Max"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto">
                      {section.options.map(option => (
                        <label key={option} className="flex items-center gap-2 py-1">
                          <input
                            type="checkbox"
                            checked={Array.isArray(activeFilters[section.key]) && 
                              (activeFilters[section.key] as string[])?.includes(option)}
                            onChange={(e) => {
                              const currentValues = (activeFilters[section.key] as string[]) || [];
                              const newValues = e.target.checked
                                ? [...currentValues, option]
                                : currentValues.filter(v => v !== option);
                              handleFilterChange(section.key, newValues);
                            }}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm">{option}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Filter Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="md:hidden fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 
                 bg-purple-600 text-white px-6 py-3 rounded-full shadow-lg 
                 flex items-center gap-2 hover:bg-purple-700 transition-colors"
      >
        <SlidersHorizontal size={20} />
        <span>Filters {Object.keys(activeFilters).length > 0 && `(${Object.keys(activeFilters).length})`}</span>
      </button>

      {/* Mobile Filter Modal */}
      {isModalOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsModalOpen(false)} />
          <div className="fixed inset-x-0 bottom-0 bg-white rounded-t-2xl p-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Filters</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2">
                <X size={24} />
              </button>
            </div>

            {/* Active Filters */}
            {Object.entries(activeFilters).length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium mb-2">Active Filters:</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(activeFilters).map(([key, value]) => (
                    <button
                      key={key}
                      onClick={() => clearFilter(key as keyof ProductFilter)}
                      className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-sm"
                    >
                      <span>{key}: {Array.isArray(value) ? value.join(', ') : value}</span>
                      <X size={14} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Filter Sections */}
            <div className="space-y-4">
              {filterSections.map(section => (
                <div key={section.title} className="border-b pb-4">
                  <button
                    onClick={() => toggleSection(section.title)}
                    className="w-full flex justify-between items-center py-2"
                  >
                    <span className="font-medium">{section.title}</span>
                    {expandedSections[section.title] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {expandedSections[section.title] && (
                    <div className="mt-2 space-y-2">
                      {section.type === 'range' ? (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="number"
                              value={priceRange.min}
                              onChange={(e) => handlePriceRangeChange('min', Number(e.target.value))}
                              className="w-24 px-2 py-1 border rounded"
                              placeholder="Min"
                            />
                            <input
                              type="number"
                              value={priceRange.max}
                              onChange={(e) => handlePriceRangeChange('max', Number(e.target.value))}
                              className="w-24 px-2 py-1 border rounded"
                              placeholder="Max"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="max-h-48 overflow-y-auto">
                          {section.options.map(option => (
                            <label key={option} className="flex items-center gap-2 py-1">
                              <input
                                type="checkbox"
                                checked={Array.isArray(activeFilters[section.key]) && 
                                  (activeFilters[section.key] as string[])?.includes(option)}
                                onChange={(e) => {
                                  const currentValues = (activeFilters[section.key] as string[]) || [];
                                  const newValues = e.target.checked
                                    ? [...currentValues, option]
                                    : currentValues.filter(v => v !== option);
                                  handleFilterChange(section.key, newValues);
                                }}
                                className="rounded border-gray-300"
                              />
                              <span className="text-sm">{option}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Apply Filters Button */}
            <div className="sticky bottom-0 left-0 right-0 p-4 bg-white border-t mt-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 