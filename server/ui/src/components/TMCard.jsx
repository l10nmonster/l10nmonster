import React from 'react';
import { Box, Text, Badge, Flex, Button, VStack, Grid, Link } from '@chakra-ui/react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

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
      w="100%"
    >
      <VStack gap={4} align="stretch">
        {/* Language Pair Header */}
        <Box>
          <Box mb={2}>
            <Link
              as={RouterLink}
              to={`/tm/${sourceLang}/${targetLang}`}
              fontSize="lg"
              fontWeight="semibold"
              color="blue.600"
              _hover={{ textDecoration: "underline" }}
            >
              {sourceLang} → {targetLang}
            </Link>
          </Box>
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
              <Grid 
                templateColumns={{ 
                  base: "minmax(0, 2fr) 1fr 1fr 1fr 1fr", 
                  md: "minmax(0, 3fr) 1fr 1fr 1fr 1fr" 
                }} 
                gap={{ base: 1, md: 2 }} 
                alignItems="center"
                overflow="hidden"
                minWidth="0"
              >
                {/* Provider Name */}
                <Box minWidth="0" overflow="hidden">
                  <Text fontSize="xs" color="fg.muted" mb={1}>Provider</Text>
                  <Link
                    as={RouterLink}
                    to={`/tm/${sourceLang}/${targetLang}?translationProvider=${encodeURIComponent(provider.translationProvider)}`}
                    fontSize="sm"
                    fontWeight="semibold"
                    color="blue.600"
                    _hover={{ textDecoration: "underline", color: "blue.700" }}
                    noOfLines={1}
                    title={provider.translationProvider}
                  >
                    {provider.translationProvider}
                  </Link>
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