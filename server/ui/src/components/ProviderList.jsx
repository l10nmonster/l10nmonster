import React from 'react';
import { Box, Text, VStack } from '@chakra-ui/react';

const ProviderList = ({ providers, selectedProvider, onProviderSelect }) => {
  const providerIds = Object.keys(providers || {});

  return (
    <Box 
      w="300px" 
      borderRight="1px" 
      borderColor="border.default" 
      p={4}
      bg="bg.muted"
      minH="70vh"
    >
      <Text fontSize="lg" fontWeight="bold" mb={4}>
        Providers
      </Text>
      
      <VStack gap={2} align="stretch">
        {providerIds.map((providerId) => (
          <Box
            key={providerId}
            p={3}
            borderRadius="md"
            cursor="pointer"
            bg={selectedProvider === providerId ? "blue.subtle" : "white"}
            borderWidth="1px"
            borderColor={selectedProvider === providerId ? "blue.600" : "border.default"}
            _hover={{ 
              bg: selectedProvider === providerId ? "blue.subtle" : "gray.subtle" 
            }}
            onClick={() => onProviderSelect(providerId)}
          >
            <Text fontSize="sm" fontWeight="medium" noOfLines={2}>
              {providerId}
            </Text>
            {providers[providerId]?.info?.type && (
              <Text fontSize="xs" color="fg.muted" mt={1}>
                {providers[providerId].info.type}
              </Text>
            )}
          </Box>
        ))}
        
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