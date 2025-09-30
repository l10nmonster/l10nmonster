import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Container, Text, Box, Button, Grid, Spinner, Alert, Flex, Switch, Link, Collapsible, IconButton } from '@chakra-ui/react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ProjectCard from '../components/ProjectCard';
import { fetchApi } from '../utils/api';

// Individual channel component with lazy loading
const ChannelContainer = ({ channelId, hideComplete, calculateCompletionPercentage, hasIncompleteContent }) => {
  const [shouldLoad, setShouldLoad] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const containerRef = useRef(null);

  // Set up intersection observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoad(true);
            observer.disconnect(); // Only trigger once
          }
        });
      },
      {
        rootMargin: '200px', // Start loading 200px before the element comes into view
        threshold: 0,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Query for this specific channel
  const { data: channelData, isLoading, error } = useQuery({
    queryKey: ['status', channelId],
    queryFn: () => fetchApi(`/api/status/${channelId}`),
    enabled: shouldLoad,
  });

  // Filter channel data based on hideComplete
  const filteredChannelData = useMemo(() => {
    if (!channelData || !hideComplete) return channelData;

    const filtered = {};
    Object.entries(channelData).forEach(([sourceLang, targetLangs]) => {
      const filteredTargetLangs = {};

      Object.entries(targetLangs).forEach(([targetLang, projects]) => {
        const filteredProjects = {};

        Object.entries(projects).forEach(([projectName, projectData]) => {
          if (hasIncompleteContent(projectData.pairSummaryByStatus)) {
            filteredProjects[projectName] = projectData;
          }
        });

        if (Object.keys(filteredProjects).length > 0) {
          filteredTargetLangs[targetLang] = filteredProjects;
        }
      });

      if (Object.keys(filteredTargetLangs).length > 0) {
        filtered[sourceLang] = filteredTargetLangs;
      }
    });

    return Object.keys(filtered).length > 0 ? filtered : null;
  }, [channelData, hideComplete, hasIncompleteContent]);

  // Calculate language pair count for collapsed state
  const languagePairCount = useMemo(() => {
    if (!filteredChannelData) return 0;
    return Object.values(filteredChannelData).reduce((total, targetLangs) => {
      return total + Object.keys(targetLangs).length;
    }, 0);
  }, [filteredChannelData]);

  // Don't render if filtered out AND we have data (to avoid hiding channels before they load)
  if (hideComplete && !filteredChannelData && channelData !== undefined) {
    return null;
  }

  return (
    <Box
      ref={containerRef}
      mb={8}
      p={6}
      borderWidth="2px"
      borderRadius="lg"
      bg="white"
      borderColor="green.200"
    >
      {/* Channel Header */}
      <Box display="flex" alignItems="center" gap={3} flexWrap="wrap" mb={6} pb={4} borderBottom="2px" borderColor="green.100">
        <IconButton
          aria-label={isExpanded ? "Collapse channel" : "Expand channel"}
          onClick={() => setIsExpanded(!isExpanded)}
          variant="ghost"
          size="sm"
        >
          {isExpanded ? "▼" : "▶"}
        </IconButton>
        <Box>
          <Text fontSize="sm" color="fg.muted" mb={1}>Channel</Text>
          <Text fontSize="lg" fontWeight="bold" color="green.600">
            {channelId}
          </Text>
        </Box>
        {isLoading && (
          <Spinner size="md" />
        )}
      </Box>

      {/* Channel content */}
      <Collapsible.Root open={isExpanded}>
        <Collapsible.Content>
          {error ? (
            <Alert status="error">
              <Box>
                <Text fontWeight="bold">Error loading channel {channelId}</Text>
                <Text>{error.message || 'Unknown error'}</Text>
              </Box>
            </Alert>
          ) : isLoading ? (
            <Box display="flex" justifyContent="center" py={8}>
              <Text color="fg.muted">Loading channel data...</Text>
            </Box>
          ) : filteredChannelData && Object.keys(filteredChannelData).length > 0 ? (
            /* Language Pairs within this channel */
            Object.entries(filteredChannelData).map(([sourceLang, targetLangs]) => (
              Object.entries(targetLangs).map(([targetLang, projects]) => (
                <Box
                  key={`${sourceLang}-${targetLang}`}
                  mb={6}
                  p={4}
                  borderWidth="1px"
                  borderRadius="md"
                  bg="gray.50"
                  borderColor="border.default"
                >
                  {/* Language Pair Header */}
                  <Box display="flex" alignItems="center" gap={3} flexWrap="wrap" mb={4}>
                    <Link
                      as={RouterLink}
                      to={`/status/${channelId}/${sourceLang}/${targetLang}`}
                      fontSize="lg"
                      fontWeight="semibold"
                      color="blue.600"
                      _hover={{ textDecoration: "underline" }}
                    >
                      {sourceLang} → {targetLang}
                    </Link>
                  </Box>

                  {/* Projects within this language pair */}
                  <Grid templateColumns="repeat(auto-fit, minmax(300px, 1fr))" gap={4}>
                    {Object.entries(projects).map(([projectName, projectData]) => {
                      return (
                        <ProjectCard
                          key={`${channelId}-${sourceLang}-${targetLang}-${projectName}`}
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
              ))
            ))
          ) : channelData && Object.keys(channelData).length === 0 ? (
            <Box display="flex" justifyContent="center" py={8}>
              <Text color="fg.muted">This channel has no projects</Text>
            </Box>
          ) : !shouldLoad ? (
            <Box display="flex" justifyContent="center" py={8}>
              <Text color="fg.muted">Scroll down to load content...</Text>
            </Box>
          ) : (
            <Box display="flex" justifyContent="center" py={8}>
              <Text color="fg.muted">No content available for this channel</Text>
            </Box>
          )}
        </Collapsible.Content>
      </Collapsible.Root>

      {/* Show summary when collapsed */}
      {!isExpanded && filteredChannelData && (
        <Box display="flex" justifyContent="center" py={4}>
          <Text fontSize="sm" color="gray.600" fontStyle="italic">
            {languagePairCount} language pair{languagePairCount !== 1 ? 's' : ''} (collapsed)
          </Text>
        </Box>
      )}
    </Box>
  );
};

const Status = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [hideComplete, setHideComplete] = useState(() => {
    return searchParams.get('hideComplete') === 'true';
  });

  // First, fetch the info to get channel IDs
  const { data: infoData, isLoading: isLoadingInfo, error: infoError } = useQuery({
    queryKey: ['info'],
    queryFn: () => fetchApi('/api/info'),
  });

  const channelIds = infoData?.channels?.map(channel => channel.id) || [];

  const loading = isLoadingInfo;
  const error = infoError;

  // Update URL when hideComplete changes
  useEffect(() => {
    const newSearchParams = new URLSearchParams(searchParams);
    if (hideComplete) {
      newSearchParams.set('hideComplete', 'true');
    } else {
      newSearchParams.delete('hideComplete');
    }
    setSearchParams(newSearchParams, { replace: true });
  }, [hideComplete, searchParams, setSearchParams]);

  const calculateCompletionPercentage = (pairSummaryByStatus) => {
    const totalSegs = Object.values(pairSummaryByStatus).reduce((sum, count) => sum + count, 0);
    if (totalSegs === 0) return 100;

    return Math.round((pairSummaryByStatus.translated || 0) / totalSegs * 100);
  };

  const hasIncompleteContent = (pairSummaryByStatus) => {
    // A project has incomplete content if it has any untranslated, in flight, or low quality segments
    return (pairSummaryByStatus.untranslated || 0) > 0 ||
           (pairSummaryByStatus['in flight'] || 0) > 0 ||
           (pairSummaryByStatus['low quality'] || 0) > 0;
  };


  if (isLoadingInfo) {
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

      {/* Render each channel with lazy loading */}
      {channelIds.map((channelId) => (
        <ChannelContainer
          key={channelId}
          channelId={channelId}
          hideComplete={hideComplete}
          calculateCompletionPercentage={calculateCompletionPercentage}
          hasIncompleteContent={hasIncompleteContent}
        />
      ))}

      {/* Handle case where no channels found */}
      {channelIds.length === 0 && !loading && (
        <Text mt={4} color="fg.muted">
          No channels found.
        </Text>
      )}
    </Box>
  );
};

export default Status; 