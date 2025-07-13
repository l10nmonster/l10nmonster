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
      <Text fontSize="4xl" fontWeight="medium" mb={2}>
        Localization Dashboard
      </Text>
      <Text fontSize="lg" color="gray.600" mb={4}>
        Overview of translation activity across all language pairs.
      </Text>

      {/* Iterate over source languages */}
      {Object.entries(statusData).map(([sourceLang, targetLangs]) => (
        Object.entries(targetLangs).map(([targetLang, projects]) => (
          Object.entries(projects).map(([projectName, channels]) => (
            <Box 
              key={`${sourceLang}-${targetLang}-${projectName}`} 
              mb={6} 
              p={3} 
              borderWidth="1px" 
              borderRadius="md" 
              bg="white"
              borderColor="gray.200"
            >
              <Text fontSize="2xl" mt={0}>Project: {projectName}</Text>

              <Grid templateColumns="repeat(auto-fit, minmax(300px, 1fr))" gap={4} mt={4}>
                {Object.entries(channels).map(([channelId, translationStatusArray]) => {
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