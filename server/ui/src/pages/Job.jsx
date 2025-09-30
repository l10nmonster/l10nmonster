import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Text, VStack, HStack, Badge, Spinner, Alert, Flex, Button, Collapsible } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../utils/api';

// Helper function to flatten normalized source/target arrays
function flattenNormalizedSourceToOrdinal(nsrc) {
  return nsrc.map(e => (typeof e === 'string' ? e : `{{${e.t}}}`)).join('');
}

// Helper function to format timestamp
function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// Helper function to format cost
function formatCost(estimatedCost) {
  if (estimatedCost === 0) return 'Free';
  if (estimatedCost === undefined || estimatedCost === null) return 'Unknown';
  // TODO: Use mm.currencyFormatter.format(estimatedCost) when available
  return `$${estimatedCost.toFixed(2)}`;
}

// Helper function to render text with clickable HTTPS links
function renderTextWithLinks(text) {
  if (!text) return null;
  
  const urlRegex = /(https:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <Text
          key={index}
          as="a"
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          color="blue.600"
          textDecoration="underline"
          _hover={{ color: "blue.800" }}
        >
          {part}
        </Text>
      );
    }
    return part;
  });
}

const Job = () => {
  const { jobGuid } = useParams();
  const [showAdditionalProps, setShowAdditionalProps] = useState({});

  const { data: job, isLoading, error } = useQuery({
    queryKey: ['job', jobGuid],
    queryFn: () => fetchApi(`/api/tm/job/${jobGuid}`),
    retry: (failureCount, error) => {
      // Don't retry on 404 errors
      if (error?.status === 404) {
        return false;
      }
      // Default retry behavior for other errors (max 3 retries)
      return failureCount < 3;
    },
  });

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
        <Box p={4} bg="red.subtle" borderRadius="md" borderWidth="1px" borderColor="red.muted">
          <Text fontWeight="bold" color="red.600" mb={2}>Error</Text>
          <Text color="red.600">{error?.message || 'Failed to fetch job data'}</Text>
        </Box>
      </Box>
    );
  }

  if (!job) {
    return (
      <Box mt={5} px={6}>
        <Alert status="warning">
          <Box>
            <Text fontWeight="bold">Job Not Found</Text>
            <Text>Job with GUID {jobGuid} was not found.</Text>
          </Box>
        </Alert>
      </Box>
    );
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'done':
      case 'completed':
        return 'green';
      case 'failed':
      case 'error':
        return 'red';
      case 'in-progress':
      case 'running':
        return 'orange';
      default:
        return 'gray';
    }
  };

  const renderTUCard = (tu, index) => {
    // Extract core properties (always displayed in main sections)
    const coreProps = new Set([
      'jobGuid', 'guid', 'rid', 'sid', 'nsrc', 'ntgt', 'notes', 'q', 'prj'
    ]);
    
    // Additional properties (shown in collapsible section) - includes timestamp
    const additionalProps = Object.entries(tu).filter(([key]) => !coreProps.has(key));
    
    const tuKey = tu.guid || index;
    const isExpanded = showAdditionalProps[tuKey] || false;

    return (
      <Box 
        key={tu.guid || index}
        p={4}
        borderWidth="1px"
        borderRadius="lg"
        bg="white"
        shadow="sm"
        mb={4}
      >
        <VStack gap={3} align="stretch">
          {/* TU Header */}
          <Flex justify="space-between" align="start" wrap="wrap">
            <VStack gap={1} align="stretch">
              <Flex align="center" gap={2}>
                <Text fontSize="xs" fontWeight="bold" color="fg.muted">GUID:</Text>
                <Text fontSize="xs" fontFamily="mono" color="blue.600" wordBreak="break-all">{tu.guid}</Text>
              </Flex>
              {tu.rid && (
                <Flex align="center" gap={2}>
                  <Text fontSize="xs" fontWeight="bold" color="fg.muted">RID:</Text>
                  <Text fontSize="xs" fontFamily="mono" color="blue.600" wordBreak="break-all">{tu.rid}</Text>
                </Flex>
              )}
              {tu.sid && (
                <Flex align="center" gap={2}>
                  <Text fontSize="xs" fontWeight="bold" color="fg.muted">SID:</Text>
                  <Text fontSize="xs" fontFamily="mono" color="blue.600">{tu.sid}</Text>
                </Flex>
              )}
            </VStack>
          </Flex>

          {/* Source Text */}
          <Box>
            <Text fontSize="xs" fontWeight="bold" color="fg.muted">Source:</Text>
            <Text 
              fontSize="sm" 
              p={2} 
              bg="blue.subtle" 
              borderRadius="md"
              dir={job.sourceLang?.startsWith('he') || job.sourceLang?.startsWith('ar') ? 'rtl' : 'ltr'}
            >
              {Array.isArray(tu.nsrc) ? flattenNormalizedSourceToOrdinal(tu.nsrc) : tu.nsrc}
            </Text>
          </Box>

          {/* Target Text */}
          <Box>
            <Text fontSize="xs" fontWeight="bold" color="fg.muted">Target:</Text>
            <Text 
              fontSize="sm" 
              p={2} 
              bg="green.subtle" 
              borderRadius="md"
              dir={job.targetLang?.startsWith('he') || job.targetLang?.startsWith('ar') ? 'rtl' : 'ltr'}
            >
              {Array.isArray(tu.ntgt) ? flattenNormalizedSourceToOrdinal(tu.ntgt) : tu.ntgt}
            </Text>
          </Box>

          {/* Notes */}
          {tu.notes && (
            <Box>
              <Text fontSize="xs" fontWeight="bold" color="fg.muted">Notes:</Text>
              <Box p={2} bg="yellow.subtle" borderRadius="md">
                {tu.notes.desc && (
                  <Text fontSize="xs" mb={2} whiteSpace="pre-wrap">
                    {tu.notes.desc}
                  </Text>
                )}
                {tu.notes.ph && (
                  <Box>
                    <Text fontSize="xs" fontWeight="bold" mb={1}>Placeholders:</Text>
                    {Object.entries(tu.notes.ph).map(([placeholder, info]) => (
                      <Box key={placeholder} mb={1}>
                        <Text fontSize="xs" fontFamily="mono" color="blue.600">
                          {placeholder}
                        </Text>
                        <Text fontSize="xs" color="gray.600">
                          {info.desc} (e.g., {info.sample})
                        </Text>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            </Box>
          )}

          {/* Additional Properties */}
          {additionalProps.length > 0 && (
            <Box>
              <Flex align="center" justify="space-between" mb={2}>
                <Button 
                  size="xs" 
                  variant="ghost" 
                  onClick={() => setShowAdditionalProps(prev => ({
                    ...prev,
                    [tuKey]: !isExpanded
                  }))}
                  p={1}
                >
                  <Text fontSize="xs" color="blue.600">
                    {isExpanded 
                      ? 'Hide additional properties' 
                      : `Show ${additionalProps.length} additional properties`
                    }
                  </Text>
                </Button>
                
                <HStack gap={2}>
                  {tu.prj && (
                    <Badge size="sm" colorPalette="purple">
                      {tu.prj}
                    </Badge>
                  )}
                  {tu.q && (
                    <Badge size="sm" colorPalette="blue">
                      Q: {tu.q}
                    </Badge>
                  )}
                </HStack>
              </Flex>
              <Collapsible.Root open={isExpanded}>
                <Collapsible.Content>
                  <Box p={3} bg="gray.subtle" borderRadius="md">
                    {additionalProps.map(([key, value]) => {
                      let displayValue = value;
                      if (key === 'ts' && typeof value === 'number') {
                        displayValue = formatTimestamp(value);
                      } else if (typeof value === 'object') {
                        displayValue = JSON.stringify(value, null, 2);
                      } else {
                        displayValue = String(value);
                      }
                      
                      return (
                        <Flex key={key} align="start" mb={2} gap={2}>
                          <Text fontSize="xs" fontWeight="bold" color="gray.600" minW="fit-content">
                            {key}:
                          </Text>
                          <Text fontSize="xs" fontFamily="mono" color="blue.600" flex="1" wordBreak="break-all">
                            {displayValue}
                          </Text>
                        </Flex>
                      );
                    })}
                  </Box>
                </Collapsible.Content>
              </Collapsible.Root>
            </Box>
          )}
        </VStack>
      </Box>
    );
  };

  // Extract core job properties (always displayed in main header)
  const coreJobProps = new Set([
    'jobGuid', 'sourceLang', 'targetLang', 'translationProvider', 'updatedAt', 
    'taskName', 'inflight', 'status', 'statusDescription', 'tus', 'estimatedCost'
  ]);
  
  // Additional job properties (shown in separate section)
  const additionalJobProps = Object.entries(job).filter(([key]) => !coreJobProps.has(key));

  return (
    <Box p={6} minH="100vh" bg="gray.50">
      {/* Page Title */}
      <Text fontSize="3xl" fontWeight="bold" mb={6} color="fg.default">
        Job {job.jobGuid}
      </Text>
      
      <VStack gap={6} align="stretch" maxW="6xl" mx="auto">
        {/* Job Header */}
        <Box p={6} bg="white" borderRadius="lg" shadow="sm">
          <VStack gap={4} align="stretch">
            <Flex justify="space-between" align="center" wrap="wrap">
              <HStack gap={6} wrap="wrap" align="center">
                <Box>
                  <Text fontSize="sm" fontWeight="bold" color="fg.muted">Language Pair:</Text>
                  <Text fontSize="sm">{job.sourceLang} → {job.targetLang}</Text>
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="bold" color="fg.muted">Provider:</Text>
                  <Text fontSize="sm">{job.translationProvider}</Text>
                </Box>
                {job.updatedAt && (
                  <Box>
                    <Text fontSize="sm" fontWeight="bold" color="fg.muted">Updated:</Text>
                    <Text fontSize="sm">{formatTimestamp(new Date(job.updatedAt).getTime())}</Text>
                  </Box>
                )}
                {job.taskName && (
                  <Box>
                    <Text fontSize="sm" fontWeight="bold" color="fg.muted">Task:</Text>
                    <Text fontSize="sm">{job.taskName}</Text>
                  </Box>
                )}
                {job.estimatedCost !== undefined && (
                  <Box>
                    <Text fontSize="sm" fontWeight="bold" color="fg.muted">Estimated Cost:</Text>
                    <Text fontSize="sm">{formatCost(job.estimatedCost)}</Text>
                  </Box>
                )}
                {job.inflight?.length > 0 && (
                  <Badge colorPalette="orange" size="sm">
                    {job.inflight.length} TUs In Flight
                  </Badge>
                )}
              </HStack>
              
              <Box textAlign="right">
                <Badge size="lg" colorPalette={getStatusColor(job.status)}>
                  {job.status?.toUpperCase()}
                </Badge>
                {job.statusDescription && (
                  <Text fontSize="xs" color="fg.muted" mt={1}>
                    {renderTextWithLinks(job.statusDescription)}
                  </Text>
                )}
              </Box>
            </Flex>
            
            {/* Additional Job Properties */}
            {additionalJobProps.length > 0 && (
              <Box mt={4} pt={4} borderTop="1px" borderColor="border.default">
                <Text fontSize="sm" fontWeight="bold" color="fg.muted" mb={3}>
                  Additional Properties
                </Text>
                <Box bg="gray.subtle" p={3} borderRadius="md">
                  {additionalJobProps.map(([key, value]) => {
                    let displayValue = value;
                    if (key === 'ts' && typeof value === 'number') {
                      displayValue = formatTimestamp(value);
                    } else if (typeof value === 'object') {
                      displayValue = JSON.stringify(value, null, 2);
                    } else {
                      displayValue = String(value);
                    }
                    
                    return (
                      <Flex key={key} align="start" mb={2} gap={2}>
                        <Text fontSize="xs" fontWeight="bold" color="gray.600" minW="fit-content">
                          {key}:
                        </Text>
                        <Text fontSize="xs" fontFamily="mono" color="blue.600" flex="1" wordBreak="break-all">
                          {displayValue}
                        </Text>
                      </Flex>
                    );
                  })}
                </Box>
              </Box>
            )}
          </VStack>
        </Box>

        {/* In-flight TUs Warning */}
        {job.inflight?.length > 0 && (
          <Box p={4} bg="orange.subtle" borderRadius="lg" borderWidth="1px" borderColor="orange.muted">
            <Text fontSize="sm" fontWeight="bold" color="orange.700" mb={2}>
              Translation In Progress
            </Text>
            <Text fontSize="sm" color="orange.600">
              {job.inflight.length} translation unit{job.inflight.length === 1 ? '' : 's'} {job.inflight.length === 1 ? 'is' : 'are'} still being translated.
            </Text>
          </Box>
        )}

        {/* Translation Units */}
        <Box>
          <Text fontSize="xl" fontWeight="bold" mb={4}>
            Translation Units ({job.tus?.length || 0})
          </Text>
          {job.tus?.length > 0 ? (
            job.tus.map((tu, index) => renderTUCard(tu, index))
          ) : (
            <Box p={6} bg="white" borderRadius="lg" textAlign="center">
              <Text color="fg.muted">No translation units found.</Text>
            </Box>
          )}
        </Box>
      </VStack>
    </Box>
  );
};

export default Job;