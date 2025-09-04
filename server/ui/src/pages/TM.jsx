import React, { useMemo } from 'react';
import { Container, Text, Box, Spinner, Alert, VStack, Grid, Badge, Flex, Button, Select } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../utils/api';
import TMCard from '../components/TMCard';

const TM = () => {
  const navigate = useNavigate();

  const { data: tmStats = {}, isLoading: loading, error } = useQuery({
    queryKey: ['tmStats'],
    queryFn: () => fetchApi('/api/tm/stats'),
  });

  // Extract all language pairs for the dropdown
  const languagePairs = useMemo(() => {
    const pairs = [];
    Object.entries(tmStats).forEach(([sourceLang, targetLangs]) => {
      Object.keys(targetLangs).forEach(targetLang => {
        pairs.push({ 
          value: `${sourceLang}|${targetLang}`, 
          label: `${sourceLang} → ${targetLang}`,
          sourceLang,
          targetLang
        });
      });
    });
    return pairs.sort((a, b) => a.label.localeCompare(b.label));
  }, [tmStats]);

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
    <Box py={6} px={6}>
      <VStack gap={6} align="stretch">
        {/* Quick Access Dropdown */}
        {languagePairs.length > 0 && (
          <Box width="300px" mx="auto">
            <Select.Root
              positioning={{ 
                strategy: "absolute",
                placement: "bottom-start",
                flip: true,
                gutter: 4,
                offset: { mainAxis: 0, crossAxis: 0 }
              }}
            >
              <Select.Trigger>
                <Text fontSize="sm" flex="1" textAlign="left" color="fg.muted">
                  Select language pair...
                </Text>
                <Select.Indicator />
              </Select.Trigger>
              <Select.Positioner>
                <Select.Content 
                  zIndex={1000}
                  bg="white"
                  borderWidth="1px"
                  borderColor="border.default"
                  borderRadius="md"
                  shadow="lg"
                  maxH="200px"
                  overflow="auto"
                  minWidth="300px"
                  width="300px"
                >
                  {languagePairs.map((pair) => (
                    <Select.Item 
                      key={pair.value} 
                      item={pair.value}
                      value={pair.value}
                      onClick={() => handleLanguagePairSelect(pair.value)}
                    >
                      <Select.ItemText>{pair.label}</Select.ItemText>
                      <Select.ItemIndicator />
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Positioner>
            </Select.Root>
          </Box>
        )}

        {/* TM Stats by Translation Pair */}
        {Object.keys(tmStats).length === 0 ? (
          <Box p={6} borderWidth="1px" borderRadius="md" bg="white" textAlign="center">
            <Text color="fg.muted">No translation memory data found.</Text>
          </Box>
        ) : (
          <Grid 
            templateColumns={{ 
              base: "1fr", 
              lg: "repeat(auto-fit, minmax(600px, 1fr))" 
            }} 
            gap={6} 
            maxW="none"
            w="100%"
          >
            {Object.entries(tmStats).flatMap(([sourceLang, targetLangs]) =>
              Object.entries(targetLangs).map(([targetLang, providers]) => (
                <TMCard 
                  key={`${sourceLang}-${targetLang}`}
                  sourceLang={sourceLang}
                  targetLang={targetLang}
                  providers={providers}
                />
              ))
            )}
          </Grid>
        )}
      </VStack>
    </Box>
  );
};

export default TM;