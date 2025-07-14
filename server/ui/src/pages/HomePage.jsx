import React, { useState, useEffect } from 'react';
import { Container, Text, Box, Button, Grid, Spinner, Alert } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import ProjectCard from '../components/ProjectCard';

// Helper function for fetch requests
async function fetchApi(url, options = {}) {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            // Attempt to get error message from response body
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) { /* Ignore if response body is not JSON */ }
            const errorMessage = errorData?.message || `HTTP error! status: ${response.status}`;
            throw new Error(errorMessage);
        }
        return await response.json();
    } catch (error) {
        console.error("API Fetch Error:", error);
        // Re-throw the error so it can be caught by the calling component
        throw error;
    }
}

const HomePage = () => {
  const [statusData, setStatusData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await fetchApi('/api/status');
        setStatusData(data);
      } catch (err) {
        console.error('Error fetching status:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch status data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Container display="flex" justifyContent="center" mt={5}>
        <Spinner size="xl" />
      </Container>
    );
  }

  if (error) {
    return (
      <Container mt={5}>
        <Alert status="error">
          <Box>
            <Text fontWeight="bold">Error</Text>
            <Text>{error}</Text>
          </Box>
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="6xl" mt={4} mb={4}>
      <Box 
        bg="gradient-to-r"
        bgGradient="linear(to-r, blue.50, purple.50)"
        p={8}
        borderRadius="xl"
        mb={8}
        borderWidth="1px"
        borderColor="gray.200"
        position="relative"
        overflow="hidden"
      >
        <Box position="relative" zIndex="1">
          <Text 
            fontSize="5xl" 
            fontWeight="bold" 
            mb={3}
            bgGradient="to-r"
            gradientFrom="blue.600"
            gradientTo="purple.600"
            bgClip="text"
            letterSpacing="tight"
          >
            Localization Dashboard
          </Text>
          <Text 
            fontSize="xl" 
            color="gray.700" 
            mb={0}
            fontWeight="medium"
            maxWidth="600px"
            lineHeight="1.6"
          >
            Overview of translation activity across all language pairs
          </Text>
        </Box>
        
        {/* Decorative elements */}
        <Box
          position="absolute"
          top="-10px"
          right="-10px"
          width="100px"
          height="100px"
          bg="blue.100"
          borderRadius="full"
          opacity="0.3"
        />
        <Box
          position="absolute"
          bottom="-20px"
          left="-20px"
          width="80px"
          height="80px"
          bg="purple.100"
          borderRadius="full"
          opacity="0.4"
        />
      </Box>

      {/* Iterate over source languages */}
      {Object.entries(statusData).map(([channelId, projects]) => (
        Object.entries(projects).map(([projectName, pairs]) => (
          Object.entries(pairs).map(([sourceLang, targetLangs]) => (
              <Box 
              key={`${sourceLang}-${channelId}-${projectName}`} 
              mb={6} 
              p={3} 
              borderWidth="1px" 
              borderRadius="md" 
              bg="white"
              borderColor="gray.200"
            >
              <Box display="flex" alignItems="center" gap={3} flexWrap="wrap">
                <Box>
                  <Text fontSize="sm" color="gray.600" mb={1}>Channel</Text>
                  <Text fontSize="xl" fontWeight="semibold" color="blue.600">
                    {channelId}
                  </Text>
                </Box>
                <Box height="40px" width="1px" bg="gray.300" />
                <Box>
                  <Text fontSize="sm" color="gray.600" mb={1}>Project</Text>
                  <Text fontSize="xl" fontWeight="semibold" color="green.600">
                    {projectName}
                  </Text>
                </Box>
              </Box>

              <Grid templateColumns="repeat(auto-fit, minmax(300px, 1fr))" gap={4} mt={4}>
                {Object.entries(targetLangs).map(([targetLang, translationStatusArray]) => {
                  // Calculate totals from the translation status array
                  const resCount = translationStatusArray.reduce((sum, item) => sum + item.res, 0);
                  const segmentCount = translationStatusArray.reduce((sum, item) => sum + item.seg, 0);
                  
                  return (
                    <ProjectCard 
                      key={`${sourceLang}-${targetLang}-${projectName}-${channelId}`}
                      project={{ 
                        sourceLang, 
                        targetLang, 
                        resCount,
                        segmentCount,
                        translationStatus: translationStatusArray 
                      }} 
                    />
                  );
                })}
              </Grid>
            </Box>
          ))
        ))
      ))}
      
      {/* Handle case where no language pairs were returned */}
      {Object.keys(statusData).length === 0 && !loading && (
        <Text mt={4} color="gray.600">No active content found.</Text>
      )}
    </Container>
  );
};

export default HomePage;

// Export the helper function if you plan to use it in other files
export { fetchApi }; 