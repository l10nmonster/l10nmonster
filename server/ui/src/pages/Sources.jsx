import React from 'react';
import { Container, Text, Box, Spinner, Alert, VStack, Grid, Badge, Flex } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../utils/api';
import SourceCard from '../components/SourceCard';

const Sources = () => {
  const { data: contentStats = {}, isLoading: loading, error } = useQuery({
    queryKey: ['activeContentStats'],
    queryFn: () => fetchApi('/api/activeContentStats'),
  });


  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={10}>
        <Spinner size="xl" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box mt={5} px={6}>
        <Alert status="error">
          <Box>
            <Text fontWeight="bold">Error</Text>
            <Text>{error}</Text>
          </Box>
        </Alert>
      </Box>
    );
  }

  return (
    <Box py={6} px={6}>
      <VStack gap={6} align="stretch">
        {/* Content Stats by Channel */}
        {Object.keys(contentStats).length === 0 ? (
          <Box p={6} borderWidth="1px" borderRadius="md" bg="white" textAlign="center">
            <Text color="fg.muted">No active content found.</Text>
          </Box>
        ) : (
          <VStack gap={6} align="center">
            {Object.entries(contentStats).map(([channelId, channelData]) => (
              <Box 
                key={channelId}
                p={6} 
                borderWidth="1px" 
                borderRadius="lg" 
                bg="white" 
                shadow="sm"
                minW="600px"
                maxW="1200px"
                w="100%"
              >
                <VStack gap={4} align="stretch">
                  {/* Channel Header */}
                  <Box>
                    <Text fontSize="xl" fontWeight="bold" color="blue.600" mb={2}>
                      {channelId}
                    </Text>
                  </Box>

                  {/* Channel Content Items */}
                  {channelData.length === 0 ? (
                    <Box 
                      p={6} 
                      borderWidth="1px" 
                      borderRadius="md" 
                      bg="bg.muted" 
                      textAlign="center"
                      w="100%"
                    >
                      <Text color="fg.muted" fontSize="sm">
                        No content found for this channel
                      </Text>
                    </Box>
                  ) : (
                    <Grid 
                      templateColumns={{ 
                        base: "1fr", 
                        lg: "repeat(auto-fit, minmax(600px, 1fr))" 
                      }} 
                      gap={4} 
                      justifyItems="center"
                    >
                      {channelData
                        .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
                        .map((item, index) => (
                          <SourceCard key={index} item={item} />
                        ))}
                    </Grid>
                  )}
                </VStack>
              </Box>
            ))}
          </VStack>
        )}
      </VStack>
    </Box>
  );
};

export default Sources;