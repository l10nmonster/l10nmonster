import React from 'react';
import { Box, Text, Badge, Flex, Grid, Tooltip } from '@chakra-ui/react';

const SourceCard = ({ item }) => {
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
      <Grid templateColumns="2fr 80px 3fr 80px 80px 100px" gap={4} alignItems="center">
        {/* Project */}
        <Box>
          <Text fontSize="xs" color="fg.muted" mb={1}>Project</Text>
          <Text fontSize="sm" fontWeight="semibold">
            {item.prj || 'Default'}
          </Text>
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
    </Box>
  );
};

export default SourceCard;