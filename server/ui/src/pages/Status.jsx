import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Container, Text, Box, Button, Grid, Spinner, Flex, Switch, Link, Collapsible, IconButton } from '@chakra-ui/react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ProjectCard from '../components/ProjectCard';
import MultiSelectFilter from '../components/MultiSelectFilter';
import { fetchApi } from '../utils/api';
import ErrorBox from '../components/ErrorBox';

// Individual channel component with lazy loading
const ChannelContainer = ({ channelId, hideComplete, selectedLanguagePairs, calculateCompletionPercentage, hasIncompleteContent }) => {
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

  // Filter channel data based on hideComplete and selectedLanguagePairs
  const filteredChannelData = useMemo(() => {
    if (!channelData) return channelData;

    const filtered = {};
    Object.entries(channelData).forEach(([sourceLang, targetLangs]) => {
      const filteredTargetLangs = {};

      Object.entries(targetLangs).forEach(([targetLang, projects]) => {
        // Filter by selected language pairs if any are selected
        if (selectedLanguagePairs.length > 0) {
          const langPair = `${sourceLang} → ${targetLang}`;
          if (!selectedLanguagePairs.includes(langPair)) {
            return; // Skip this language pair
          }
        }

        const filteredProjects = {};

        Object.entries(projects).forEach(([projectName, projectData]) => {
          // Filter by hideComplete if enabled
          if (hideComplete && !hasIncompleteContent(projectData.pairSummaryByStatus)) {
            return; // Skip complete projects
          }
          filteredProjects[projectName] = projectData;
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
  }, [channelData, hideComplete, selectedLanguagePairs, hasIncompleteContent]);

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
      </Box>

      {/* Channel content */}
      <Collapsible.Root open={isExpanded}>
        <Collapsible.Content>
          {error ? (
            <ErrorBox error={error} title={`Error loading channel ${channelId}`} />
          ) : isLoading ? (
            <Box display="flex" flexDirection="column" alignItems="center" gap={3} py={8}>
              <Spinner size="md" />
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
                  <Grid templateColumns="repeat(auto-fit, minmax(420px, 1fr))" gap={4}>
                    {Object.entries(projects).map(([projectName, projectData]) => {
                      return (
                        <ProjectCard
                          key={`${channelId}-${sourceLang}-${targetLang}-${projectName}`}
                          project={{
                            translatedDetails: projectData.translatedDetails || [],
                            untranslatedDetails: projectData.untranslatedDetails || {},
                            pairSummary: projectData.pairSummary,
                            pairSummaryByStatus: projectData.pairSummaryByStatus,
                            projectName
                          }}
                          channelId={channelId}
                          sourceLang={sourceLang}
                          targetLang={targetLang}
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
  const [selectedLanguagePairs, setSelectedLanguagePairs] = useState(() => {
    const pairs = searchParams.get('pairs');
    if (!pairs) return [];
    // Convert URL format (en*es) to display format (en → es)
    return pairs.split(',').map(p => p.replace('*', ' → '));
  });

  // Fetch the info to get channel IDs
  const { data: infoData, isLoading: isLoadingInfo, error: infoError } = useQuery({
    queryKey: ['info'],
    queryFn: () => fetchApi('/api/info'),
  });

  // Fetch TM stats to get available language pairs
  const { data: tmStats } = useQuery({
    queryKey: ['tmStats'],
    queryFn: () => fetchApi('/api/tm/stats'),
  });

  // Build language pair options from TM stats (array of [sourceLang, targetLang] tuples)
  const languagePairOptions = useMemo(() => {
    if (!tmStats || !Array.isArray(tmStats)) return [];
    return tmStats.map(([sourceLang, targetLang]) => `${sourceLang} → ${targetLang}`);
  }, [tmStats]);

  const channelIds = infoData?.channels?.map(channel => channel.id) || [];

  const loading = isLoadingInfo;
  const error = infoError;

  // Update URL when filters change
  useEffect(() => {
    const newSearchParams = new URLSearchParams(searchParams);
    if (hideComplete) {
      newSearchParams.set('hideComplete', 'true');
    } else {
      newSearchParams.delete('hideComplete');
    }
    if (selectedLanguagePairs.length > 0) {
      // Convert display format (en → es) to URL format (en*es)
      const urlPairs = selectedLanguagePairs.map(p => p.replace(' → ', '*')).join(',');
      newSearchParams.set('pairs', urlPairs);
    } else {
      newSearchParams.delete('pairs');
    }
    setSearchParams(newSearchParams, { replace: true });
  }, [hideComplete, selectedLanguagePairs, searchParams, setSearchParams]);

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
        <ErrorBox error={error} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Blue subheader with filters */}
      <Box
        bg="blue.subtle"
        borderBottom="1px"
        borderColor="blue.muted"
        shadow="md"
        borderLeft="4px"
        borderLeftColor="blue.500"
        px={6}
        py={4}
      >
        <Flex align="center" justify="space-between">
          <Text fontSize="md" fontWeight="semibold" color="blue.700">
            Translation Status
          </Text>
          <Flex align="center" gap={6}>
            <Flex align="center" gap={2}>
              <Text fontSize="sm" color="blue.600">Hide Complete</Text>
              <Switch.Root
                checked={hideComplete}
                onCheckedChange={(details) => setHideComplete(details.checked)}
                size="sm"
                colorPalette="blue"
              >
                <Switch.HiddenInput />
                <Switch.Control bg={hideComplete ? "blue.500" : "gray.300"}>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch.Root>
            </Flex>
            <Flex align="center" gap={2}>
              <Text fontSize="sm" color="blue.600">Language Pairs</Text>
              <Box minW="150px">
                <MultiSelectFilter
                  value={selectedLanguagePairs}
                  onChange={setSelectedLanguagePairs}
                  options={languagePairOptions}
                  placeholder="All"
                />
              </Box>
            </Flex>
          </Flex>
        </Flex>
      </Box>

      {/* Content area */}
      <Box py={6} px={6}>
        {/* Render each channel with lazy loading */}
        {channelIds.map((channelId) => (
          <ChannelContainer
            key={channelId}
            channelId={channelId}
            hideComplete={hideComplete}
            selectedLanguagePairs={selectedLanguagePairs}
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
    </Box>
  );
};

export default Status; 