// Cart utility functions for managing TUs from different sources

// Cart storage keys
export const CART_STORAGE_KEY = 'tmCart';

/**
 * Get the current cart from sessionStorage
 * @returns {Object} Cart data grouped by language pairs
 */
export const getCart = () => {
  const cartData = sessionStorage.getItem(CART_STORAGE_KEY);
  return cartData ? JSON.parse(cartData) : {};
};

/**
 * Save cart data to sessionStorage
 * @param {Object} cart - Cart data to save
 */
export const saveCart = (cart) => {
  sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  // Trigger cart update event for header
  window.dispatchEvent(new Event('cartUpdated'));
};

/**
 * Create a simplified TU object for the cart (only channel and guid needed for dispatch)
 * @param {Object} originalTu - Original TU data
 * @param {string} sourceLang - Source language
 * @param {string} targetLang - Target language
 * @param {string} channel - Channel (optional, from originalTu.channel or passed explicitly)
 * @returns {Object} Simplified TU object
 */
export const createCartTU = (originalTu, sourceLang, targetLang, channel = null) => {
  return {
    guid: originalTu.guid,
    channel: channel || originalTu.channel,
    sourceLang,
    targetLang,
    // Keep source/target for display in cart
    nsrc: originalTu.nsrc,
    ntgt: originalTu.ntgt
  };
};

/**
 * Add TUs to cart (unified function for both TM and source pages)
 * @param {string} sourceLang - Source language
 * @param {string} targetLang - Target language
 * @param {Array} tus - Array of TU objects to add
 * @param {string} channel - Channel name (optional, will use TU's channel if not provided)
 */
export const addTUsToCart = (sourceLang, targetLang, tus, channel = null) => {
  const cart = getCart();
  const langPairKey = `${sourceLang}|${targetLang}`;

  if (!cart[langPairKey]) {
    cart[langPairKey] = {
      sourceLang,
      targetLang,
      tus: []
    };
  }

  const cartTUs = tus.map(tu => createCartTU(tu, sourceLang, targetLang, channel));
  cart[langPairKey].tus.push(...cartTUs);

  saveCart(cart);
};

// Backward compatibility aliases
export const addTMTUsToCart = addTUsToCart;
export const addSourceTUsToCart = (sourceLang, targetLang, channel, tus) => {
  addTUsToCart(sourceLang, targetLang, tus, channel);
};

/**
 * Remove a TU from cart by language pair and index
 * @param {string} langPairKey - Language pair key (e.g., "en|es")
 * @param {number} index - Index of TU to remove
 */
export const removeTUFromCart = (langPairKey, index) => {
  const cart = getCart();

  if (cart[langPairKey] && cart[langPairKey].tus) {
    cart[langPairKey].tus.splice(index, 1);

    // Remove language pair if no TUs left
    if (cart[langPairKey].tus.length === 0) {
      delete cart[langPairKey];
    }

    saveCart(cart);
  }
};

/**
 * Get cart count for display in header
 * @returns {number} Total number of TUs in cart across all language pairs
 */
export const getCartCount = () => {
  const cart = getCart();
  return Object.values(cart).reduce((total, langPair) => total + langPair.tus.length, 0);
};

/**
 * Clear entire cart
 */
export const clearCart = () => {
  sessionStorage.removeItem(CART_STORAGE_KEY);
  window.dispatchEvent(new Event('cartUpdated'));
};

