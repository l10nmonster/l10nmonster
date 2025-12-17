import React, { useMemo } from 'react';
import { Text, Box, Spinner, Alert, VStack, Flex, Button, SimpleGrid } from '@chakra-ui/react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../utils/api';
import LanguagePairSelector from '../components/LanguagePairSelector';

const TMToc = () => {
  const navigate = useNavigate();

  const { data: tocData, isLoading, error } = useQuery({
    queryKey: ['tmToc'],
    queryFn: () => fetchApi('/api/tm/toc'),
  });

  const handleLanguagePairSelect = (sourceLang, targetLang) => {
    navigate(`/tm/${sourceLang}/${targetLang}`);
  };

  // Flatten the nested structure into an array of cards
  const languagePairCards = useMemo(() => {
    if (!tocData) return [];

    const cards = [];
    for (const [sourceLang, targets] of Object.entries(tocData)) {
      for (const [targetLang, stores] of Object.entries(targets)) {
        cards.push({
          sourceLang,
          targetLang,
          stores: stores || []
        });
      }
    }

    // Sort by language pair
    return cards.sort((a, b) => {
      const labelA = `${a.sourceLang} → ${a.targetLang}`;
      const labelB = `${b.sourceLang} → ${b.targetLang}`;
      return labelA.localeCompare(labelB);
    });
  }, [tocData]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatNumber = (num) => {
    if (num === undefined || num === null) return '0';
    return num.toLocaleString();
  };

  if (isLoading) {
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
            <Text>{error?.message || 'Failed to load TM data'}</Text>
          </Box>
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Language Pair Selector for quick navigation */}
      <LanguagePairSelector onSelect={handleLanguagePairSelect} />

      {/* Cards Grid */}
      <Box py={6} px={6}>
        {languagePairCards.length === 0 ? (
          <Box p={6} borderWidth="1px" borderRadius="md" bg="white" textAlign="center">
            <Text color="fg.muted">No translation memory data found.</Text>
          </Box>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3, xl: 4 }} gap={4}>
            {languagePairCards.map(({ sourceLang, targetLang, stores }) => (
              <Box
                key={`${sourceLang}-${targetLang}`}
                bg="white"
                borderWidth="1px"
                borderColor="border.default"
                borderRadius="lg"
                shadow="sm"
                overflow="hidden"
              >
                {/* Card Header */}
                <Box
                  bg="blue.subtle"
                  px={4}
                  py={3}
                  borderBottom="1px"
                  borderColor="blue.muted"
                >
                  <Text fontSize="md" fontWeight="semibold" color="blue.700">
                    {sourceLang} → {targetLang}
                  </Text>
                </Box>

                {/* Card Body - List of stores */}
                <VStack align="stretch" gap={2} p={4}>
                  {stores.length === 0 ? (
                    <Text fontSize="sm" color="fg.muted">No stores</Text>
                  ) : (
                    stores.map((store, index) => (
                      <Box key={index}>
                        <Flex justify="space-between" align="baseline">
                          <Text fontSize="sm" fontWeight="medium" color="fg.default">
                            {store.tmStore ?? 'New/Unassigned'}
                          </Text>
                          <Text fontSize="sm" color="fg.muted">
                            {formatNumber(store.jobCount)} jobs
                          </Text>
                        </Flex>
                        <Text fontSize="xs" color="fg.muted">
                          Last job: {formatDate(store.lastUpdatedAt)}
                        </Text>
                      </Box>
                    ))
                  )}
                </VStack>

                {/* Card Footer - Action buttons */}
                <Flex
                  px={4}
                  py={3}
                  borderTop="1px"
                  borderColor="border.default"
                  gap={2}
                  justify="flex-end"
                >
                  <Button
                    as={RouterLink}
                    to={`/tm/${sourceLang}/${targetLang}`}
                    size="sm"
                    colorPalette="blue"
                    variant="outline"
                  >
                    Search
                  </Button>
                  <Button
                    as={RouterLink}
                    to={`/tm/providers/${sourceLang}/${targetLang}`}
                    size="sm"
                    variant="ghost"
                  >
                    Providers
                  </Button>
                </Flex>
              </Box>
            ))}
          </SimpleGrid>
        )}
      </Box>
    </Box>
  );
};

export default TMToc;
