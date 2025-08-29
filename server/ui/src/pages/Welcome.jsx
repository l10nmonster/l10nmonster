import React from 'react';
import { Container, Text, Box, Spinner, Alert, VStack, Flex } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../utils/api';

const Welcome = () => {
  const { data: infoData, isLoading: loading, error } = useQuery({
    queryKey: ['info'],
    queryFn: () => fetchApi('/api/info'),
  });

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={20}>
        <Spinner size="xl" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box mt={10} px={6}>
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
    <Box py={20} px={6}>
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
            borderColor="border.default"
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
                  <Text fontSize="xl" fontWeight="bold" color="fg.default" lineHeight="1.2">
                    {infoData.description}
                  </Text>
                </Box>
              </Flex>
              
              {/* Card Details */}
              <VStack gap={3} align="stretch" mt={4}>
                <Box>
                  <Text fontSize="xs" color="fg.muted" textTransform="uppercase" letterSpacing="wide" mb={1}>
                    Version
                  </Text>
                  <Text fontSize="lg" fontWeight="semibold" color="blue.600">
                    {infoData.version}
                  </Text>
                </Box>
                
                <Box>
                  <Text fontSize="xs" color="fg.muted" textTransform="uppercase" letterSpacing="wide" mb={1}>
                    Project Directory
                  </Text>
                  <Text fontSize="xs" fontFamily="mono" color="fg.muted" wordBreak="break-all" lineHeight="1.3">
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
                bg="blue.subtle" 
                borderRadius="full" 
                opacity="0.5"
                zIndex="-1"
              />
            </Flex>
          </Box>
        )}
      </VStack>
    </Box>
  );
};

export default Welcome;