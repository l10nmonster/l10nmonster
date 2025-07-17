import React, { useState, useEffect } from 'react';
import { Container, Text, Box, Spinner, Alert, VStack, Grid, Badge, Flex } from '@chakra-ui/react';
import { fetchApi } from '../utils/api';

const Sources = () => {
  const [contentStats, setContentStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchContentStats = async () => {
      try {
        const data = await fetchApi('/api/activeContentStats');
        setContentStats(data);
      } catch (err) {
        console.error('Error fetching content stats:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch content statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchContentStats();
  }, []);

  const formatRelativeDate = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMs = now - date;
    const diffInSeconds = Math.floor(diffInMs / 1000);
    
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto', style: 'short' });
    
    if (diffInSeconds < 60) {
      return rtf.format(-diffInSeconds, 'second');
    } else if (diffInSeconds < 3600) {
      return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
    } else if (diffInSeconds < 86400) {
      return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
    } else if (diffInSeconds < 2592000) {
      return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
    } else if (diffInSeconds < 31536000) {
      return rtf.format(-Math.floor(diffInSeconds / 2592000), 'month');
    } else {
      return rtf.format(-Math.floor(diffInSeconds / 31536000), 'year');
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
            Active Content Sources
          </Text>
          <Text color="gray.600">
            Overview of content sources across all channels
          </Text>
        </Box>

        {/* Content Stats by Channel */}
        {Object.keys(contentStats).length === 0 ? (
          <Box p={6} borderWidth="1px" borderRadius="md" bg="white" textAlign="center">
            <Text color="gray.500">No active content found.</Text>
          </Box>
        ) : (
          <Grid templateColumns="repeat(auto-fit, minmax(400px, 1fr))" gap={6}>
            {Object.entries(contentStats).map(([channelId, channelData]) => (
              <Box 
                key={channelId}
                p={6} 
                borderWidth="1px" 
                borderRadius="lg" 
                bg="white" 
                shadow="sm"
              >
                <VStack gap={4} align="stretch">
                  {/* Channel Header */}
                  <Box>
                    <Text fontSize="xl" fontWeight="bold" color="blue.600" mb={2}>
                      {channelId}
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                      {channelData.length} content source{channelData.length !== 1 ? 's' : ''}
                    </Text>
                  </Box>

                  {/* Channel Content Items */}
                  {channelData.map((item, index) => (
                    <Box 
                      key={index}
                      p={3}
                      borderWidth="1px"
                      borderRadius="md"
                      borderColor="gray.200"
                      bg="gray.50"
                    >
                      <Grid templateColumns="1fr 80px 1fr 80px 80px 100px" gap={4} alignItems="center">
                        {/* Project */}
                        <Box>
                          <Text fontSize="xs" color="gray.500" mb={1}>Project</Text>
                          <Text fontSize="sm" fontWeight="semibold">
                            {item.prj || 'Default'}
                          </Text>
                        </Box>

                        {/* Source */}
                        <Box>
                          <Text fontSize="xs" color="gray.500" mb={1}>Source</Text>
                          <Badge colorPalette="blue" size="sm">
                            {item.sourceLang}
                          </Badge>
                        </Box>

                        {/* Target Languages */}
                        <Box>
                          <Text fontSize="xs" color="gray.500" mb={1}>
                            Targets ({item.targetLangs.length})
                          </Text>
                          <Flex wrap="wrap" gap={1}>
                            {item.targetLangs.slice(0, 3).map(lang => (
                              <Badge key={lang} colorPalette="green" size="sm">
                                {lang}
                              </Badge>
                            ))}
                            {item.targetLangs.length > 3 && (
                              <Badge colorPalette="gray" size="sm">
                                +{item.targetLangs.length - 3}
                              </Badge>
                            )}
                          </Flex>
                        </Box>

                        {/* Resources */}
                        <Box textAlign="center">
                          <Text fontSize="xs" color="gray.500" mb={1}>Resources</Text>
                          <Text fontSize="sm" fontWeight="bold" color="orange.600">
                            {item.resCount.toLocaleString()}
                          </Text>
                        </Box>

                        {/* Segments */}
                        <Box textAlign="center">
                          <Text fontSize="xs" color="gray.500" mb={1}>Segments</Text>
                          <Text fontSize="sm" fontWeight="bold" color="purple.600">
                            {item.segmentCount.toLocaleString()}
                          </Text>
                        </Box>

                        {/* Date */}
                        <Box textAlign="center">
                          <Text fontSize="xs" color="gray.500" mb={1}>Modified</Text>
                          <Text fontSize="xs" color="gray.600">
                            {formatRelativeDate(item.lastModified)}
                          </Text>
                        </Box>
                      </Grid>
                    </Box>
                  ))}
                </VStack>
              </Box>
            ))}
          </Grid>
        )}
      </VStack>
    </Container>
  );
};

export default Sources;