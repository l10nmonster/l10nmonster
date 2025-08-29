import React from 'react';
import { Container, Text, Box, Spinner, Alert, VStack, Grid, Badge, Flex, Button } from '@chakra-ui/react';
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
        {/* Header */}
        <Box textAlign="center">
          <Text fontSize="2xl" fontWeight="bold" mb={2}>
            Translation Memory Summary
          </Text>
          <Text color="fg.muted">
            Overview of jobs by translation provider for each language pair
          </Text>
        </Box>

        {/* TM Stats by Translation Pair */}
        {Object.keys(tmStats).length === 0 ? (
          <Box p={6} borderWidth="1px" borderRadius="md" bg="white" textAlign="center">
            <Text color="fg.muted">No translation memory data found.</Text>
          </Box>
        ) : (
          <Flex justify="center" w="100%">
            <Grid 
              templateColumns="repeat(auto-fit, 900px)" 
              gap={6} 
              justifyItems="center"
              justifyContent="center"
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
          </Flex>
        )}
      </VStack>
    </Box>
  );
};

export default TM;