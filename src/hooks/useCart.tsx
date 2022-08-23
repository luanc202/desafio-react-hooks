import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      // if there are no products in cart
      if (!cart.find(product => product.id === productId)) {
        const response = await api.get(`/products/${productId}`);

        const { data: product } = response;
        product.amount = 1;

        setCart([...cart, product]);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
      } else {
        // if the product exists in the cart
        const newCart = [...cart];
        const productIndex = newCart.findIndex(p => p.id === productId);

        const response = await api.get(`/stock/${productId}`);
        const productStockAmount = response.data.amount;

        if (newCart[productIndex].amount +1 > productStockAmount) {
          toast.error('Quantidade solicitada fora do estoque');
          return;
        } else {
          newCart.forEach(product => {
            if (product.id === productId) {
              product.amount += 1;
            }
          });
          setCart(newCart);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
        }
      }
    } catch(err) {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = [...cart];

      const productIndex = newCart.findIndex(p => p.id === productId);
      newCart.splice(productIndex, 1)

      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const newCart = [...cart];

      const productIndex = newCart.findIndex(p => p.id === productId);
      const response = await api.get(`/stock/${productId}`);
      const productStockAmount = response.data.amount;

      if (amount > productStockAmount) {
        toast.error('Quantidade solicitada fora do estoque');
        return;
      }

      newCart[productIndex].amount = amount;
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
