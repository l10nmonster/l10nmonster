import React, { useState, useRef, useEffect } from 'react';
import { Box, Spinner, Alert, Text } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../utils/api';
import TMCard from './TMCard';

const LazyTMCard = ({ sourceLang, targetLang }) => {
  const [shouldLoad, setShouldLoad] = useState(false);
  const containerRef = useRef(null);

  // Set up intersection observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoad(true);
            observer.disconnect(); // Only trigger once
          }
        });
      },
      {
        rootMargin: '200px', // Start loading 200px before the element comes into view
        threshold: 0,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Query for this specific language pair
  const { data: pairStats, isLoading, error } = useQuery({
    queryKey: ['tmStats', sourceLang, targetLang],
    queryFn: () => fetchApi(`/api/tm/stats/${sourceLang}/${targetLang}`),
    enabled: shouldLoad,
  });

  return (
    <Box ref={containerRef} minH="200px">
      {error ? (
        <Alert status="error">
          <Box>
            <Text fontWeight="bold">Error loading {sourceLang} → {targetLang}</Text>
            <Text>{error.message || 'Unknown error'}</Text>
          </Box>
        </Alert>
      ) : isLoading ? (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minH="200px"
          p={6}
          borderWidth="1px"
          borderRadius="lg"
          bg="white"
          shadow="sm"
        >
          <Spinner size="md" />
        </Box>
      ) : pairStats ? (
        <TMCard
          sourceLang={sourceLang}
          targetLang={targetLang}
          providers={pairStats}
        />
      ) : !shouldLoad ? (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minH="200px"
          p={6}
          borderWidth="1px"
          borderRadius="lg"
          bg="gray.50"
          shadow="sm"
        >
          <Text color="fg.muted" fontSize="sm">Scroll down to load...</Text>
        </Box>
      ) : (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minH="200px"
          p={6}
          borderWidth="1px"
          borderRadius="lg"
          bg="white"
          shadow="sm"
        >
          <Text color="fg.muted">No data available</Text>
        </Box>
      )}
    </Box>
  );
};

export default LazyTMCard;