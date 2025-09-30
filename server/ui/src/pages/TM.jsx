import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Container, Text, Box, Spinner, Alert, VStack, Grid, Badge, Flex, Button, Collapsible, SimpleGrid } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../utils/api';
import LazyTMCard from '../components/LazyTMCard';

// Chevron Icons
const ChevronDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
  </svg>
);

const ChevronUpIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
  </svg>
);

const TM = () => {
  const navigate = useNavigate();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { data: tmStatsPairs = [], isLoading: loading, error } = useQuery({
    queryKey: ['tmStats'],
    queryFn: () => fetchApi('/api/tm/stats'),
  });

  // Convert array format to language pairs for the dropdown
  const languagePairs = useMemo(() => {
    const pairs = tmStatsPairs.map(([sourceLang, targetLang]) => ({
      value: `${sourceLang}|${targetLang}`,
      label: `${sourceLang} → ${targetLang}`,
      sourceLang,
      targetLang
    }));
    return pairs.sort((a, b) => a.label.localeCompare(b.label));
  }, [tmStatsPairs]);

  const handleLanguagePairSelect = (pairValue) => {
    if (pairValue) {
      const [sourceLang, targetLang] = pairValue.split('|');
      navigate(`/tm/${sourceLang}/${targetLang}`);
    }
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
            <Text>{error}</Text>
          </Box>
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Collapsible Language Pairs Drawer */}
      {languagePairs.length > 0 && (
        <Box 
          bg="blue.subtle" 
          borderBottom="1px" 
          borderColor="blue.muted" 
          shadow="md"
          borderLeft="4px"
          borderLeftColor="blue.500"
        >
          <Collapsible.Root open={isDrawerOpen} onOpenChange={(details) => setIsDrawerOpen(details.open)}>
            <Box px={6} py={4}>
              <Collapsible.Trigger
                as={Button}
                variant="ghost"
                size="md"
                width="full"
                justifyContent="space-between"
                _hover={{ bg: "blue.muted" }}
                bg="transparent"
              >
                <Flex align="center" gap={3}>
                  <Text fontSize="md" fontWeight="semibold" color="blue.700">
                    Language Pairs
                  </Text>
                  <Badge 
                    colorPalette="blue" 
                    variant="subtle" 
                    size="sm"
                  >
                    {languagePairs.length}
                  </Badge>
                </Flex>
                <Box color="blue.600">
                  {isDrawerOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
                </Box>
              </Collapsible.Trigger>
            </Box>
            <Collapsible.Content>
              <Box px={6} pb={4}>
                <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4, xl: 5 }} gap={2}>
                  {languagePairs.map((pair) => (
                    <Button
                      key={pair.value}
                      variant="outline"
                      size="sm"
                      onClick={() => handleLanguagePairSelect(pair.value)}
                      _hover={{ bg: "blue.100", borderColor: "blue.400" }}
                      justifyContent="flex-start"
                      bg="white"
                      borderColor="blue.200"
                    >
                      <Text fontSize="xs" color="blue.700">{pair.label}</Text>
                    </Button>
                  ))}
                </SimpleGrid>
              </Box>
            </Collapsible.Content>
          </Collapsible.Root>
        </Box>
      )}

      {/* Main Content */}
      <Box py={6} px={6}>
        <VStack gap={6} align="stretch">

        {/* TM Stats in Single Column Layout */}
        {languagePairs.length === 0 ? (
          <Box p={6} borderWidth="1px" borderRadius="md" bg="white" textAlign="center">
            <Text color="fg.muted">No translation memory data found.</Text>
          </Box>
        ) : (
          <VStack gap={6} align="stretch" maxW="800px" mx="auto" w="100%">
            {languagePairs.map(({ sourceLang, targetLang }) => (
              <LazyTMCard
                key={`${sourceLang}-${targetLang}`}
                sourceLang={sourceLang}
                targetLang={targetLang}
              />
            ))}
          </VStack>
        )}
        </VStack>
      </Box>
    </Box>
  );
};

export default TM;