import React from 'react';
import { Box, Text, Badge, Flex, Button, VStack, Grid } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';

const TMCard = ({ sourceLang, targetLang, providers }) => {
  const navigate = useNavigate();

  const getStatusColor = (status) => {
    switch (status) {
      case 'done': return 'green';
      case 'pending': return 'yellow';
      case 'error': return 'red';
      default: return 'gray';
    }
  };

  return (
    <Box 
      p={6} 
      borderWidth="1px" 
      borderRadius="lg" 
      bg="white" 
      shadow="sm"
      w="900px"
    >
      <VStack gap={4} align="stretch">
        {/* Language Pair Header */}
        <Box>
          <Flex align="center" justify="space-between" mb={2}>
            <Flex align="center" gap={3}>
              <Badge colorPalette="blue" size="sm">
                {sourceLang}
              </Badge>
              <Text color="fg.muted" fontSize="lg">→</Text>
              <Badge colorPalette="green" size="sm">
                {targetLang}
              </Badge>
            </Flex>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/tm/${sourceLang}/${targetLang}`)}
            >
              View
            </Button>
          </Flex>
        </Box>

        {/* Providers */}
        <VStack gap={3} align="stretch">
          {providers.map((provider, index) => (
            <Box 
              key={index}
              p={3}
              borderWidth="1px"
              borderRadius="md"
              borderColor="border.default"
              bg="yellow.subtle"
            >
              <Grid templateColumns="2fr 80px 80px 80px 80px" gap={4} alignItems="center">
                {/* Provider Name */}
                <Box>
                  <Text fontSize="xs" color="fg.muted" mb={1}>Provider</Text>
                  <Text fontSize="sm" fontWeight="semibold">
                    {provider.translationProvider}
                  </Text>
                </Box>

                {/* Status */}
                <Box textAlign="center">
                  <Text fontSize="xs" color="fg.muted" mb={1}>Status</Text>
                  <Badge colorPalette={getStatusColor(provider.status)} size="sm">
                    {provider.status}
                  </Badge>
                </Box>

                {/* TU Count */}
                <Box textAlign="center">
                  <Text fontSize="xs" color="fg.muted" mb={1}>TUs</Text>
                  <Text fontSize="sm" fontWeight="bold" color="purple.600">
                    {provider.tuCount.toLocaleString()}
                  </Text>
                </Box>

                {/* Distinct GUIDs */}
                <Box textAlign="center">
                  <Text fontSize="xs" color="fg.muted" mb={1}>Unique</Text>
                  <Text fontSize="sm" fontWeight="bold" color="orange.600">
                    {provider.distinctGuids.toLocaleString()}
                  </Text>
                </Box>

                {/* Job Count */}
                <Box textAlign="center">
                  <Text fontSize="xs" color="fg.muted" mb={1}>Jobs</Text>
                  <Text fontSize="sm" fontWeight="bold" color="teal.600">
                    {provider.jobCount.toLocaleString()}
                  </Text>
                </Box>
              </Grid>
            </Box>
          ))}
        </VStack>
      </VStack>
    </Box>
  );
};

export default TMCard;