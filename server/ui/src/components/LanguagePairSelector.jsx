import React, { useMemo, useState } from 'react';
import { Box, Text, Button, Flex, Badge, Collapsible, SimpleGrid } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../utils/api';

// Chevron Icons
const ChevronDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
  </svg>
);

const ChevronUpIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
  </svg>
);

/**
 * Reusable language pair selector component
 *
 * @param {Object} props
 * @param {Function} props.onSelect - Callback when a pair is selected: (sourceLang, targetLang) => void
 * @param {Object} props.currentPair - Optional current selection: { sourceLang, targetLang }
 * @param {React.ReactNode} props.triggerContent - Optional custom trigger content
 * @param {React.ReactNode} props.rightContent - Optional content to render on the right side of the header row
 * @param {boolean} props.defaultOpen - Whether the selector is open by default
 */
const LanguagePairSelector = ({ onSelect, currentPair, triggerContent, rightContent, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const { data: tmStatsPairs = [] } = useQuery({
    queryKey: ['tmStats'],
    queryFn: () => fetchApi('/api/tm/stats'),
  });

  // Convert array format to language pairs for the dropdown
  const languagePairs = useMemo(() => {
    const pairs = tmStatsPairs.map(([sourceLang, targetLang]) => ({
      value: `${sourceLang}|${targetLang}`,
      label: `${sourceLang} → ${targetLang}`,
      sourceLang,
      targetLang
    }));
    return pairs.sort((a, b) => a.label.localeCompare(b.label));
  }, [tmStatsPairs]);

  const handleSelect = (pairValue) => {
    if (pairValue && onSelect) {
      const [sourceLang, targetLang] = pairValue.split('|');
      onSelect(sourceLang, targetLang);
      setIsOpen(false);
    }
  };

  const isCurrentPair = (pair) => {
    return currentPair &&
           pair.sourceLang === currentPair.sourceLang &&
           pair.targetLang === currentPair.targetLang;
  };

  if (languagePairs.length === 0) {
    return null;
  }

  return (
    <Box
      bg="blue.subtle"
      borderBottom="1px"
      borderColor="blue.muted"
      shadow="md"
      borderLeft="4px"
      borderLeftColor="blue.500"
    >
      <Collapsible.Root open={isOpen} onOpenChange={(details) => setIsOpen(details.open)}>
        <Box px={6} py={4}>
          <Flex align="center" justify="space-between">
            <Collapsible.Trigger
              as={Button}
              variant="ghost"
              size="md"
              justifyContent="flex-start"
              _hover={{ bg: "blue.muted" }}
              bg="transparent"
              gap={2}
            >
              {triggerContent || (
                <Flex align="center" gap={3}>
                  <Text fontSize="md" fontWeight="semibold" color="blue.700">
                    Language Pairs
                  </Text>
                  <Badge
                    colorPalette="blue"
                    variant="subtle"
                    size="sm"
                  >
                    {languagePairs.length}
                  </Badge>
                </Flex>
              )}
              <Box color="blue.600">
                {isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
              </Box>
            </Collapsible.Trigger>
            {rightContent && (
              <Flex align="center" gap={3}>
                {rightContent}
              </Flex>
            )}
          </Flex>
        </Box>
        <Collapsible.Content>
          <Box px={6} pb={4}>
            <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4, xl: 5 }} gap={2}>
              {languagePairs.map((pair) => (
                <Button
                  key={pair.value}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelect(pair.value)}
                  _hover={{ bg: "blue.100", borderColor: "blue.400" }}
                  justifyContent="flex-start"
                  bg={isCurrentPair(pair) ? "blue.100" : "white"}
                  borderColor={isCurrentPair(pair) ? "blue.400" : "blue.200"}
                  borderWidth={isCurrentPair(pair) ? "2px" : "1px"}
                >
                  <Text fontSize="xs" color="blue.700">{pair.label}</Text>
                </Button>
              ))}
            </SimpleGrid>
          </Box>
        </Collapsible.Content>
      </Collapsible.Root>
    </Box>
  );
};

export default LanguagePairSelector;
