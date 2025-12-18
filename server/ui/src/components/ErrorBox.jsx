import { Box, Text } from '@chakra-ui/react';

const ErrorBox = ({ error, fallbackMessage = 'An unexpected error occurred', title }) => {
  const isNetworkError = error?.message?.includes('Failed to fetch') || error?.message?.includes('Network');

  return (
    <Box p={4} bg="red.100" borderRadius="md" borderWidth="1px" borderColor="red.300">
      <Text fontWeight="bold" color="red.700" mb={2}>
        {title || (isNetworkError ? 'Connection Error' : 'Error')}
      </Text>
      <Text color="red.600">
        {isNetworkError
          ? 'Unable to connect to the server. Please check that the L10n Monster server is running.'
          : (error?.message || fallbackMessage)}
      </Text>
    </Box>
  );
};

export default ErrorBox;
