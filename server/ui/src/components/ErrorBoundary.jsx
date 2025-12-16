import React from 'react';
import { Box, Text, Button, VStack } from '@chakra-ui/react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box p={8} maxW="800px" mx="auto" mt={10}>
          <VStack gap={4} align="stretch">
            <Box
              bg="red.subtle"
              borderLeft="4px"
              borderLeftColor="red.500"
              p={6}
              borderRadius="md"
            >
              <Text fontSize="lg" fontWeight="bold" color="red.700" mb={2}>
                Something went wrong
              </Text>
              <Text color="red.600" mb={4}>
                {this.state.error?.message || 'An unexpected error occurred'}
              </Text>
              <Button
                colorPalette="red"
                variant="outline"
                size="sm"
                onClick={this.handleReset}
              >
                Try Again
              </Button>
            </Box>

            {this.state.errorInfo && (
              <Box
                bg="gray.subtle"
                p={4}
                borderRadius="md"
                overflow="auto"
                maxH="300px"
              >
                <Text fontSize="sm" fontWeight="bold" color="fg.muted" mb={2}>
                  Technical Details
                </Text>
                <Text
                  as="pre"
                  fontSize="xs"
                  fontFamily="mono"
                  whiteSpace="pre-wrap"
                  color="fg.muted"
                >
                  {this.state.errorInfo.componentStack}
                </Text>
              </Box>
            )}
          </VStack>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
