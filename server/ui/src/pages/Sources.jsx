import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Container, Text, Box, Spinner, VStack, Grid, Badge, Flex, Collapsible, IconButton } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../utils/api';
import SourceCard from '../components/SourceCard';
import SourcesHeader from '../components/SourcesHeader';
import ErrorBox from '../components/ErrorBox';

// Individual channel component with lazy loading
const ChannelContainer = ({ channelId }) => {
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
  const { data: channelResponse, isLoading, error } = useQuery({
    queryKey: ['channel', channelId],
    queryFn: () => fetchApi(`/api/channel/${channelId}`),
    enabled: shouldLoad,
  });

  // Extract data from the new response format
  const channelData = channelResponse?.projects || [];
  const snapTimestamp = channelResponse?.ts;
  const snapStore = channelResponse?.store;

  return (
    <Box
      ref={containerRef}
      p={6}
      borderWidth="2px"
      borderRadius="lg"
      bg="white"
      borderColor="green.200"
      minW="600px"
      maxW="1200px"
      w="100%"
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
        {channelResponse && (
          <Box flex="1" textAlign="right">
            {(() => {
              const snapTimestamp = channelResponse?.ts;
              const snapStore = channelResponse?.store;

              if (!snapTimestamp) {
                return (
                  <Text fontSize="sm" color="fg.muted">
                    Never snapped
                  </Text>
                );
              }

              const date = new Date(snapTimestamp);
              const formattedDate = date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <>
                  <Text fontSize="sm" color="fg.muted">
                    Snapped on {formattedDate}
                  </Text>
                  {snapStore && (
                    <Text fontSize="sm" color="fg.muted">
                      Imported from snap store{' '}
                      <Text as="span" fontWeight="bold" color="blue.600">
                        {snapStore}
                      </Text>
                    </Text>
                  )}
                </>
              );
            })()}
          </Box>
        )}
        {isLoading && (
          <Spinner size="md" />
        )}
      </Box>

      {/* Channel content */}
      <Collapsible.Root open={isExpanded}>
        <Collapsible.Content>
          {error ? (
            <ErrorBox error={error} title={`Error loading channel ${channelId}`} />
          ) : isLoading ? (
            <Box display="flex" justifyContent="center" py={8}>
              <Text color="fg.muted">Loading channel data...</Text>
            </Box>
          ) : channelData && channelData.length > 0 ? (
            <Grid
              templateColumns={{
                base: "1fr",
                lg: "repeat(auto-fit, minmax(600px, 1fr))"
              }}
              gap={4}
              justifyItems="center"
            >
              {channelData
                .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
                .map((item, index) => (
                  <SourceCard key={index} item={item} channelId={channelId} />
                ))}
            </Grid>
          ) : channelData && channelData.length === 0 ? (
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
      {!isExpanded && channelData && channelData.length > 0 && (
        <Box display="flex" justifyContent="center" py={4}>
          <Text fontSize="sm" color="gray.600" fontStyle="italic">
            {channelData.length} project{channelData.length !== 1 ? 's' : ''} (collapsed)
          </Text>
        </Box>
      )}
    </Box>
  );
};

const Sources = () => {
  // First, fetch the info to get channel IDs
  const { data: infoData, isLoading: isLoadingInfo, error: infoError } = useQuery({
    queryKey: ['info'],
    queryFn: () => fetchApi('/api/info'),
  });

  const channelIds = infoData?.channels?.map(channel => channel.id) || [];

  const loading = isLoadingInfo;
  const error = infoError;


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
        <ErrorBox error={error} />
      </Box>
    );
  }

  return (
    <Box py={6} px={6}>
      <VStack gap={6} align="center">
        {/* Render each channel with lazy loading */}
        {channelIds.map((channelId) => (
          <ChannelContainer
            key={channelId}
            channelId={channelId}
          />
        ))}

        {/* Handle case where no channels found */}
        {channelIds.length === 0 && !loading && (
          <Text mt={4} color="fg.muted">
            No channels found.
          </Text>
        )}
      </VStack>
    </Box>
  );
};

export default Sources;