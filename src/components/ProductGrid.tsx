import React from 'react';
import { Product } from '../lib/api/products';
import { useNavigate } from 'react-router-dom';

interface ProductGridProps {
  products: Product[];
  loading: boolean;
}

export function ProductGrid({ products, loading }: ProductGridProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No products found matching your filters.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => (
        <div
          key={product.id}
          className="group cursor-pointer"
          onClick={() => navigate(`/product/${product.id}`)}
        >
          <div className="relative aspect-square overflow-hidden rounded-lg">
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {product.image_url_2 && (
              <img
                src={product.image_url_2}
                alt={product.name}
                className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              />
            )}
          </div>
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-900">{product.name}</h3>
            <p className="mt-1 text-sm text-gray-500">{product.brand?.Name}</p>
            <p className="mt-1 text-sm font-medium text-gray-900">₹{product.price}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {product.item_attributes?.body_shapes?.map((shape) => (
                <span
                  key={shape}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                >
                  {shape}
                </span>
              ))}
              {product.item_attributes?.color_tones?.map((tone) => (
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
  );
} 