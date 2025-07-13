import React from 'react';
import { Container, Text, Button, Box } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <Container maxWidth="sm" textAlign="center" mt={20}>
      <Text fontSize="6xl" fontWeight="bold" mb={4}>
        404
      </Text>
      <Text fontSize="2xl" fontWeight="medium" mb={2}>
        Page Not Found
      </Text>
      <Text color="fg.muted" mb={8}>
        Sorry, the page you are looking for does not exist.
      </Text>
      <Button asChild colorPalette="brand" size="lg">
        <RouterLink to="/">
          Go to Home
        </RouterLink>
      </Button>
    </Container>
  );
};

export default NotFoundPage; 