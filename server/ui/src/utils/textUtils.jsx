import React from 'react';
import { Text } from '@chakra-ui/react';

/**
 * Helper function to render text with clickable HTTPS links
 * @param {string} text - The text that may contain URLs
 * @returns {React.ReactNode} - JSX with clickable links
 */
export function renderTextWithLinks(text) {
  if (!text) return null;

  const urlRegex = /(https:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <Text
          key={`link-${index}`}
          as="a"
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          color="blue.600"
          textDecoration="underline"
          _hover={{ color: "blue.800" }}
        >
          {part}
        </Text>
      );
    }
    return part;
  });
}