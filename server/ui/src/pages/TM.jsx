import React, { useState, useEffect } from 'react';
import { Container, Text, Box, Spinner, Alert, VStack, Grid, Badge, Flex } from '@chakra-ui/react';
import { fetchApi } from '../utils/api';

const TM = () => {
  const [tmStats, setTmStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTmStats = async () => {
      try {
        const data = await fetchApi('/api/tm/stats');
        setTmStats(data);
      } catch (err) {
        console.error('Error fetching TM stats:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch translation memory statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchTmStats();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'done': return 'green';
      case 'pending': return 'yellow';
      case 'error': return 'red';
      default: return 'gray';
    }
  };

  if (loading) {
    return (
      <Container display="flex" justifyContent="center" mt={10}>
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
      <VStack gap={6} align="stretch">
        {/* Header */}
        <Box>
          <Text fontSize="2xl" fontWeight="bold" mb={2}>
            Translation Memory Statistics
          </Text>
          <Text color="gray.600">
            Overview of jobs by translation provider for each language pair
          </Text>
        </Box>

        {/* TM Stats by Translation Pair */}
        {Object.keys(tmStats).length === 0 ? (
          <Box p={6} borderWidth="1px" borderRadius="md" bg="white" textAlign="center">
            <Text color="gray.500">No translation memory data found.</Text>
          </Box>
        ) : (
          <VStack gap={6} align="stretch">
            {Object.entries(tmStats).flatMap(([sourceLang, targetLangs]) =>
              Object.entries(targetLangs).map(([targetLang, providers]) => (
                <Box 
                  key={`${sourceLang}-${targetLang}`}
                  p={6} 
                  borderWidth="1px" 
                  borderRadius="lg" 
                  bg="white" 
                  shadow="sm"
                >
                  <VStack gap={4} align="stretch">
                    {/* Language Pair Header */}
                    <Box>
                      <Flex align="center" gap={3} mb={2}>
                        <Badge colorPalette="blue" size="sm">
                          {sourceLang}
                        </Badge>
                        <Text color="gray.500" fontSize="lg">→</Text>
                        <Badge colorPalette="green" size="sm">
                          {targetLang}
                        </Badge>
                      </Flex>
                    </Box>

                    {/* Providers */}
                    <VStack gap={3} align="stretch">
                      {providers.map((provider, index) => (
                        <Box 
                          key={index}
                          p={3}
                          borderWidth="1px"
                          borderRadius="md"
                          borderColor="gray.200"
                          bg="gray.50"
                        >
                          <Grid templateColumns="2fr 80px 80px 80px 80px" gap={4} alignItems="center">
                            {/* Provider Name */}
                            <Box>
                              <Text fontSize="xs" color="gray.500" mb={1}>Provider</Text>
                              <Text fontSize="sm" fontWeight="semibold">
                                {provider.translationProvider}
                              </Text>
                            </Box>

                            {/* Status */}
                            <Box textAlign="center">
                              <Text fontSize="xs" color="gray.500" mb={1}>Status</Text>
                              <Badge colorPalette={getStatusColor(provider.status)} size="sm">
                                {provider.status}
                              </Badge>
                            </Box>

                            {/* TU Count */}
                            <Box textAlign="center">
                              <Text fontSize="xs" color="gray.500" mb={1}>TUs</Text>
                              <Text fontSize="sm" fontWeight="bold" color="purple.600">
                                {provider.tuCount.toLocaleString()}
                              </Text>
                            </Box>

                            {/* Distinct GUIDs */}
                            <Box textAlign="center">
                              <Text fontSize="xs" color="gray.500" mb={1}>Unique</Text>
                              <Text fontSize="sm" fontWeight="bold" color="orange.600">
                                {provider.distinctGuids.toLocaleString()}
                              </Text>
                            </Box>

                            {/* Job Count */}
                            <Box textAlign="center">
                              <Text fontSize="xs" color="gray.500" mb={1}>Jobs</Text>
                              <Text fontSize="sm" fontWeight="bold" color="teal.600">
                                {provider.jobCount.toLocaleString()}
                              </Text>
                            </Box>
                          </Grid>
                        </Box>
                      ))}
                    </VStack>
                  </VStack>
                </Box>
              ))
            )}
          </VStack>
        )}
      </VStack>
    </Container>
  );
};

export default TM;