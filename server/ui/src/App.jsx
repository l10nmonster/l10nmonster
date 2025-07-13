import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Box } from '@chakra-ui/react';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import UntranslatedPage from './pages/UntranslatedPage';
import TMPage from './pages/TMPage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <Router>
      <Box display="flex" flexDirection="column" minH="100vh">
        <Header />
        <Box as="main" flex="1" bg="gray.50">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/untranslated/:sourceLang/:targetLang" element={<UntranslatedPage />} />
            <Route path="/tm/:sourceLang/:targetLang" element={<TMPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Box>
      </Box>
    </Router>
  );
}

export default App; 