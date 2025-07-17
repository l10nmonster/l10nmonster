import React, { useState, useEffect } from 'react';
import { Container, Text, Box, Spinner, Alert, VStack, Flex } from '@chakra-ui/react';
import { fetchApi } from '../utils/api';

const Welcome = () => {
  const [infoData, setInfoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const data = await fetchApi('/api/info');
        setInfoData(data);
      } catch (err) {
        console.error('Error fetching info:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch info data');
      } finally {
        setLoading(false);
      }
    };

    fetchInfo();
  }, []);

  if (loading) {
    return (
      <Container display="flex" justifyContent="center" mt={20}>
        <Spinner size="xl" />
      </Container>
    );
  }

  if (error) {
    return (
      <Container mt={10}>
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
    <Container maxWidth="2xl" py={20}>
      <VStack gap={8} align="center">
        {/* Business Card */}
        {infoData && (
          <Box 
            p={8} 
            borderWidth="1px" 
            borderRadius="xl" 
            bg="white" 
            shadow="lg"
            width="500px"
            height="300px"
            position="relative"
            background="linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)"
            borderColor="gray.300"
          >
            <Flex height="100%" direction="column" justify="space-between">
              {/* Header with Logo and Title */}
              <Flex align="center" gap={4}>
                <img 
                  src="/logo.svg" 
                  alt="L10n Monster" 
                  width="60" 
                  height="60"
                />
                <Box>
                  <Text fontSize="xl" fontWeight="bold" color="gray.800" lineHeight="1.2">
                    {infoData.description}
                  </Text>
                </Box>
              </Flex>
              
              {/* Card Details */}
              <VStack gap={3} align="stretch" mt={4}>
                <Box>
                  <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wide" mb={1}>
                    Version
                  </Text>
                  <Text fontSize="lg" fontWeight="semibold" color="blue.600">
                    {infoData.version}
                  </Text>
                </Box>
                
                <Box>
                  <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wide" mb={1}>
                    Project Directory
                  </Text>
                  <Text fontSize="xs" fontFamily="mono" color="gray.600" wordBreak="break-all" lineHeight="1.3">
                    {infoData.baseDir}
                  </Text>
                </Box>
              </VStack>
              
              {/* Decorative element */}
              <Box 
                position="absolute" 
                top="-10px" 
                right="-10px" 
                width="80px" 
                height="80px" 
                bg="blue.50" 
                borderRadius="full" 
                opacity="0.5"
                zIndex="-1"
              />
            </Flex>
          </Box>
        )}
      </VStack>
    </Container>
  );
};

export default Welcome;