import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Text,
  Box,
  Spinner,
  VStack,
  Grid,
  Badge,
  Button,
  Flex,
  IconButton,
  Link
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchApi } from '../utils/api';
import ErrorBox from '../components/ErrorBox';
import SourcesHeader from '../components/SourcesHeader';

const SourcesDetail = () => {
  const { channelId, prj } = useParams();
  const navigate = useNavigate();
  const sentinelRef = useRef(null);

  const {
    data: infiniteData,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['projectTOC', channelId, prj],
    queryFn: async ({ pageParam = 0 }) => {
      const limit = 100;
      const response = await fetchApi(`/api/channel/${channelId}/${prj}?offset=${pageParam}&limit=${limit}`);
      return {
        data: response,
        offset: pageParam,
        limit,
        hasMore: response.length === limit
      };
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.offset + lastPage.limit : undefined;
    },
    staleTime: 30000,
  });

  // Flatten all pages into a single array
  const projectTOC = infiniteData?.pages.flatMap(page => page.data) || [];

  // Set up intersection observer for infinite scrolling
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      {
        rootMargin: '100px', // Start loading 100px before reaching the sentinel
        threshold: 0,
      }
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Helper function to format timestamp
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Helper function for relative time
  const getRelativeTime = (timestamp) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInSeconds = Math.floor((now - past) / 1000);

    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto', style: 'short' });

    if (diffInSeconds < 60) return rtf.format(-diffInSeconds, 'second');
    if (diffInSeconds < 3600) return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
    if (diffInSeconds < 86400) return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
    if (diffInSeconds < 2592000) return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
    if (diffInSeconds < 31536000) return rtf.format(-Math.floor(diffInSeconds / 2592000), 'month');
    return rtf.format(-Math.floor(diffInSeconds / 31536000), 'year');
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
        <ErrorBox error={error} fallbackMessage="Failed to fetch project data" />
      </Box>
    );
  }

  return (
    <Box py={6} px={6}>
      {/* Header */}
      <SourcesHeader
        channelId={channelId}
        project={prj}
        onBackClick={() => navigate('/sources')}
        backLabel="Back to sources"
      />

      {/* Resources Table */}
      {projectTOC.length === 0 ? (
        <Box p={8} borderWidth="1px" borderRadius="md" bg="white" textAlign="center">
          <Text color="fg.muted">No resources found for this project.</Text>
        </Box>
      ) : (
        <Box
          bg="white"
          borderRadius="lg"
          shadow="sm"
          overflow="auto"
          maxH="78vh"
        >
          <Box as="table" w="100%" fontSize="sm">
            <Box
              as="thead"
              bg="blue.subtle"
              borderBottom="2px"
              borderColor="blue.muted"
              position="sticky"
              top={0}
              zIndex={1}
            >
              <Box as="tr">
                <Box as="th" p={4} textAlign="left" borderBottom="1px" borderColor="border.default">
                  <Text fontSize="sm" fontWeight="bold" color="blue.600">
                    RESOURCE ID
                  </Text>
                </Box>
                <Box as="th" p={4} textAlign="left" borderBottom="1px" borderColor="border.default">
                  <Text fontSize="sm" fontWeight="bold" color="blue.600">
                    SOURCE LANGUAGE
                  </Text>
                </Box>
                <Box as="th" p={4} textAlign="center" borderBottom="1px" borderColor="border.default">
                  <Text fontSize="sm" fontWeight="bold" color="blue.600">
                    SEGMENTS
                  </Text>
                </Box>
                <Box as="th" p={4} textAlign="center" borderBottom="1px" borderColor="border.default">
                  <Text fontSize="sm" fontWeight="bold" color="blue.600">
                    LAST MODIFIED
                  </Text>
                </Box>
              </Box>
            </Box>
            <Box as="tbody">
              {projectTOC
                .sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt))
                .map((resource, index) => (
                  <Box
                    as="tr"
                    key={`${resource.rid}-${index}`}
                    _hover={{ bg: "gray.subtle" }}
                  >
                    <Box as="td" p={4} borderBottom="1px" borderColor="border.subtle">
                      <Link
                        as={RouterLink}
                        to={`/sources/${channelId}?rid=${encodeURIComponent(resource.rid)}`}
                        fontSize="sm"
                        fontFamily="mono"
                        color="blue.600"
                        wordBreak="break-all"
                        _hover={{ textDecoration: "underline" }}
                      >
                        {resource.rid}
                      </Link>
                    </Box>
                    <Box as="td" p={4} borderBottom="1px" borderColor="border.subtle">
                      <Badge colorPalette="purple" size="sm">
                        {resource.sourceLang}
                      </Badge>
                    </Box>
                    <Box as="td" p={4} borderBottom="1px" borderColor="border.subtle" textAlign="center">
                      <Text fontSize="sm" fontWeight="semibold" color="orange.600">
                        {resource.segmentCount.toLocaleString()}
                      </Text>
                    </Box>
                    <Box as="td" p={4} borderBottom="1px" borderColor="border.subtle" textAlign="center">
                      <Text fontSize="sm" color="fg.muted" title={formatTimestamp(resource.modifiedAt)}>
                        {getRelativeTime(resource.modifiedAt)}
                      </Text>
                    </Box>
                  </Box>
                ))}
            </Box>
          </Box>

          {/* Infinite scroll sentinel and loading indicator */}
          {hasNextPage && (
            <Box ref={sentinelRef} p={4} textAlign="center">
              {isFetchingNextPage && (
                <Flex justify="center" align="center" gap={2}>
                  <Spinner size="sm" />
                  <Text fontSize="sm" color="fg.muted">
                    Loading more resources...
                  </Text>
                </Flex>
              )}
            </Box>
          )}

          {!hasNextPage && projectTOC.length > 0 && (
            <Box p={4} textAlign="center">
              <Text fontSize="sm" color="fg.muted">
                All {projectTOC.length} resources loaded
              </Text>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default SourcesDetail;