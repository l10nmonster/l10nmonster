import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import UntranslatedPage from './pages/UntranslatedPage';
import TMPage from './pages/TMPage';
import NotFoundPage from './pages/NotFoundPage'; // Import the 404 page
import theme from './theme/theme';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline /> {/* Normalize CSS */}
      <Router>
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Header />
          <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default' }}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/untranslated/:sourceLang/:targetLang" element={<UntranslatedPage />} />
              <Route path="/tm/:sourceLang/:targetLang" element={<TMPage />} />
              {/* Add other routes as needed */}
              <Route path="*" element={<NotFoundPage />} /> {/* Catch-all route for 404 */}
            </Routes>
          </Box>
          {/* Optional Footer could go here */}
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;
