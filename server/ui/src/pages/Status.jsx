import React, { useState } from 'react';
import { Container, Text, Box, Button, Grid, Spinner, Alert, Flex, Switch } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ProjectCard from '../components/ProjectCard';
import { fetchApi } from '../utils/api';

const Status = () => {
  const [hideComplete, setHideComplete] = useState(false);

  const { data: statusData = {}, isLoading: loading, error } = useQuery({
    queryKey: ['status'],
    queryFn: () => fetchApi('/api/status'),
  });

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={5}>
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

  const calculateCompletionPercentage = (translationStatusArray, segmentCount) => {
    const pairSummary = { translated: 0 };
    
    for (const { minQ, q, seg } of translationStatusArray) {
      const tuType = q === null ? 'untranslated' : (q === 0 ? 'in flight' : (q >= minQ ? 'translated' : 'low quality'));
      if (tuType === 'translated') {
        pairSummary.translated += seg;
      }
    }
    
    return Math.round(pairSummary.translated / segmentCount * 100);
  };

  return (
    <Box py={6} px={6}>
      {/* Hide Complete Toggle */}
      <Flex align="center" gap={3} mb={6}>
        <Switch.Root
          checked={hideComplete}
          onCheckedChange={(details) => setHideComplete(details.checked)}
        >
          <Switch.HiddenInput />
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          <Switch.Label>
            <Text fontSize="md" fontWeight="medium">Hide complete</Text>
          </Switch.Label>
        </Switch.Root>
      </Flex>

      {/* Iterate over source languages */}
      {Object.entries(statusData).map(([channelId, projects]) => (
        Object.entries(projects).map(([projectName, pairs]) => (
          Object.entries(pairs).map(([sourceLang, targetLangs]) => (
              <Box 
              key={`${sourceLang}-${channelId}-${projectName}`} 
              mb={6} 
              p={3} 
              borderWidth="1px" 
              borderRadius="md" 
              bg="white"
              borderColor="border.default"
            >
              <Box display="flex" alignItems="center" gap={3} flexWrap="wrap">
                <Box>
                  <Text fontSize="sm" color="fg.muted" mb={1}>Channel</Text>
                  <Text fontSize="xl" fontWeight="semibold" color="blue.600">
                    {channelId}
                  </Text>
                </Box>
                <Box height="40px" width="1px" bg="border.default" />
                <Box>
                  <Text fontSize="sm" color="fg.muted" mb={1}>Project</Text>
                  <Text fontSize="xl" fontWeight="semibold" color="green.600">
                    {projectName}
                  </Text>
                </Box>
              </Box>

              <Grid templateColumns="repeat(auto-fit, minmax(300px, 1fr))" gap={4} mt={4}>
                {Object.entries(targetLangs)
                  .filter(([targetLang, translationStatusArray]) => {
                    if (!hideComplete) return true;
                    
                    // Calculate totals from the translation status array
                    const segmentCount = translationStatusArray.reduce((sum, item) => sum + item.seg, 0);
                    const completionPercentage = calculateCompletionPercentage(translationStatusArray, segmentCount);
                    
                    return completionPercentage < 100;
                  })
                  .map(([targetLang, translationStatusArray]) => {
                    // Calculate totals from the translation status array
                    const resCount = translationStatusArray.reduce((sum, item) => sum + item.res, 0);
                    const segmentCount = translationStatusArray.reduce((sum, item) => sum + item.seg, 0);
                    
                    return (
                      <ProjectCard 
                        key={`${sourceLang}-${targetLang}-${projectName}-${channelId}`}
                        project={{ 
                          sourceLang, 
                          targetLang, 
                          resCount,
                          segmentCount,
                          translationStatus: translationStatusArray 
                        }} 
                      />
                    );
                  })}
              </Grid>
            </Box>
          ))
        ))
      ))}
      
      {/* Handle case where no language pairs were returned */}
      {Object.keys(statusData).length === 0 && !loading && (
        <Text mt={4} color="fg.muted">No active content found.</Text>
      )}
    </Box>
  );
};

export default Status; 