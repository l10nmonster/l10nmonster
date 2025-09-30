import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container,
  Text,
  Box,
  Spinner,
  Alert,
  VStack,
  HStack,
  Badge,
  Button,
  Flex,
  IconButton,
  Code,
  Collapsible,
  Tabs,
  Tooltip,
  Checkbox,
  Select
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../utils/api';
import { renderTextWithLinks } from '../utils/textUtils.jsx';
import { addSourceTUsToCart } from '../utils/cartUtils.jsx';
import SourcesHeader from '../components/SourcesHeader';

// Helper function to render normalized strings with highlighting
function renderNormalizedString(nstr) {
  return nstr.map((e, index) => {
    if (typeof e === 'string') {
      return e;
    } else if (e.v) {
      const color = e.t === 'x' ? 'purple.600' : 'orange.600';
      return (
        <Text key={index} as="span" fontFamily="mono" color={color} fontWeight="bold">
          {e.v}
        </Text>
      );
    } else {
      return `{{${e.t}}}`;
    }
  });
}


const SourcesResource = () => {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rid = searchParams.get('rid');
  const highlightGuid = searchParams.get('guid');

  const [selectedTab, setSelectedTab] = useState('segments');
  const highlightedRowRef = useRef(null);

  // Cart functionality state
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [selectedTargetLang, setSelectedTargetLang] = useState('');

  const { data: resource, isLoading, error } = useQuery({
    queryKey: ['resource', channelId, rid],
    queryFn: () => fetchApi(`/api/resource/${channelId}?rid=${encodeURIComponent(rid)}`),
    enabled: !!rid,
  });

  // Get system info for target languages
  const { data: info = {} } = useQuery({
    queryKey: ['info'],
    queryFn: () => fetchApi('/api/info'),
  });

  // Calculate most common group and format
  const { defaultGroup, defaultFormat, segments } = useMemo(() => {
    if (!resource?.segments) return { defaultGroup: null, defaultFormat: null, segments: [] };

    // Count occurrences
    const groupCounts = {};
    const formatCounts = {};

    resource.segments.forEach(segment => {
      const group = segment.group || '(no group)';
      const format = segment.mf || 'text';

      groupCounts[group] = (groupCounts[group] || 0) + 1;
      formatCounts[format] = (formatCounts[format] || 0) + 1;
    });

    // Find most common
    const defaultGroup = Object.keys(groupCounts).reduce((a, b) =>
      groupCounts[a] > groupCounts[b] ? a : b, Object.keys(groupCounts)[0]);
    const defaultFormat = Object.keys(formatCounts).reduce((a, b) =>
      formatCounts[a] > formatCounts[b] ? a : b, Object.keys(formatCounts)[0]);

    return { defaultGroup, defaultFormat, segments: resource.segments };
  }, [resource?.segments]);

  // Cart handler functions
  const handleRowSelect = (index, checked) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(index);
    } else {
      newSelected.delete(index);
    }
    setSelectedRows(newSelected);
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      const allIndices = new Set(segments.map((_, index) => index));
      setSelectedRows(allIndices);
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleAddToCart = () => {
    if (!selectedTargetLang) {
      alert('Please select a target language first');
      return;
    }

    const selectedSegments = Array.from(selectedRows).map(index => segments[index]);

    // Convert segments to TU format for cart
    const tus = selectedSegments.map(segment => ({
      guid: segment.guid,
      rid: resource.id,
      sid: segment.sid,
      nsrc: segment.nstr,
      notes: segment.notes
    }));

    addSourceTUsToCart(resource.sourceLang, selectedTargetLang, channelId, tus);
    setSelectedRows(new Set()); // Clear selection after adding to cart
    setSelectedTargetLang(''); // Reset target language
  };

  const isAllSelected = segments.length > 0 && selectedRows.size === segments.length;
  const isIndeterminate = selectedRows.size > 0 && selectedRows.size < segments.length;

  // Get available target languages (only from resource, no fallback)
  const availableTargetLangs = useMemo(() => {
    if (resource?.targetLangs) {
      return resource.targetLangs.filter(lang => lang !== resource.sourceLang);
    }
    return [];
  }, [resource?.targetLangs, resource?.sourceLang]);

  // Scroll to highlighted segment when data loads and highlightGuid is present
  useEffect(() => {
    if (highlightGuid && segments.length > 0 && highlightedRowRef.current) {
      // Small delay to ensure DOM is fully rendered
      setTimeout(() => {
        if (highlightedRowRef.current) {
          highlightedRowRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });
        }
      }, 100);
    }
  }, [highlightGuid, segments, selectedTab]);

  if (!rid) {
    return (
      <Box mt={5} px={6}>
        <Alert status="error">
          <Box>
            <Text fontWeight="bold">Missing Resource ID</Text>
            <Text>No resource ID specified in the URL.</Text>
          </Box>
        </Alert>
      </Box>
    );
  }

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
        <Alert status="error">
          <Box>
            <Text fontWeight="bold">Error</Text>
            <Text>{error?.message || 'Failed to fetch resource data'}</Text>
          </Box>
        </Alert>
      </Box>
    );
  }

  return (
    <Box py={6} px={6} h="100vh" display="flex" flexDirection="column">
      {/* Header */}
      <SourcesHeader
        channelId={resource.channel}
        project={resource.prj}
        resource={resource.id}
        onBackClick={() => navigate(`/sources/${channelId}/${resource.prj}`)}
        backLabel="Back to project"
        extraContent={
          <Flex gap={4} align="center" wrap="wrap">
            <Box>
              <Text fontSize="sm" color="fg.muted" mb={1}>Source Language</Text>
              <Badge colorPalette="blue" size="sm">
                {resource.sourceLang}
              </Badge>
            </Box>
            <Box>
              <Text fontSize="sm" color="fg.muted" mb={1}>Resource Format</Text>
              <Badge colorPalette="purple" size="sm">
                {resource.resourceFormat}
              </Badge>
            </Box>
            {defaultGroup && (
              <Box>
                <Text fontSize="sm" color="fg.muted" mb={1}>Default Group</Text>
                <Badge colorPalette="gray" size="sm">
                  {defaultGroup}
                </Badge>
              </Box>
            )}
            {defaultFormat && (
              <Box>
                <Text fontSize="sm" color="fg.muted" mb={1}>Default Format</Text>
                <Badge colorPalette="cyan" size="sm">
                  {defaultFormat}
                </Badge>
              </Box>
            )}
            <Box>
              <Text fontSize="sm" color="fg.muted" mb={1}>Target Languages ({resource.targetLangs.length})</Text>
              <Flex wrap="wrap" gap={1}>
                {resource.targetLangs.map(lang => (
                  <Badge key={lang} colorPalette="orange" size="sm">
                    {lang}
                  </Badge>
                ))}
              </Flex>
            </Box>
            {resource.modified && (
              <Box>
                <Text fontSize="sm" color="fg.muted" mb={1}>Last Modified</Text>
                <Text fontSize="sm" color="fg.default" title={new Date(resource.modified).toLocaleString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  timeZoneName: 'short'
                })}>
                  {(() => {
                    const now = new Date();
                    const past = new Date(resource.modified);
                    const diffInSeconds = Math.floor((now - past) / 1000);
                    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto', style: 'short' });

                    if (diffInSeconds < 60) return rtf.format(-diffInSeconds, 'second');
                    if (diffInSeconds < 3600) return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
                    if (diffInSeconds < 86400) return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
                    if (diffInSeconds < 2592000) return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
                    if (diffInSeconds < 31536000) return rtf.format(-Math.floor(diffInSeconds / 2592000), 'month');
                    return rtf.format(-Math.floor(diffInSeconds / 31536000), 'year');
                  })()}
                </Text>
              </Box>
            )}
          </Flex>
        }
      />

      {/* Content Tabs */}
      <Box flex="1" display="flex" flexDirection="column">
        <Tabs.Root value={selectedTab} onValueChange={(details) => setSelectedTab(details.value)}>
          <Tabs.List mb={4}>
            <Tabs.Trigger value="segments">
              Segments ({segments.length})
            </Tabs.Trigger>
            <Tabs.Trigger value="raw">
              Raw Content
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="segments" flex="1" display="flex" flexDirection="column">
            {/* Cart Controls */}
            {selectedRows.size > 0 && (
              <Box
                bg="blue.subtle"
                borderBottom="1px"
                borderColor="blue.muted"
                shadow="md"
                borderLeft="4px"
                borderLeftColor="blue.500"
                px={6}
                py={4}
                mb={4}
                borderRadius="md"
              >
                <Flex align="center" justify="space-between">
                  <Text fontSize="md" fontWeight="semibold" color="blue.700">
                    {selectedRows.size} {selectedRows.size === 1 ? 'segment' : 'segments'} selected
                  </Text>
                  <Flex align="center" gap={3}>
                    <Text fontSize="sm" color="blue.600">Target Language:</Text>
                    <Select.Root
                      size="sm"
                      width="200px"
                      value={selectedTargetLang ? [selectedTargetLang] : []}
                      positioning={{
                        strategy: "absolute",
                        placement: "bottom-start",
                        flip: true,
                        gutter: 4
                      }}
                    >
                      <Select.Trigger>
                        <Text fontSize="sm" flex="1" textAlign="left">
                          {selectedTargetLang || "Select target language"}
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
                        >
                          {availableTargetLangs.map((lang) => (
                            <Select.Item
                              key={lang}
                              item={lang}
                              value={lang}
                              onClick={() => setSelectedTargetLang(lang)}
                            >
                              <Select.ItemText>{lang}</Select.ItemText>
                              <Select.ItemIndicator />
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Positioner>
                    </Select.Root>
                    <Button
                      colorPalette="blue"
                      onClick={handleAddToCart}
                      disabled={!selectedTargetLang}
                      size="sm"
                    >
                      Add to Cart
                    </Button>
                  </Flex>
                </Flex>
              </Box>
            )}

            {/* Segments Table */}
            <Box flex="1" bg="white" borderRadius="lg" shadow="sm" overflow="auto">
              <Box as="table" w="100%" fontSize="sm" tableLayout="fixed">
                <Box
                  as="thead"
                  position="sticky"
                  top={0}
                  bg="blue.subtle"
                  zIndex={1}
                  borderBottom="2px"
                  borderColor="blue.muted"
                  shadow="sm"
                >
                  <Box as="tr">
                    <Box as="th" p={3} borderBottom="1px" borderColor="border.default" minW="60px" textAlign="center">
                      <Checkbox.Root
                        checked={isAllSelected}
                        onCheckedChange={(details) => handleSelectAll(details.checked)}
                      >
                        <Checkbox.HiddenInput ref={(el) => {
                          if (el) el.indeterminate = isIndeterminate;
                        }} />
                        <Checkbox.Control />
                      </Checkbox.Root>
                    </Box>
                    <Box as="th" p={3} textAlign="left" borderBottom="1px" borderColor="border.default" w="12%">
                      <Text fontSize="sm" fontWeight="bold" color="blue.600">GUID</Text>
                    </Box>
                    <Box as="th" p={3} textAlign="left" borderBottom="1px" borderColor="border.default" w="8%">
                      <Text fontSize="sm" fontWeight="bold" color="blue.600">NID</Text>
                    </Box>
                    <Box as="th" p={3} textAlign="left" borderBottom="1px" borderColor="border.default" w="20%">
                      <Text fontSize="sm" fontWeight="bold" color="blue.600">STRING ID</Text>
                    </Box>
                    <Box as="th" p={3} textAlign="left" borderBottom="1px" borderColor="border.default" w="35%">
                      <Text fontSize="sm" fontWeight="bold" color="blue.600">SOURCE TEXT</Text>
                    </Box>
                    <Box as="th" p={3} textAlign="left" borderBottom="1px" borderColor="border.default" w="20%">
                      <Text fontSize="sm" fontWeight="bold" color="blue.600">NOTES</Text>
                    </Box>
                  </Box>
                </Box>
                <Box as="tbody">
                  {segments.map((segment, index) => {
                    const isHighlighted = highlightGuid && segment.guid === highlightGuid;
                    return (
                      <Box
                        as="tr"
                        key={segment.guid}
                        ref={isHighlighted ? highlightedRowRef : null}
                        bg={isHighlighted ? "yellow.subtle" : "transparent"}
                        _hover={{ bg: isHighlighted ? "yellow.muted" : "gray.subtle" }}
                        borderLeft={isHighlighted ? "4px" : "0"}
                        borderLeftColor={isHighlighted ? "yellow.solid" : "transparent"}
                      >
                      <Box as="td" p={3} borderBottom="1px" borderColor="border.subtle" textAlign="center">
                        <Checkbox.Root
                          checked={selectedRows.has(index)}
                          onCheckedChange={(details) => handleRowSelect(index, details.checked)}
                        >
                          <Checkbox.HiddenInput />
                          <Checkbox.Control />
                        </Checkbox.Root>
                      </Box>
                      <Box as="td" p={3} borderBottom="1px" borderColor="border.subtle">
                        <Text
                          fontSize="xs"
                          fontFamily="mono"
                          color="orange.600"
                          userSelect="all"
                          overflow="hidden"
                          textOverflow="ellipsis"
                          whiteSpace="nowrap"
                          maxW="100px"
                          title={segment.guid}
                        >
                          {segment.guid}
                        </Text>
                      </Box>
                      <Box as="td" p={3} borderBottom="1px" borderColor="border.subtle">
                        <Text
                          fontSize="xs"
                          fontFamily="mono"
                          color="orange.600"
                          userSelect="all"
                          overflow="hidden"
                          textOverflow="ellipsis"
                          whiteSpace="nowrap"
                          maxW="100px"
                          title={segment.nid || ''}
                        >
                          {segment.nid || ''}
                        </Text>
                      </Box>
                      <Box as="td" p={3} borderBottom="1px" borderColor="border.subtle">
                        <Text fontSize="xs" fontFamily="mono" color="purple.600" wordBreak="break-all">
                          {segment.sid}
                        </Text>
                      </Box>
                      <Box as="td" p={3} borderBottom="1px" borderColor="border.subtle">
                        <Text fontSize="xs" noOfLines={3}>
                          {renderNormalizedString(segment.nstr)}
                        </Text>
                        {/* Show non-default group */}
                        {(() => {
                          const group = segment.group || '(no group)';
                          if (group !== defaultGroup) {
                            return (
                              <Text fontSize="xs" color="gray.600" fontStyle="italic" mt={1}>
                                Group:
                                <Badge colorPalette="gray" size="sm" ml={1}>
                                  {group}
                                </Badge>
                              </Text>
                            );
                          }
                          return null;
                        })()}
                        {/* Show non-default format */}
                        {(() => {
                          const format = segment.mf || 'text';
                          if (format !== defaultFormat) {
                            return (
                              <Text fontSize="xs" color="gray.600" fontStyle="italic" mt={1}>
                                Format:
                                <Badge colorPalette="cyan" size="sm" ml={1}>
                                  {format}
                                </Badge>
                              </Text>
                            );
                          }
                          return null;
                        })()}
                      </Box>
                      <Box as="td" p={3} borderBottom="1px" borderColor="border.subtle">
                        {segment.notes?.desc && (
                          <Text fontSize="xs" color="gray.600" fontStyle="italic">
                            {renderTextWithLinks(segment.notes.desc)}
                          </Text>
                        )}
                        {segment.notes?.ph && Object.keys(segment.notes.ph).length > 0 && (
                          <Box mt={segment.notes?.desc ? 2 : 0}>
                            <Text fontSize="xs" color="gray.600" fontWeight="semibold" mb={1}>
                              Placeholders:
                            </Text>
                            {Object.entries(segment.notes.ph).map(([placeholder, info]) => (
                              <Text key={placeholder} fontSize="xs" color="gray.600" mb={1}>
                                <Text as="span" fontFamily="mono" color="purple.600" fontWeight="bold">
                                  {placeholder}
                                </Text>
                                {': '}
                                {renderTextWithLinks(info.desc)}
                                {info.sample && (
                                  <Text as="span" color="gray.500">
                                    {' '}(e.g., "{info.sample}")
                                  </Text>
                                )}
                              </Text>
                            ))}
                          </Box>
                        )}
                      </Box>
                    </Box>
                    );
                  })}
                </Box>
              </Box>

              {segments.length === 0 && (
                <Flex justify="center" p={8}>
                  <Text color="fg.muted">No segments found in this resource</Text>
                </Flex>
              )}
            </Box>
          </Tabs.Content>

          <Tabs.Content value="raw" flex="1" display="flex" flexDirection="column">
            {/* Raw Content */}
            <Box flex="1" bg="white" borderRadius="lg" shadow="sm" overflow="auto" p={4}>
              <Box
                as="pre"
                fontSize="xs"
                fontFamily="mono"
                bg="gray.50"
                p={4}
                borderRadius="md"
                overflow="auto"
                whiteSpace="pre-wrap"
                wordBreak="break-word"
                border="1px"
                borderColor="border.default"
              >
                {resource.raw || 'No raw content available'}
              </Box>
            </Box>
          </Tabs.Content>
        </Tabs.Root>
      </Box>
    </Box>
  );
};

export default SourcesResource;