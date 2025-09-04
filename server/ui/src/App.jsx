import React, { useState, lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Box, Container, Heading, Spinner, Flex, Text } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Lazy load tab content components
const Welcome = lazy(() => import('./pages/Welcome.jsx'));
const Status = lazy(() => import('./pages/Status.jsx'));
const StatusDetail = lazy(() => import('./pages/StatusDetail.jsx'));
const Sources = lazy(() => import('./pages/Sources.jsx'));
const TM = lazy(() => import('./pages/TM.jsx'));
const TMDetail = lazy(() => import('./pages/TMDetail.jsx'));
const Providers = lazy(() => import('./pages/Providers.jsx'));
const Cart = lazy(() => import('./pages/Cart.jsx'));
const Job = lazy(() => import('./pages/Job.jsx'));

// Other route components
import NotFoundPage from './pages/NotFoundPage.jsx';

function MainLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [cartCount, setCartCount] = useState(0);

  // Function to get total cart count
  const updateCartCount = () => {
    try {
      const cartData = sessionStorage.getItem('tmCart');
      if (cartData) {
        const cart = JSON.parse(cartData);
        const total = Object.values(cart).reduce((sum, items) => {
          // Handle both old format (array) and new format (object with tus array)
          if (Array.isArray(items)) {
            return sum + items.length;
          } else {
            return sum + (items.tus ? items.tus.length : 0);
          }
        }, 0);
        setCartCount(total);
      } else {
        setCartCount(0);
      }
    } catch (err) {
      setCartCount(0);
    }
  };
  

  // Update cart count on mount and when storage changes
  useEffect(() => {
    updateCartCount();
    
    // Listen for storage events (from other tabs) and custom events
    const handleStorageChange = () => updateCartCount();
    const handleCartUpdate = () => updateCartCount();
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('cartUpdated', handleCartUpdate);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('cartUpdated', handleCartUpdate);
    };
  }, []);

  // Helper to determine if a path is active
  const isActiveRoute = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <Box minH="100vh" bg="bg.muted">
      {/* Header */}
      <Box bg="white" borderBottom="1px" borderColor="border.default">
        <Box px={6} py={3}>
          <Flex align="center" justify="space-between">
            {/* Logo and Title */}
            <Flex align="center" gap={3}>
              <img src="/logo.svg" alt="L10n Monster" width="32" height="32" />
              <Heading size="lg" color="fg.default">L10n Monster</Heading>
            </Flex>
            
            {/* Navigation Links */}
            <Flex align="center" gap={4}>
              <Box 
                cursor="pointer" 
                px={3} 
                py={1} 
                borderRadius="md"
                bg={isActiveRoute('/') ? "blue.subtle" : "transparent"}
                _hover={{ bg: isActiveRoute('/') ? "blue.subtle" : "gray.subtle" }}
                onClick={() => navigate('/')}
              >
                <Text fontSize="md" fontWeight="medium">Home</Text>
              </Box>
              <Box 
                cursor="pointer" 
                px={3} 
                py={1} 
                borderRadius="md"
                bg={isActiveRoute('/status') ? "blue.subtle" : "transparent"}
                _hover={{ bg: isActiveRoute('/status') ? "blue.subtle" : "gray.subtle" }}
                onClick={() => navigate('/status')}
              >
                <Text fontSize="md" fontWeight="medium">Status</Text>
              </Box>
              <Box 
                cursor="pointer" 
                px={3} 
                py={1} 
                borderRadius="md"
                bg={isActiveRoute('/sources') ? "blue.subtle" : "transparent"}
                _hover={{ bg: isActiveRoute('/sources') ? "blue.subtle" : "gray.subtle" }}
                onClick={() => navigate('/sources')}
              >
                <Text fontSize="md" fontWeight="medium">Sources</Text>
              </Box>
              <Box 
                cursor="pointer" 
                px={3} 
                py={1} 
                borderRadius="md"
                bg={isActiveRoute('/tm') ? "blue.subtle" : "transparent"}
                _hover={{ bg: isActiveRoute('/tm') ? "blue.subtle" : "gray.subtle" }}
                onClick={() => navigate('/tm')}
              >
                <Text fontSize="md" fontWeight="medium">TM</Text>
              </Box>
              <Box 
                cursor="pointer" 
                px={3} 
                py={1} 
                borderRadius="md"
                bg={isActiveRoute('/providers') ? "blue.subtle" : "transparent"}
                _hover={{ bg: isActiveRoute('/providers') ? "blue.subtle" : "gray.subtle" }}
                onClick={() => navigate('/providers')}
              >
                <Text fontSize="md" fontWeight="medium">Providers</Text>
              </Box>
            </Flex>

            {/* Cart Icon */}
            <Flex 
              align="center" 
              gap={2} 
              px={3} 
              py={1} 
              bg={isActiveRoute('/cart') ? "blue.subtle" : (cartCount > 0 ? "blue.muted" : "gray.muted")}
              borderRadius="md"
              cursor="pointer"
              _hover={{ bg: "blue.subtle" }}
              onClick={() => navigate('/cart')}
            >
              <Box fontSize="lg">🛒</Box>
              <Text fontSize="md" fontWeight="medium">
                {cartCount} {cartCount === 1 ? 'TU' : 'TUs'}
              </Text>
            </Flex>
          </Flex>
        </Box>
      </Box>

      {/* Route-based Content */}
      <Suspense fallback={
        <Box display="flex" justifyContent="center" mt={10}>
          <Spinner size="xl" />
        </Box>
      }>
        {children}
      </Suspense>
    </Box>
  );
}

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Suspense fallback={
          <Box display="flex" justifyContent="center" alignItems="center" minH="100vh">
            <Spinner size="xl" />
          </Box>
        }>
          <Routes>
            <Route path="/job/:jobGuid" element={<Job />} />
            <Route path="/" element={
              <MainLayout>
                <Welcome />
              </MainLayout>
            } />
            <Route path="/status" element={
              <MainLayout>
                <Status />
              </MainLayout>
            } />
            <Route path="/status/:sourceLang/:targetLang" element={
              <MainLayout>
                <StatusDetail />
              </MainLayout>
            } />
            <Route path="/sources" element={
              <MainLayout>
                <Sources />
              </MainLayout>
            } />
            <Route path="/tm" element={
              <MainLayout>
                <TM />
              </MainLayout>
            } />
            <Route path="/tm/:sourceLang/:targetLang" element={
              <MainLayout>
                <TMDetail />
              </MainLayout>
            } />
            <Route path="/providers" element={
              <MainLayout>
                <Providers />
              </MainLayout>
            } />
            <Route path="/cart" element={
              <MainLayout>
                <Cart />
              </MainLayout>
            } />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </Router>
    </QueryClientProvider>
  );
}

export default App;