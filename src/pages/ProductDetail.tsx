import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ShoppingBag, Heart, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { useCart } from '../hooks/useCart';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

type Props = {
  id?: string;
  onClose?: () => void;
};

export function ProductDetail({ id: propId, onClose: propOnClose }: Props) {
  const { id: urlId } = useParams();
  const navigate = useNavigate();
  const id = propId || urlId;
  const onClose = propOnClose || (() => navigate(-1));
  const { fetchCart } = useCart();
  const [product, setProduct] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [addingToCart, setAddingToCart] = React.useState(false);
  const [cartSuccess, setCartSuccess] = React.useState<string | null>(null);
  const [wishlistSuccess, setWishlistSuccess] = React.useState<string | null>(null);
  const [addingToWishlist, setAddingToWishlist] = React.useState(false);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [selectedImage, setSelectedImage] = React.useState<string>('');
  const [selectedSize, setSelectedSize] = React.useState<string>('');
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);

  const checkSession = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      setIsAuthenticated(!!session && !sessionError);
    } catch (err) {
      console.error('Session check error:', err);
      setIsAuthenticated(false);
    }
  };


  React.useEffect(() => {
    if (!id) return;
    fetchProduct();
    checkSession();
    
    // Track Detail page view event
    window.gtag('event', 'Detail page click', {
      'event_category': 'Funnel',
      'event_label': 'Detail page click'
    });
  }, [id]);

  React.useEffect(() => {
    if (product) {
      setSelectedImage(product.image_url);
    }
  }, [product]);

  const fetchProduct = async () => {
    if (!id) {
      setError('Product ID is required');
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('inventory_items')
        .select(`
          *,
          brands!inventory_items_brand_id_fkey (
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

  // const addToCart = async () => {
  //   try {
  //     setAddingToCart(true);
  //     const { data: { user }, error: userError } = await supabase.auth.getUser();
  //     if (userError) throw userError;
  //     if (!user) throw new Error('Please sign in to add items to cart');

  //     const { error } = await supabase
  //       .from('cart_items')
  //       .upsert({
  //         user_id: user.id,
  //         item_id: id,
  //         quantity: 1
  //       }, {
  //         onConflict: '(user_id, item_id)'
  //       });

  //     if (error) throw error;
  //     onClose();
  //   } catch (err) {
  //     setError(err instanceof Error ? err.message : 'Failed to add to cart');
  //   } finally {
  //     setAddingToCart(false);
  //   }
  // };

  const addToCart = async (itemId: string | undefined) => {
    if (!itemId) {
      setError('Product ID is required');
      return;
    }

    try {
      // Track Cart event
      window.gtag('event', 'Cart', {
        'event_category': 'Funnel',
        'event_label': 'Cart'
      });

      if (!isAuthenticated) {
        throw new Error('Please sign in to continue');
      }

      if (!selectedSize) {
        throw new Error('Please select a size');
      }

      setAddingToCart(true);
      setError(null);
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
            size_selected: selectedSize
          },
          { onConflict: 'user_id,item_id' }
        );

      if (error) throw error;

      // Trigger cart refresh after successful addition
      await fetchCart();

      setCartSuccess(itemId);
      setTimeout(() => {
        setCartSuccess(null);
      }, 1000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add item to cart';
      setError(errorMessage);
      console.error('Error adding to cart:', err);
      setCartSuccess(null);
    } finally {
      setAddingToCart(false);
    }
  };

  const addToWishlist = async (itemId: string) => {
    try {
      if (!isAuthenticated) {
        throw new Error('Please sign in to continue');
      }

      setAddingToWishlist(true);
      setError(null);
      setWishlistSuccess(null);

      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (!userId) {
        throw new Error('User not found');
      }

      const { error } = await supabase
        .from('wishlist_items')
        .upsert(
          { user_id: userId, item_id: itemId },
          { onConflict: 'user_id,item_id' }
        );

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(`Failed to add to wishlist: ${error.message}`);
      }

      setWishlistSuccess(itemId);
      setTimeout(() => {
        setWishlistSuccess(null);
      }, 1000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add item to wishlist';
      setError(errorMessage);
      console.error('Error adding to wishlist:', err);
      setWishlistSuccess(null);
    } finally {
      setAddingToWishlist(false);
    }
  };

  const handleSizeSelection = (size: string) => {
    // Track Size selection event
    window.gtag('event', 'Size selection', {
      'event_category': 'Funnel',
      'event_label': 'Size selection'
    });
    
    // Add your size selection logic here
  };

  const handleCheckout = () => {
    // Track Cart checkout event
    window.gtag('event', 'Cart checkout', {
      'event_category': 'Funnel',
      'event_label': 'Cart checkout'
    });
    
    // Add your checkout logic here
  };

  const getImages = () => {
    if (!product) return [];
    const images = [product.image_url];
    if (product.image_url_2) images.push(product.image_url_2);
    if (product.image_url_3) images.push(product.image_url_3);
    return images;
  };

  const nextImage = () => {
    const images = getImages();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    const images = getImages();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600">{error || 'Product not found'}</p>
        <button
          onClick={onClose}
          className="mt-4 text-black hover:text-indigo-700"
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
        <div className="w-full h-[500px] relative group">
          {getImages().map((image, index) => (
            <div
              key={image}
              className={`absolute inset-0 transition-opacity duration-500 ${
                index === currentImageIndex ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <img
                src={image}
                alt={`${product.name} view ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
          
          {/* Navigation Arrows */}
          {getImages().length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 backdrop-blur-sm
                         shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200
                         hover:bg-white"
              >
                <ChevronLeft className="w-6 h-6 text-gray-800" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 backdrop-blur-sm
                         shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200
                         hover:bg-white"
              >
                <ChevronRight className="w-6 h-6 text-gray-800" />
              </button>
            </>
          )}

          {/* Dots Indicator */}
          {getImages().length > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
              {getImages().map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentImageIndex
                      ? 'bg-white w-4'
                      : 'bg-white/60 hover:bg-white/80'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h1>
          <p className="text-lg text-gray-600 mb-3">{product?.brands?.Name}</p>
          <p className="text-3xl font-bold text-gray-900 mb-6">₹{product.price}</p>
          
          <div className="space-y-6">
            {/* Sizes */}
            {product.sizes && product.sizes.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Available Sizes</h3>
                <div className="grid grid-cols-4 gap-2">
                  {(typeof product.sizes === 'string' ? JSON.parse(product.sizes) : product.sizes).map((size: string) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`py-2 rounded-lg border text-sm font-medium transition-all
                        ${selectedSize === size 
                          ? 'border-black bg-black text-white scale-105' 
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Brand Information Section */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start gap-4">
                {product?.brands?.logo && (
                  <img 
                    src={product.brands.logo} 
                    alt={product.brands.Name} 
                    className="w-16 h-16 object-contain rounded-lg bg-white p-2"
                  />
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {product?.brands?.Name}
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-sm font-medium text-gray-600">Delivery:</span>
                      <span className="text-sm text-gray-800">{product?.brands?.delivery_time}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-sm font-medium text-gray-600">Return Policy:</span>
                      <span className="text-sm text-gray-800">{product?.brands?.return_policy}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-gray-50 rounded-lg p-5">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <span className="inline-block w-1 h-5 bg-gradient-to-r from-[#B252FF] to-[#F777F7] rounded mr-2"></span>
                Description
              </h3>
              <div className="text-gray-600 space-y-3">
                {product.description?.split('-').map((section: string, index: number) => {
                  // Skip empty sections
                  if (!section.trim()) return null;
                  
                  // Check if this is a key-value pair (contains '**')
                  if (section.includes('**')) {
                    const parts = section.split('**');
                    // Format as a key-value pair
                    return (
                      <div key={index} className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-md shadow-sm">
                        <span className="font-medium text-[#B252FF]">{parts[1]}:</span>
                        <span className="text-gray-700">{parts[2] || ''}</span>
                      </div>
                    );
                  } else {
                    // Regular text paragraph
                    return (
                      <p key={index} className="leading-relaxed py-2">
                        {section.trim()}
                      </p>
                    );
                  }
                })}
              </div>
            </div>

            <div className="pt-6 space-y-4">
              <button
                onClick={() => addToCart(id)}
                disabled={addingToCart || product.stock <= 0 || !selectedSize}
                className="w-full flex items-center justify-center gap-2 py-3 px-8
                         bg-gradient-to-r from-[#B252FF] to-[#F777F7] text-white rounded-full font-medium
                         hover:opacity-90 transition-opacity duration-200 disabled:opacity-50
                         disabled:cursor-not-allowed"
              >
                <ShoppingBag className="w-5 h-5" />
                {product.stock <= 0 ? 'Out of Stock' : 
                 !selectedSize ? 'Select a Size' :
                 cartSuccess === id ? 'Added to Cart!' : 'Add to Cart'}
              </button>

              {/* <button
                onClick={() => addToWishlist(id)}
                disabled={addingToWishlist}
                className="w-full flex items-center justify-center gap-2 py-3 px-8
                         border-2 border-gray-200 rounded-full font-medium text-gray-700
                         hover:border-gray-300 transition-colors disabled:opacity-50"
              >
                <Heart className="w-5 h-5" />
                {wishlistSuccess === id ? 'Added to Wishlist!' : 'Add to Wishlist'}
              </button> */}

              {error && (
                <p className="text-red-600 text-sm text-center">{error}</p>
              )}
              {(cartSuccess || wishlistSuccess) && (
                <p className="text-green-600 text-sm text-center">
                  {cartSuccess ? 'Successfully added to cart!' : 'Successfully added to wishlist!'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}