import React from 'react';
import { Container, Text, Box, Spinner, Alert, VStack, Flex, Badge, Grid } from '@chakra-ui/react';
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
    <Box py={8} px={6}>
      <VStack gap={8} align="stretch" maxW="6xl" mx="auto">
        {/* Business Card */}
        {infoData && (
          <Box 
            p={8} 
            borderWidth="1px" 
            borderRadius="xl" 
            bg="white" 
            shadow="lg"
            width="100%"
            maxW="500px"
            mx="auto"
            position="relative"
            background="linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)"
            borderColor="border.default"
          >
            <Flex direction="column" gap={4}>
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
              <VStack gap={3} align="stretch">
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

        {/* Configuration Sections */}
        {infoData && (
          <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={6}>
            {/* Channels Section */}
            <Box 
              p={6} 
              borderWidth="1px" 
              borderRadius="lg" 
              bg="white" 
              shadow="sm"
              borderColor="border.default"
            >
              <Text fontSize="lg" fontWeight="bold" mb={4} color="fg.default">
                Channels ({infoData.channels?.length || 0})
              </Text>
              <VStack gap={2} align="stretch" maxH="300px" overflow="auto">
                {infoData.channels?.map((channel, index) => (
                  <Badge 
                    key={index} 
                    variant="subtle" 
                    colorPalette="blue"
                    fontSize="xs"
                    p={2}
                    borderRadius="md"
                  >
                    {channel}
                  </Badge>
                ))}
                {(!infoData.channels || infoData.channels.length === 0) && (
                  <Text fontSize="sm" color="fg.muted">No channels configured</Text>
                )}
              </VStack>
            </Box>

            {/* TM Stores Section */}
            <Box 
              p={6} 
              borderWidth="1px" 
              borderRadius="lg" 
              bg="white" 
              shadow="sm"
              borderColor="border.default"
            >
              <Text fontSize="lg" fontWeight="bold" mb={4} color="fg.default">
                TM Stores ({infoData.tmStores?.length || 0})
              </Text>
              <VStack gap={3} align="stretch" maxH="300px" overflow="auto">
                {infoData.tmStores?.map((store, index) => (
                  <Box 
                    key={index}
                    p={3}
                    borderWidth="1px"
                    borderRadius="md"
                    borderColor="border.subtle"
                    bg="bg.subtle"
                  >
                    <Flex justify="space-between" align="center" mb={2}>
                      <Text fontSize="sm" fontWeight="semibold" color="fg.default">
                        {store.id}
                      </Text>
                      <Badge variant="subtle" colorPalette="gray" fontSize="xs">
                        {store.type}
                      </Badge>
                    </Flex>
                    <Flex gap={4} flexWrap="wrap" fontSize="xs" color="fg.muted">
                      <Text>
                        <Text as="span" fontWeight="medium">Access:</Text> {store.access}
                      </Text>
                      <Text>
                        <Text as="span" fontWeight="medium">Partitioning:</Text> {store.partitioning}
                      </Text>
                    </Flex>
                  </Box>
                ))}
                {(!infoData.tmStores || infoData.tmStores.length === 0) && (
                  <Text fontSize="sm" color="fg.muted">No TM stores configured</Text>
                )}
              </VStack>
            </Box>
          </Grid>
        )}
      </VStack>
    </Box>
  );
};

export default Welcome;