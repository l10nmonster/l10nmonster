import React, { useState, useMemo } from 'react';
import { Box, Text, Spinner, Alert, Flex } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { fetchApi } from '../utils/api';
import ProviderList from '../components/ProviderList';
import ProviderDetail from '../components/ProviderDetail';

const Providers = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedProvider, setSelectedProvider] = useState(() => {
    return searchParams.get('provider') || null;
  });

  // Load provider list from /api/info (faster)
  const { data: info = {}, isLoading: loading, error } = useQuery({
    queryKey: ['info'],
    queryFn: () => fetchApi('/api/info'),
  });

  const providers = info.providers || [];

  // Get sorted providers to ensure consistent ordering
  const sortedProviders = useMemo(() => {
    return providers
      .slice()
      .sort((a, b) => {
        const aName = typeof a === 'object' && a?.id ? a.id : a;
        const bName = typeof b === 'object' && b?.id ? b.id : b;
        return aName.localeCompare(bName);
      });
  }, [providers]);

  // Auto-select first provider when data loads (only if no provider in URL)
  React.useEffect(() => {
    if (sortedProviders.length > 0 && !selectedProvider) {
      const firstProvider = sortedProviders[0];
      const providerId = typeof firstProvider === 'object' && firstProvider?.id ? firstProvider.id : firstProvider;
      setSelectedProvider(providerId);
      setSearchParams({ provider: providerId }, { replace: true });
    }
  }, [sortedProviders, selectedProvider, setSearchParams]);

  // Handle provider selection with URL update
  const handleProviderSelect = (providerId) => {
    setSelectedProvider(providerId);
    setSearchParams({ provider: providerId });
  };

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
            providers={sortedProviders}
            selectedProvider={selectedProvider}
            onProviderSelect={handleProviderSelect}
          />
          
          {/* Provider Detail (Detail) */}
          <ProviderDetail
            providerId={selectedProvider}
          />
        </Flex>
      </Box>
    </Box>
  );
};

export default Providers;