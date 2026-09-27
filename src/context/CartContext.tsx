import React, { createContext, useContext, useState } from 'react';

export type Food = {
  name: string;
  price: number;
  emoji: string;
};

type CartItem = Food & {
  quantity: number;
};

type CartContextType = {
  cart: CartItem[];
  addToCart: (food: Food) => void;
  removeFromCart: (foodName: string) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
};

const CartContext = createContext<CartContextType | undefined>(
  undefined
);

export function CartProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = (food: Food) => {
    setCart((currentCart) => {
      const existingItem = currentCart.find(
        (item) => item.name === food.name
      );

      if (existingItem) {
        return currentCart.map((item) =>
          item.name === food.name
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...currentCart, { ...food, quantity: 1 }];
    });
  };

  const removeFromCart = (foodName: string) => {
    setCart((currentCart) => {
      const existingItem = currentCart.find(
        (item) => item.name === foodName
      );

      if (!existingItem) {
        return currentCart;
      }

      if (existingItem.quantity === 1) {
        return currentCart.filter(
          (item) => item.name !== foodName
        );
      }

      return currentCart.map((item) =>
        item.name === foodName
          ? { ...item, quantity: item.quantity - 1 }
          : item
      );
    });
  };

  const clearCart = () => {
    setCart([]);
  };

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const itemCount = cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        clearCart,
        total,
        itemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error(
      'useCart must be used inside CartProvider'
    );
  }

  return context;
}