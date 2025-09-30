import React from 'react';
import { Box, Text, IconButton } from '@chakra-ui/react';

// Helper function to format snap timestamp
const formatSnapInfo = (timestamp, store) => {
  if (!timestamp) {
    return { snapText: "Never snapped", importText: null };
  }

  const date = new Date(timestamp);
  const formattedDate = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const snapText = `Snapped on ${formattedDate}`;
  const importText = store ? { text: "Imported from snap store ", store } : null;

  return { snapText, importText };
};

const SourcesHeader = ({
  channelId,
  project,
  resource,
  onBackClick,
  backLabel = "Back",
  snapTimestamp,
  snapStore,
  showSnapInfo = false,
  extraContent = null
}) => {
  return (
    <Box
      p={6}
      borderWidth="2px"
      borderRadius="lg"
      bg="white"
      borderColor="green.200"
      mb={6}
    >
      {/* Header */}
      <Box display="flex" alignItems="center" gap={3} flexWrap="wrap" pb={4} borderBottom="2px" borderColor="green.100">
        {onBackClick && (
          <IconButton
            aria-label={backLabel}
            onClick={onBackClick}
            variant="ghost"
            size="sm"
          >
            ←
          </IconButton>
        )}

        {/* Channel */}
        <Box>
          <Text fontSize="sm" color="fg.muted" mb={1}>Channel</Text>
          <Text fontSize="lg" fontWeight="bold" color="green.600">
            {channelId}
          </Text>
        </Box>

        {/* Project */}
        {project && (
          <Box>
            <Text fontSize="sm" color="fg.muted" mb={1}>Project</Text>
            <Text fontSize="lg" fontWeight="semibold" color="blue.600">
              {project}
            </Text>
          </Box>
        )}

        {/* Resource */}
        {resource && (
          <Box flex="1">
            <Text fontSize="sm" color="fg.muted" mb={1}>Resource</Text>
            <Text fontSize="lg" fontWeight="semibold" color="purple.600" wordBreak="break-all">
              {resource}
            </Text>
          </Box>
        )}

        {/* Snap Info - only for channel level */}
        {showSnapInfo && !project && !resource && (
          <Box flex="1" textAlign="right">
            {(() => {
              const { snapText, importText } = formatSnapInfo(snapTimestamp, snapStore);
              return (
                <>
                  <Text fontSize="sm" color="fg.muted">
                    {snapText}
                  </Text>
                  {importText && (
                    <Text fontSize="sm" color="fg.muted">
                      {importText.text}
                      <Text as="span" fontWeight="bold" color="blue.600">
                        {importText.store}
                      </Text>
                    </Text>
                  )}
                </>
              );
            })()}
          </Box>
        )}
      </Box>

      {/* Extra content below header */}
      {extraContent && (
        <Box mt={6}>
          {extraContent}
        </Box>
      )}
    </Box>
  );
};

export default SourcesHeader;