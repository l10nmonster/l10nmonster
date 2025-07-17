import React, { useState, useEffect } from 'react';
import { Container, Text, Box, Button, Grid, Spinner, Alert } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import ProjectCard from '../components/ProjectCard';
import { fetchApi } from '../utils/api';

const Status = () => {
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
    <Container maxWidth="6xl" py={6}>

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

export default Status; 