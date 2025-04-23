import React, { useState, useEffect } from 'react';
import { ProductFilters } from '../components/ProductFilters';
import { ProductGrid } from '../components/ProductGrid';
import { ProductFilter, getFilteredProducts } from '../lib/api/products';

export function ProductsPage() {
  const [filters, setFilters] = useState<ProductFilter>({});
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getFilteredProducts(filters);
        setProducts(result.products);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [filters]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Mobile Filter Button */}
        <div className="md:hidden">
          <button
            onClick={() => {
              const filterPanel = document.getElementById('filter-panel');
              if (filterPanel) {
                filterPanel.classList.toggle('hidden');
              }
            }}
            className="w-full px-4 py-2 bg-black text-white rounded-lg"
          >
            Show Filters
          </button>
        </div>

        {/* Filter Panel */}
        <div
          id="filter-panel"
          className="hidden md:block md:w-64 flex-shrink-0"
        >
          <ProductFilters
            activeFilters={filters}
            onFilterChange={setFilters}
          />
        </div>

        {/* Product Grid */}
        <div className="flex-1">
          {error && (
            <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          <ProductGrid products={products} loading={loading} />
        </div>
      </div>
    </div>
  );
} 