import React from 'react';
import { Box, Text, VStack, Grid, Badge } from '@chakra-ui/react';

const ProviderDetail = ({ provider, providerId }) => {
  if (!provider) {
    return (
      <Box p={6} textAlign="center">
        <Text color="fg.muted">Select a provider to view details</Text>
      </Box>
    );
  }

  const { info, properties } = provider;

  const convertAnsiToJsx = (text) => {
    if (!text) return text;
    
    // ANSI color codes mapping
    const colorMap = {
      '31': '#ef4444', // red
      '32': '#22c55e', // green  
      '33': '#eab308', // yellow
      '34': '#3b82f6', // blue
      '35': '#a855f7', // magenta
      '36': '#06b6d4', // cyan
      '39': 'inherit', // default/reset
    };
    
    const parts = [];
    let currentIndex = 0;
    let currentColor = 'inherit';
    
    // Find all ANSI escape sequences
    const ansiRegex = /\u001B\[([0-9;]*)m/g;
    let match;
    
    while ((match = ansiRegex.exec(text)) !== null) {
      // Add text before the escape sequence
      if (match.index > currentIndex) {
        const textBefore = text.slice(currentIndex, match.index);
        parts.push(
          <span key={`${currentIndex}-text`} style={{ color: currentColor }}>
            {textBefore}
          </span>
        );
      }
      
      // Update color based on the escape sequence
      const code = match[1];
      if (colorMap[code]) {
        currentColor = colorMap[code];
      }
      
      currentIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (currentIndex < text.length) {
      const remainingText = text.slice(currentIndex);
      parts.push(
        <span key={`${currentIndex}-text`} style={{ color: currentColor }}>
          {remainingText}
        </span>
      );
    }
    
    return parts.length > 0 ? parts : text;
  };

  const formatDescription = (desc) => {
    if (Array.isArray(desc)) {
      return desc.map((line, index) => (
        <Box key={index} display="flex" alignItems="flex-start" gap={2}>
          <Text fontSize="sm" color="fg.muted" mt="1px">•</Text>
          <Text fontSize="sm" flex="1">
            {convertAnsiToJsx(line)}
          </Text>
        </Box>
      ));
    }
    return <Text fontSize="sm">{convertAnsiToJsx(desc)}</Text>;
  };

  const renderValue = (value) => {
    if (typeof value === 'object' && value !== null) {
      return (
        <Box 
          as="pre" 
          fontSize="xs" 
          bg="bg.muted" 
          p={2} 
          borderRadius="md"
          overflow="auto"
          maxH="200px"
        >
          {JSON.stringify(value, null, 2)}
        </Box>
      );
    }
    return <Text fontSize="sm">{String(value)}</Text>;
  };

  return (
    <Box flex="1" p={6} overflow="auto">
      <VStack gap={6} align="stretch">
        {/* Provider Header */}
        <Box>
          <Text fontSize="2xl" fontWeight="bold" mb={2}>
            {providerId}
          </Text>
        </Box>

        {/* Info Section */}
        <Box 
          p={4} 
          borderWidth="1px" 
          borderRadius="lg" 
          bg="white"
          shadow="sm"
        >
          <Text fontSize="lg" fontWeight="semibold" mb={4}>
            Information
          </Text>
          
          <Grid templateColumns="auto 1fr" gap={3} alignItems="start">
            <Text fontSize="sm" fontWeight="bold" color="blue.600">Type:</Text>
            <Badge colorPalette="blue" size="sm">
              {info.type}
            </Badge>

            <Text fontSize="sm" fontWeight="bold" color="blue.600">Cost per Word:</Text>
            <Text fontSize="sm">{info.costPerWord}</Text>

            <Text fontSize="sm" fontWeight="bold" color="blue.600">Cost per MChar:</Text>
            <Text fontSize="sm">{info.costPerMChar}</Text>

            {info.description && (
              <>
                <Text fontSize="sm" fontWeight="bold" color="blue.600">Description:</Text>
                <Box>
                  {formatDescription(info.description)}
                </Box>
              </>
            )}
          </Grid>
        </Box>

        {/* Properties Section */}
        <Box 
          p={4} 
          borderWidth="1px" 
          borderRadius="lg" 
          bg="white"
          shadow="sm"
        >
          <Text fontSize="lg" fontWeight="semibold" mb={4}>
            Properties
          </Text>
          
          {Object.keys(properties).length === 0 ? (
            <Text color="fg.muted" fontSize="sm">No properties available</Text>
          ) : (
            <VStack gap={4} align="stretch">
              {Object.entries(properties).map(([key, value]) => (
                <Box key={key}>
                  <Text fontSize="sm" fontWeight="bold" color="blue.600" mb={2}>
                    {key}:
                  </Text>
                  <Box pl={4}>
                    {renderValue(value)}
                  </Box>
                </Box>
              ))}
            </VStack>
          )}
        </Box>
      </VStack>
    </Box>
  );
};

export default ProviderDetail;