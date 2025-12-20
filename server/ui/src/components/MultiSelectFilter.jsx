import React from 'react';
import { Box, Text, Flex, Button, Menu, Portal } from '@chakra-ui/react';

const MultiSelectFilter = ({ value = [], onChange, options = [], placeholder, disabled, sortNumeric = false }) => {
  const selectedCount = value.length;
  // Show actual value if only 1 selected, otherwise show count
  const displayText = selectedCount === 0
    ? placeholder
    : selectedCount === 1
      ? value[0]
      : `${selectedCount} selected`;

  const handleToggle = (option) => {
    const optionStr = String(option);
    if (value.includes(optionStr)) {
      onChange(value.filter(v => v !== optionStr));
    } else {
      onChange([...value, optionStr]);
    }
  };

  const handleClearAll = (e) => {
    e.stopPropagation();
    onChange([]);
  };

  const handleSelectAll = (e) => {
    e.stopPropagation();
    onChange(options.map(opt => String(opt)));
  };

  const isAllSelected = selectedCount === options.length;
  const isPartiallySelected = selectedCount > 0 && selectedCount < options.length;

  if (!options || options.length === 0) {
    return (
      <Box
        fontSize="xs"
        px={2}
        py={1}
        bg="gray.subtle"
        borderRadius="sm"
        color="fg.muted"
      >
        No options
      </Box>
    );
  }

  return (
    <Menu.Root closeOnSelect={false}>
      <Menu.Trigger asChild>
        <Button
          size="xs"
          variant="outline"
          bg="yellow.subtle"
          borderColor="border.default"
          fontWeight="normal"
          w="100%"
          justifyContent="space-between"
          _hover={{ bg: "yellow.muted" }}
          disabled={disabled}
        >
          <Flex align="center" justify="space-between" w="100%" gap={1}>
            <Text fontSize="xs" color={selectedCount > 0 ? "fg.default" : "fg.muted"} overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
              {displayText}
            </Text>
            <Text fontSize="xs" color="fg.muted">▼</Text>
          </Flex>
        </Button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content
            minW="150px"
            maxH="250px"
            overflow="auto"
            bg="white"
            borderWidth="1px"
            borderColor="border.default"
            borderRadius="md"
            shadow="lg"
            zIndex={1000}
          >
            {options.length > 1 && (
              <>
                {/* Checkbox row: Select All / Indeterminate / All Selected */}
                <Menu.Item
                  value="__select_all__"
                  onClick={isAllSelected ? handleClearAll : handleSelectAll}
                  fontSize="xs"
                >
                  <Flex align="center" gap={2}>
                    <Box
                      w="14px"
                      h="14px"
                      borderWidth="1px"
                      borderColor={selectedCount > 0 ? "blue.500" : "gray.300"}
                      borderRadius="sm"
                      bg={selectedCount > 0 ? "blue.500" : "white"}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      {isAllSelected && (
                        <Text color="white" fontSize="10px" lineHeight="1">✓</Text>
                      )}
                      {isPartiallySelected && (
                        <Text color="white" fontSize="10px" lineHeight="1">−</Text>
                      )}
                    </Box>
                    <Text>Select All</Text>
                  </Flex>
                </Menu.Item>
                {/* Clear All button: only show when something is selected */}
                {selectedCount > 0 && (
                  <Menu.Item
                    value="__clear_all__"
                    onClick={handleClearAll}
                    fontSize="xs"
                    color="red.500"
                  >
                    Clear All ({selectedCount})
                  </Menu.Item>
                )}
                <Box h="1px" bg="gray.200" my={1} />
              </>
            )}
            {options
              .slice()
              .sort((a, b) => sortNumeric
                ? Number(a) - Number(b)
                : String(a).localeCompare(String(b)))
              .map((option) => {
                const optionStr = String(option);
                const isSelected = value.includes(optionStr);
                return (
                  <Menu.Item
                    key={optionStr}
                    value={optionStr}
                    onClick={() => handleToggle(optionStr)}
                    fontSize="xs"
                  >
                    <Flex align="center" gap={2}>
                      <Box
                        w="14px"
                        h="14px"
                        borderWidth="1px"
                        borderColor={isSelected ? "blue.500" : "gray.300"}
                        borderRadius="sm"
                        bg={isSelected ? "blue.500" : "white"}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        {isSelected && (
                          <Text color="white" fontSize="10px" lineHeight="1">
                            ✓
                          </Text>
                        )}
                      </Box>
                      <Text>{optionStr}</Text>
                    </Flex>
                  </Menu.Item>
                );
              })}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
};

export default MultiSelectFilter;
