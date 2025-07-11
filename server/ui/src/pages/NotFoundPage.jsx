import React from 'react';
import { Container, Typography, Button, Box } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <Container maxWidth="sm" sx={{ textAlign: 'center', mt: 8 }}>
      <Typography variant="h1" gutterBottom>
        404
      </Typography>
      <Typography variant="h5" gutterBottom>
        Page Not Found
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        Sorry, the page you are looking for does not exist.
      </Typography>
      <Button variant="contained" component={RouterLink} to="/">
        Go to Home
      </Button>
    </Container>
  );
};

export default NotFoundPage;