import React, { useState } from 'react';
import { Box, Text, Spinner, Alert, Flex } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../utils/api';
import ProviderList from '../components/ProviderList';
import ProviderDetail from '../components/ProviderDetail';

const Providers = () => {
  const [selectedProvider, setSelectedProvider] = useState(null);

  const { data: providers = {}, isLoading: loading, error } = useQuery({
    queryKey: ['providers'],
    queryFn: () => fetchApi('/api/providers'),
  });

  // Auto-select first provider when data loads
  React.useEffect(() => {
    if (providers && Object.keys(providers).length > 0 && !selectedProvider) {
      setSelectedProvider(Object.keys(providers)[0]);
    }
  }, [providers, selectedProvider]);

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
            <Text>{error?.message || 'Failed to fetch provider data'}</Text>
          </Box>
        </Alert>
      </Box>
    );
  }

  return (
    <Box py={6} px={6}>
      {/* Header */}
      <Box textAlign="center" mb={6}>
        <Text fontSize="2xl" fontWeight="bold" mb={2}>
          Translation Providers
        </Text>
        <Text color="fg.muted">
          Configuration and details for all available translation providers
        </Text>
      </Box>

      {/* Master/Detail Layout */}
      <Box 
        borderWidth="1px" 
        borderRadius="lg" 
        bg="white" 
        shadow="sm"
        overflow="hidden"
        minH="70vh"
      >
        <Flex>
          {/* Provider List (Master) */}
          <ProviderList 
            providers={providers}
            selectedProvider={selectedProvider}
            onProviderSelect={setSelectedProvider}
          />
          
          {/* Provider Detail (Detail) */}
          <ProviderDetail 
            provider={providers[selectedProvider]}
            providerId={selectedProvider}
          />
        </Flex>
      </Box>
    </Box>
  );
};

export default Providers;