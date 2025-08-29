import React, { useState, useEffect } from 'react';
import { Container, Text, Box, VStack, Button, Flex, Badge } from '@chakra-ui/react';
import CartLanguagePair from '../components/CartLanguagePair';

const Cart = () => {
  const [cartData, setCartData] = useState({});
  const [loading, setLoading] = useState(true);

  const getCart = () => {
    try {
      const data = sessionStorage.getItem('tmCart');
      return data ? JSON.parse(data) : {};
    } catch (err) {
      console.error('Error loading cart:', err);
      return {};
    }
  };

  const saveCart = (cart) => {
    sessionStorage.setItem('tmCart', JSON.stringify(cart));
    // Trigger cart update event for header
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const loadCartData = () => {
    setLoading(true);
    const cart = getCart();
    setCartData(cart);
    setLoading(false);
  };

  const handleRemoveTU = (langPairKey, tuIndex) => {
    const cart = getCart();
    if (cart[langPairKey]) {
      // Handle both old format (array) and new format (object with tus array)
      if (Array.isArray(cart[langPairKey])) {
        cart[langPairKey].splice(tuIndex, 1);
        if (cart[langPairKey].length === 0) {
          delete cart[langPairKey];
        }
      } else {
        cart[langPairKey].tus.splice(tuIndex, 1);
        if (cart[langPairKey].tus.length === 0) {
          delete cart[langPairKey];
        }
      }
      saveCart(cart);
      loadCartData();
    }
  };

  const handleEmptyCart = () => {
    saveCart({});
    loadCartData();
  };

  const getTotalCount = () => {
    return Object.values(cartData).reduce((sum, items) => {
      // Handle both old format (array) and new format (object with tus array)
      if (Array.isArray(items)) {
        return sum + items.length;
      } else {
        return sum + (items.tus ? items.tus.length : 0);
      }
    }, 0);
  };


  useEffect(() => {
    loadCartData();
  }, []);

  if (loading) {
    return (
      <Box py={6} px={6}>
        <Text>Loading cart...</Text>
      </Box>
    );
  }

  const totalCount = getTotalCount();

  return (
    <Box py={6} px={6}>
      <VStack gap={6} align="stretch">
        {/* Header */}
        <Flex align="center" justify="space-between">
          <Text fontSize="2xl" fontWeight="bold">
            Translation Memory Cart
          </Text>
          {totalCount > 0 && (
            <Button
              colorPalette="red"
              variant="outline"
              onClick={handleEmptyCart}
            >
              Empty Cart
            </Button>
          )}
        </Flex>

        {/* Cart Contents */}
        {totalCount === 0 ? (
          <Box p={8} textAlign="center" borderWidth="1px" borderRadius="lg" bg="bg.muted">
            <Text fontSize="lg" color="fg.default" mb={2}>
              Your cart is empty
            </Text>
            <Text color="fg.muted">
              Add translation units from the TM pages to get started
            </Text>
          </Box>
        ) : (
          <VStack gap={6} align="stretch">
            {Object.entries(cartData).map(([langPairKey, tus]) => (
              <CartLanguagePair
                key={langPairKey}
                langPairKey={langPairKey}
                tus={tus}
                onRemoveTU={handleRemoveTU}
              />
            ))}
          </VStack>
        )}
      </VStack>
    </Box>
  );
};

export default Cart;