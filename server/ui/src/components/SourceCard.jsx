import React, { useState, useMemo } from 'react';
import { Box, Text, Badge, Flex, Grid, Tooltip, Link, Collapsible, Spinner, Table } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../utils/api';

const SourceCard = ({ item, channelId }) => {
  const [isStatusExpanded, setIsStatusExpanded] = useState(false);
  const projectName = item.prj ?? 'default';

  // Fetch status data only when expanded
  const { data: statusData, isLoading: isLoadingStatus } = useQuery({
    queryKey: ['status', channelId],
    queryFn: () => fetchApi(`/api/status/${channelId}`),
    enabled: isStatusExpanded,
  });

  // Extract status for this specific project across all language pairs
  const projectStatus = useMemo(() => {
    if (!statusData) return null;

    const pairs = [];
    // statusData format: sourceLang -> targetLang -> project -> data
    Object.entries(statusData).forEach(([sourceLang, targetLangs]) => {
      Object.entries(targetLangs).forEach(([targetLang, projects]) => {
        if (projects[projectName]) {
          const data = projects[projectName];
          const pairSummaryByStatus = data.pairSummaryByStatus || {};
          const totalSegs = Object.values(pairSummaryByStatus).reduce((sum, count) => sum + count, 0);
          const translated = pairSummaryByStatus.translated || 0;
          const inFlight = pairSummaryByStatus['in flight'] || 0;
          const lowQuality = pairSummaryByStatus['low quality'] || 0;
          const untranslated = pairSummaryByStatus.untranslated || 0;

          pairs.push({
            sourceLang,
            targetLang,
            totalSegs,
            translated,
            inFlight,
            lowQuality,
            untranslated,
            pctTranslated: totalSegs > 0 ? Math.round(translated / totalSegs * 100) : 0,
            pctInFlight: totalSegs > 0 ? Math.round(inFlight / totalSegs * 100) : 0,
            pctLowQuality: totalSegs > 0 ? Math.round(lowQuality / totalSegs * 100) : 0,
            pctUntranslated: totalSegs > 0 ? Math.round(untranslated / totalSegs * 100) : 0,
          });
        }
      });
    });

    return pairs;
  }, [statusData, projectName]);

  const formatRelativeDate = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMs = now - date;
    const diffInSeconds = Math.floor(diffInMs / 1000);
    
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto', style: 'short' });
    
    if (diffInSeconds < 60) {
      return rtf.format(-diffInSeconds, 'second');
    } else if (diffInSeconds < 3600) {
      return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
    } else if (diffInSeconds < 86400) {
      return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
    } else if (diffInSeconds < 2592000) {
      return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
    } else if (diffInSeconds < 31536000) {
      return rtf.format(-Math.floor(diffInSeconds / 2592000), 'month');
    } else {
      return rtf.format(-Math.floor(diffInSeconds / 31536000), 'year');
    }
  };

  const formatAbsoluteDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  };

  return (
    <Box 
      p={3}
      borderWidth="1px"
      borderRadius="md"
      borderColor="border.default"
      bg="yellow.subtle"
      w="100%"
    >
      <Grid templateColumns="30px 2fr 80px 3fr 80px 80px 100px" gap={4} alignItems="center">
        {/* Expand/Collapse */}
        <Box
          cursor="pointer"
          onClick={() => setIsStatusExpanded(!isStatusExpanded)}
          _hover={{ bg: "yellow.100" }}
          borderRadius="sm"
          textAlign="center"
        >
          <Text fontSize="md" color="purple.600">
            {isStatusExpanded ? "▼" : "▶"}
          </Text>
        </Box>

        {/* Project */}
        <Box>
          <Text fontSize="xs" color="fg.muted" mb={1}>Project</Text>
          <Link
            as={RouterLink}
            to={`/sources/${channelId}/${projectName}`}
            fontSize="sm"
            fontWeight="semibold"
            color="blue.600"
            _hover={{ textDecoration: "underline" }}
          >
            {projectName}
          </Link>
        </Box>

        {/* Source */}
        <Box>
          <Text fontSize="xs" color="fg.muted" mb={1}>Source</Text>
          <Badge colorPalette="blue" size="sm">
            {item.sourceLang}
          </Badge>
        </Box>

        {/* Target Languages */}
        <Box>
          <Text fontSize="xs" color="fg.muted" mb={1}>
            Targets ({item.targetLangs.length})
          </Text>
          <Flex wrap="wrap" gap={1}>
            {item.targetLangs.map(lang => (
              <Badge key={lang} colorPalette="green" size="sm">
                {lang}
              </Badge>
            ))}
          </Flex>
        </Box>

        {/* Resources */}
        <Box textAlign="center">
          <Text fontSize="xs" color="fg.muted" mb={1}>Resources</Text>
          <Text fontSize="sm" fontWeight="bold" color="orange.600">
            {item.resCount.toLocaleString()}
          </Text>
        </Box>

        {/* Segments */}
        <Box textAlign="center">
          <Text fontSize="xs" color="fg.muted" mb={1}>Segments</Text>
          <Text fontSize="sm" fontWeight="bold" color="purple.600">
            {item.segmentCount.toLocaleString()}
          </Text>
        </Box>

        {/* Date */}
        <Box textAlign="center">
          <Text fontSize="xs" color="fg.muted" mb={1}>Modified</Text>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <Text fontSize="xs" color="fg.muted" cursor="help">
                {formatRelativeDate(item.lastModified)}
              </Text>
            </Tooltip.Trigger>
            <Tooltip.Positioner>
              <Tooltip.Content>
                <Tooltip.Arrow />
                <Text fontSize="sm">
                  {formatAbsoluteDate(item.lastModified)}
                </Text>
              </Tooltip.Content>
            </Tooltip.Positioner>
          </Tooltip.Root>
        </Box>
      </Grid>

      {/* Collapsible Translation Status */}
      <Collapsible.Root open={isStatusExpanded}>
        <Collapsible.Content>
          <Box mt={3} pt={3} borderTop="1px" borderColor="yellow.300">
            {isLoadingStatus ? (
              <Flex justify="center" py={4}>
                <Spinner size="sm" />
                <Text ml={2} fontSize="sm" color="fg.muted">Loading translation status...</Text>
              </Flex>
            ) : projectStatus && projectStatus.length > 0 ? (
              <Box overflow="auto">
                <Table.Root size="sm" variant="line">
                  <Table.Header>
                    <Table.Row bg="purple.50">
                      <Table.ColumnHeader>Language Pair</Table.ColumnHeader>
                      <Table.ColumnHeader textAlign="center">Progress</Table.ColumnHeader>
                      <Table.ColumnHeader textAlign="right">Translated</Table.ColumnHeader>
                      <Table.ColumnHeader textAlign="right">In Flight</Table.ColumnHeader>
                      <Table.ColumnHeader textAlign="right">Low Q</Table.ColumnHeader>
                      <Table.ColumnHeader textAlign="right">Untranslated</Table.ColumnHeader>
                      <Table.ColumnHeader textAlign="right">Total</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {projectStatus.map((pair) => (
                      <Table.Row key={`${pair.sourceLang}-${pair.targetLang}`} bg="white">
                        <Table.Cell>
                          <Link
                            as={RouterLink}
                            to={`/status/${channelId}/${pair.sourceLang}/${pair.targetLang}?prj=${encodeURIComponent(projectName)}`}
                            fontSize="xs"
                            fontWeight="medium"
                            color="purple.600"
                            _hover={{ textDecoration: "underline" }}
                          >
                            {pair.sourceLang} → {pair.targetLang}
                          </Link>
                        </Table.Cell>
                        <Table.Cell>
                          <Flex align="center" gap={2}>
                            <Box
                              flex="1"
                              minW="80px"
                              bg="bg.muted"
                              rounded="full"
                              height="8px"
                              position="relative"
                              overflow="hidden"
                            >
                              <Box
                                position="absolute"
                                top="0"
                                left="0"
                                height="100%"
                                width={`${pair.pctTranslated}%`}
                                bg="green.solid"
                              />
                              <Box
                                position="absolute"
                                top="0"
                                left={`${pair.pctTranslated}%`}
                                height="100%"
                                width={`${pair.pctInFlight}%`}
                                bg="blue.solid"
                              />
                              <Box
                                position="absolute"
                                top="0"
                                left={`${pair.pctTranslated + pair.pctInFlight}%`}
                                height="100%"
                                width={`${pair.pctLowQuality}%`}
                                bg="yellow.solid"
                              />
                              <Box
                                position="absolute"
                                top="0"
                                left={`${pair.pctTranslated + pair.pctInFlight + pair.pctLowQuality}%`}
                                height="100%"
                                width={`${pair.pctUntranslated}%`}
                                bg="red.solid"
                              />
                            </Box>
                            <Text fontSize="xs" color="fg.muted" minW="35px" textAlign="right">
                              {pair.pctTranslated}%
                            </Text>
                          </Flex>
                        </Table.Cell>
                        <Table.Cell textAlign="right">
                          <Text fontSize="xs" color="green.600" fontWeight="medium">
                            {pair.translated.toLocaleString()}
                          </Text>
                        </Table.Cell>
                        <Table.Cell textAlign="right">
                          <Text fontSize="xs" color={pair.inFlight > 0 ? "blue.600" : "fg.muted"}>
                            {pair.inFlight.toLocaleString()}
                          </Text>
                        </Table.Cell>
                        <Table.Cell textAlign="right">
                          <Text fontSize="xs" color={pair.lowQuality > 0 ? "yellow.600" : "fg.muted"}>
                            {pair.lowQuality.toLocaleString()}
                          </Text>
                        </Table.Cell>
                        <Table.Cell textAlign="right">
                          <Text fontSize="xs" color={pair.untranslated > 0 ? "red.600" : "fg.muted"} fontWeight={pair.untranslated > 0 ? "medium" : "normal"}>
                            {pair.untranslated.toLocaleString()}
                          </Text>
                        </Table.Cell>
                        <Table.Cell textAlign="right">
                          <Text fontSize="xs" color="fg.muted">
                            {pair.totalSegs.toLocaleString()}
                          </Text>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Box>
            ) : (
              <Text fontSize="sm" color="fg.muted" textAlign="center" py={2}>
                No translation status available
              </Text>
            )}
          </Box>
        </Collapsible.Content>
      </Collapsible.Root>
    </Box>
  );
};

export default SourceCard;