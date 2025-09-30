import React from 'react';
import { Box, Text, VStack } from '@chakra-ui/react';

const ProviderList = ({ providers, selectedProvider, onProviderSelect }) => {
  const providerIds = Array.isArray(providers) ? providers : [];

  return (
    <Box
      width="25%"
      flexShrink={0}
      borderRight="1px"
      borderColor="border.default"
      p={4}
      bg="yellow.subtle"
      minH="70vh"
    >
      <Text fontSize="lg" fontWeight="bold" mb={4}>
        Providers
      </Text>

      <VStack gap={2} align="stretch">
        {providerIds.map((providerData) => {
            const displayName = typeof providerData === 'object' && providerData?.id ? providerData.id : providerData;
            const actualId = typeof providerData === 'object' && providerData?.id ? providerData.id : providerData;
            const providerType = typeof providerData === 'object' && providerData?.type ? providerData.type : null;

            return (
              <Box
                key={actualId}
                p={3}
                borderRadius="md"
                cursor="pointer"
                bg={selectedProvider === actualId ? "blue.subtle" : "white"}
                borderWidth="1px"
                borderColor={selectedProvider === actualId ? "blue.600" : "border.default"}
                _hover={{
                  bg: selectedProvider === actualId ? "blue.subtle" : "gray.subtle"
                }}
                onClick={() => onProviderSelect(actualId)}
              >
                <Text fontSize="sm" fontWeight="medium" noOfLines={2}>
                  {displayName}
                </Text>
                {providerType && (
                  <Text fontSize="xs" color="fg.muted" mt={1}>
                    {providerType}
                  </Text>
                )}
              </Box>
            );
          })}

        {providerIds.length === 0 && (
          <Text color="fg.muted" fontSize="sm" textAlign="center" mt={4}>
            No providers found
          </Text>
        )}
      </VStack>
    </Box>
  );
};

export default ProviderList;