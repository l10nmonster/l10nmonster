import React, { useState } from 'react';
import { Container, Text, Box, Button, Grid, Spinner, Alert, Flex, Switch, Link } from '@chakra-ui/react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ProjectCard from '../components/ProjectCard';
import { fetchApi } from '../utils/api';

const Status = () => {
  const navigate = useNavigate();
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

  const calculateCompletionPercentage = (pairSummaryByStatus) => {
    const totalSegs = Object.values(pairSummaryByStatus).reduce((sum, count) => sum + count, 0);
    if (totalSegs === 0) return 100;
    
    return Math.round((pairSummaryByStatus.translated || 0) / totalSegs * 100);
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

      {/* Iterate over source languages -> target languages -> channels -> projects */}
      {Object.entries(statusData).map(([sourceLang, targetLangs]) => (
        Object.entries(targetLangs).map(([targetLang, channels]) => (
          <Box 
            key={`${sourceLang}-${targetLang}`} 
            mb={6} 
            p={4} 
            borderWidth="1px" 
            borderRadius="md" 
            bg="white"
            borderColor="border.default"
          >
            {/* Language Pair Header */}
            <Box display="flex" alignItems="center" gap={3} flexWrap="wrap" mb={4}>
              <Link 
                as={RouterLink}
                to={`/status/${sourceLang}/${targetLang}`}
                fontSize="xl" 
                fontWeight="semibold" 
                color="blue.600"
                _hover={{ textDecoration: "underline" }}
              >
                {sourceLang} → {targetLang}
              </Link>
            </Box>

            {/* Channels within this language pair */}
            {Object.entries(channels).map(([channelId, projects]) => (
              <Box key={`${sourceLang}-${targetLang}-${channelId}`} mb={4}>
                <Box display="flex" alignItems="center" gap={3} flexWrap="wrap" mb={3}>
                  <Box>
                    <Text fontSize="sm" color="fg.muted" mb={1}>Channel</Text>
                    <Text fontSize="lg" fontWeight="medium" color="green.600">
                      {channelId}
                    </Text>
                  </Box>
                </Box>

                <Grid templateColumns="repeat(auto-fit, minmax(300px, 1fr))" gap={4}>
                  {Object.entries(projects)
                    .filter(([projectName, projectData]) => {
                      if (!hideComplete) return true;
                      
                      // Calculate completion percentage from pairSummaryByStatus
                      const completionPercentage = calculateCompletionPercentage(projectData.pairSummaryByStatus);
                      
                      return completionPercentage < 100;
                    })
                    .map(([projectName, projectData]) => {
                      return (
                        <ProjectCard 
                          key={`${sourceLang}-${targetLang}-${channelId}-${projectName}`}
                          project={{ 
                            translationStatus: projectData.details || [],
                            pairSummary: projectData.pairSummary,
                            pairSummaryByStatus: projectData.pairSummaryByStatus,
                            projectName
                          }} 
                        />
                      );
                    })}
                </Grid>
              </Box>
            ))}
          </Box>
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