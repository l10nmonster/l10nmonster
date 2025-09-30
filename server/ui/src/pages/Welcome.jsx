import React from 'react';
import { Container, Text, Box, Spinner, Alert, VStack, Flex, Badge, Grid, HStack } from '@chakra-ui/react';
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
          <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6}>
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
              <VStack gap={3} align="stretch" maxH="500px" overflow="auto">
                {infoData.channels?.map((channel, index) => (
                  <Box
                    key={index}
                    p={4}
                    borderWidth="1px"
                    borderRadius="md"
                    borderColor="border.subtle"
                    bg="bg.subtle"
                  >
                    <Flex justify="space-between" align="center" mb={3}>
                      <Text fontSize="sm" fontWeight="semibold" color="fg.default">
                        {channel.id}
                      </Text>
                      <Badge variant="subtle" colorPalette="purple" fontSize="xs">
                        {channel.translationPolicies} {channel.translationPolicies === 1 ? 'policy' : 'policies'}
                      </Badge>
                    </Flex>

                    <HStack gap={4} mb={3} flexWrap="wrap">
                      <Box>
                        <Text fontSize="xs" color="fg.muted" mb={1}>Source</Text>
                        <Badge variant="subtle" colorPalette="blue" fontSize="xs">
                          {channel.source}
                        </Badge>
                      </Box>
                      <Box>
                        <Text fontSize="xs" color="fg.muted" mb={1}>Target</Text>
                        <Badge variant="subtle" colorPalette="green" fontSize="xs">
                          {channel.target}
                        </Badge>
                      </Box>
                    </HStack>

                    {channel.formatHandlers && channel.formatHandlers.length > 0 && (
                      <Box>
                        <Text fontSize="xs" color="fg.muted" mb={2}>Format Handlers</Text>
                        <VStack gap={2} align="stretch">
                          {channel.formatHandlers.map((handler, handlerIndex) => (
                            <Box key={handlerIndex} p={2} bg="white" borderRadius="sm" borderWidth="1px">
                              <Flex justify="space-between" align="center" mb={1}>
                                <Text fontSize="xs" fontWeight="medium">
                                  {handler.id}{handler.resourceFilter && ` (${handler.resourceFilter})`}
                                </Text>
                                {handler.defaultMessageFormat && (
                                  <Badge variant="outline" colorPalette="orange" size="sm">
                                    {handler.defaultMessageFormat}
                                  </Badge>
                                )}
                              </Flex>
                              {handler.messageFormats && handler.messageFormats.length > 0 && (
                                <HStack gap={1} flexWrap="wrap">
                                  {handler.messageFormats.map((format, formatIndex) => (
                                    <Badge key={formatIndex} variant="subtle" colorPalette="gray" size="sm">
                                      {format}
                                    </Badge>
                                  ))}
                                </HStack>
                              )}
                            </Box>
                          ))}
                        </VStack>
                      </Box>
                    )}
                  </Box>
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
              <VStack gap={3} align="stretch" overflow="auto">
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

            {/* Providers Section */}
            <Box
              p={6}
              borderWidth="1px"
              borderRadius="lg"
              bg="white"
              shadow="sm"
              borderColor="border.default"
            >
              <Text fontSize="lg" fontWeight="bold" mb={4} color="fg.default">
                Providers ({infoData.providers?.length || 0})
              </Text>
              <VStack gap={3} align="stretch" maxH="300px" overflow="auto">
                {infoData.providers?.map((provider, index) => (
                  <Box
                    key={index}
                    p={3}
                    borderWidth="1px"
                    borderRadius="md"
                    borderColor="border.subtle"
                    bg="bg.subtle"
                  >
                    <Flex justify="space-between" align="center">
                      <Text fontSize="sm" fontWeight="semibold" color="fg.default">
                        {provider.id}
                      </Text>
                      <Badge variant="subtle" colorPalette="green" fontSize="xs">
                        {provider.type}
                      </Badge>
                    </Flex>
                  </Box>
                ))}
                {(!infoData.providers || infoData.providers.length === 0) && (
                  <Text fontSize="sm" color="fg.muted">No providers configured</Text>
                )}
              </VStack>
            </Box>

            {/* Snap Stores Section */}
            <Box
              p={6}
              borderWidth="1px"
              borderRadius="lg"
              bg="white"
              shadow="sm"
              borderColor="border.default"
            >
              <Text fontSize="lg" fontWeight="bold" mb={4} color="fg.default">
                Snap Stores ({infoData.snapStores?.length || 0})
              </Text>
              <VStack gap={3} align="stretch" maxH="300px" overflow="auto">
                {infoData.snapStores?.map((snapStore, index) => (
                  <Box
                    key={index}
                    p={3}
                    borderWidth="1px"
                    borderRadius="md"
                    borderColor="border.subtle"
                    bg="bg.subtle"
                  >
                    <Flex justify="space-between" align="center">
                      <Text fontSize="sm" fontWeight="semibold" color="fg.default">
                        {snapStore.id}
                      </Text>
                      <Badge variant="subtle" colorPalette="orange" fontSize="xs">
                        {snapStore.type}
                      </Badge>
                    </Flex>
                  </Box>
                ))}
                {(!infoData.snapStores || infoData.snapStores.length === 0) && (
                  <Text fontSize="sm" color="fg.muted">No snap stores configured</Text>
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