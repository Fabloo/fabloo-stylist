import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Heart, ArrowLeft } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

type Props = {
  id: string;
  onClose: () => void;
};

export function ProductDetail({ id, onClose }: Props) {
  const [product, setProduct] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [addingToCart, setAddingToCart] = React.useState(false);

  React.useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('inventory_items')
        .select(`
          *,
          item_attributes (
            body_shapes,
            color_tones,
            dress_type
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setProduct(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async () => {
    try {
      setAddingToCart(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Please sign in to add items to cart');

      const { error } = await supabase
        .from('cart_items')
        .upsert({
          user_id: user.id,
          item_id: id,
          quantity: 1
        }, {
          onConflict: '(user_id, item_id)'
        });

      if (error) throw error;
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600">{error || 'Product not found'}</p>
        <button
          onClick={onClose}
          className="mt-4 text-indigo-600 hover:text-indigo-700"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="relative bg-white rounded-xl overflow-hidden">
      <button
        onClick={onClose}
        className="absolute top-4 left-4 p-2 rounded-full bg-white shadow-md
                 hover:bg-gray-50 transition-colors z-10"
      >
        <ArrowLeft className="w-5 h-5 text-gray-600" />
      </button>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Image Section */}
        <div className="relative aspect-square">
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Product Details */}
        <div className="p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h1>
          <p className="text-3xl font-bold text-gray-900 mb-6">₹{product.price}</p>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Description</h3>
              <p className="text-gray-600">{product.description}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Perfect For</h3>
              <div className="flex flex-wrap gap-2">
                {product.item_attributes?.body_shapes?.map((shape: string) => (
                  <span
                    key={shape}
                    className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm"
                  >
                    {shape}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Color Tones</h3>
              <div className="flex flex-wrap gap-2">
                {product.item_attributes?.color_tones?.map((tone: string) => (
                  <span
                    key={tone}
                    className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm"
                  >
                    {tone}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-6 space-y-4">
              <button
                onClick={addToCart}
                disabled={addingToCart || product.stock <= 0}
                className="w-full flex items-center justify-center gap-2 py-3 px-8
                         bg-indigo-600 text-white rounded-full font-medium
                         hover:bg-indigo-700 transition-colors disabled:opacity-50
                         disabled:cursor-not-allowed"
              >
                <ShoppingBag className="w-5 h-5" />
                {product.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
              </button>

              <button
                className="w-full flex items-center justify-center gap-2 py-3 px-8
                         border-2 border-gray-200 rounded-full font-medium text-gray-700
                         hover:border-gray-300 transition-colors"
              >
                <Heart className="w-5 h-5" />
                Add to Wishlist
              </button>
            </div>

            {error && (
              <p className="text-red-600 text-sm text-center">{error}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}