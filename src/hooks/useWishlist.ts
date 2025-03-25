import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase'; // Adjust the import based on your Supabase client setup

export const useWishlist = () => {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWishlistItems = async () => {
      try {
        const { data, error } = await supabase
          .from('wishlist_items') 
          
          .select('*'); // Adjust the fields as necessary

        if (error) throw error;

        setWishlistItems(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchWishlistItems();
  }, []);

  const addToWishlist = async (item) => {
    const { error } = await supabase
      .from('wishlists')
      .insert([item]); // Adjust the item structure as necessary

    if (error) {
      setError(error.message);
    } else {
      setWishlistItems((prev) => [...prev, item]);
    }
  };

  const removeFromWishlist = async (id) => {
    const { error } = await supabase
      .from('wishlist')
      .delete()
      .match({ id }); // Adjust based on your primary key

    if (error) {
      setError(error.message);
    } else {
      setWishlistItems((prev) => prev.filter((item) => item.id !== id));
    }
  };

  return { wishlistItems, loading, error, addToWishlist, removeFromWishlist };
}; 