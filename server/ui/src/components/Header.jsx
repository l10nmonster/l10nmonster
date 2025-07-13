import React from 'react';
import { Box, Flex, Heading, IconButton } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { Globe, User } from 'lucide-react';

const Header = () => {
  return (
    <Box bg="blue.600" color="white" px={4} py={3}>
      <Flex justify="space-between" align="center">
        <Flex
          as={RouterLink}
          to="/"
          align="center"
          gap={2}
          textDecoration="none"
          color="inherit"
          _hover={{ opacity: 0.8 }}
        >
          <Globe size={24} />
          <Heading size="lg">L10n Monster</Heading>
        </Flex>
        
        <IconButton 
          variant="ghost"
          colorPalette="gray"
          aria-label="Account"
          size="lg"
        >
          <User />
        </IconButton>
      </Flex>
    </Box>
  );
};

export default Header; 