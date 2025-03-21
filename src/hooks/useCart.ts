import { useEffect } from 'react';
import { useCartStore } from '../store';
import { supabase } from '../lib/supabase';

export function useCart() {
  const { items, isLoading, error, fetchCart, addToCart, removeFromCart, clearCart } = useCartStore();

  useEffect(() => {
    fetchCart();

    // Subscribe to cart changes
    const channel = supabase
      .channel('cart_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cart_items'
        },
        () => {
          fetchCart();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [fetchCart]);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce(
    (sum, item) => sum + (item.inventory_items.price * item.quantity),
    0
  );

  return {
    items,
    isLoading,
    error,
    totalItems,
    totalAmount,
    addToCart,
    removeFromCart,
    clearCart,
    refreshCart: fetchCart,
    fetchCart
  };
}