import React, { useState, lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Box, Container, Heading, Tabs, Spinner, Flex } from '@chakra-ui/react';

// Lazy load tab content components
const Welcome = lazy(() => import('./pages/Welcome.jsx'));
const Status = lazy(() => import('./pages/Status.jsx'));
const Sources = lazy(() => import('./pages/Sources.jsx'));
const TM = lazy(() => import('./pages/TM.jsx'));

// Other route components
import NotFoundPage from './pages/NotFoundPage.jsx';

function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine active tab from URL
  const getTabFromPath = (path) => {
    if (path === '/status') return 'status';
    if (path === '/sources') return 'sources';
    if (path === '/tm') return 'tm';
    return 'home'; // default to home for '/' or any other path
  };
  
  const [activeTab, setActiveTab] = useState(getTabFromPath(location.pathname));
  
  // Update active tab when URL changes
  useEffect(() => {
    setActiveTab(getTabFromPath(location.pathname));
  }, [location.pathname]);

  const handleTabChange = (details) => {
    const value = typeof details === 'object' ? details.value : details;
    console.log('Tab changing to:', value);
    setActiveTab(value);
    
    // Update URL based on tab
    if (value === 'home') {
      navigate('/');
    } else {
      navigate(`/${value}`);
    }
  };

  return (
    <Box minH="100vh" bg="gray.50">
      <Tabs.Root 
        value={activeTab} 
        onValueChange={handleTabChange}
        variant="enclosed"
      >
        {/* Header */}
        <Box bg="white" borderBottom="1px" borderColor="gray.200">
          <Container maxWidth="6xl" py={3}>
            <Flex align="center" justify="space-between">
              {/* Logo and Title */}
              <Flex align="center" gap={3}>
                <img src="/logo.svg" alt="L10n Monster" width="32" height="32" />
                <Heading size="lg" color="gray.800">L10n Monster</Heading>
              </Flex>
              
              {/* Tab Triggers */}
              <Tabs.List>
                <Tabs.Trigger value="home">Home</Tabs.Trigger>
                <Tabs.Trigger value="status">Status</Tabs.Trigger>
                <Tabs.Trigger value="sources">Sources</Tabs.Trigger>
                <Tabs.Trigger value="tm">TM</Tabs.Trigger>
              </Tabs.List>
            </Flex>
          </Container>
        </Box>

        {/* Tab Content */}
        <Tabs.Content value="home">
          <Suspense fallback={
            <Container display="flex" justifyContent="center" mt={10}>
              <Spinner size="xl" />
            </Container>
          }>
            <Welcome />
          </Suspense>
        </Tabs.Content>
        
        <Tabs.Content value="status">
          <Suspense fallback={
            <Container display="flex" justifyContent="center" mt={10}>
              <Spinner size="xl" />
            </Container>
          }>
            <Status />
          </Suspense>
        </Tabs.Content>
        
        <Tabs.Content value="sources">
          <Suspense fallback={
            <Container display="flex" justifyContent="center" mt={10}>
              <Spinner size="xl" />
            </Container>
          }>
            <Sources />
          </Suspense>
        </Tabs.Content>
        
        <Tabs.Content value="tm">
          <Suspense fallback={
            <Container display="flex" justifyContent="center" mt={10}>
              <Spinner size="xl" />
            </Container>
          }>
            <TM />
          </Suspense>
        </Tabs.Content>
      </Tabs.Root>
    </Box>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout />} />
        <Route path="/status" element={<MainLayout />} />
        <Route path="/sources" element={<MainLayout />} />
        <Route path="/tm" element={<MainLayout />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
}

export default App;