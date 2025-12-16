import React from 'react';
import { Card, Text, Box, Flex, Tooltip, Badge, Link } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';

const ProjectCard = ({ project, channelId, sourceLang, targetLang }) => {
  const { 
    projectName, 
    pairSummary, 
    pairSummaryByStatus,
    translationStatus
  } = project;
  
  const statusCounts = {
    translated: pairSummaryByStatus?.translated || 0,
    'in flight': pairSummaryByStatus?.['in flight'] || 0,
    'low quality': pairSummaryByStatus?.['low quality'] || 0,
    untranslated: pairSummaryByStatus?.untranslated || 0
  };
  
  const totalSegs = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
  const pctTranslated = totalSegs > 0 ? Math.round(statusCounts.translated / totalSegs * 100) : 0;
  const pctInFlight = totalSegs > 0 ? Math.round(statusCounts['in flight'] / totalSegs * 100) : 0;
  const pctLowQuality = totalSegs > 0 ? Math.round(statusCounts['low quality'] / totalSegs * 100) : 0;
  const pctUntranslated = totalSegs > 0 ? Math.round(statusCounts.untranslated / totalSegs * 100) : 0;

  // Build the link URL if navigation props are provided
  const statusUrl = channelId && sourceLang && targetLang
    ? `/status/${channelId}/${sourceLang}/${targetLang}?prj=${encodeURIComponent(projectName)}`
    : null;

  return (
    <Card.Root variant="outline" bg="yellow.subtle">
      <Card.Body>
        {statusUrl ? (
          <Link
            as={RouterLink}
            to={statusUrl}
            fontSize="sm"
            fontWeight="semibold"
            mb={2}
            display="block"
            color="purple.600"
            _hover={{ textDecoration: "underline" }}
          >
            {projectName}
          </Link>
        ) : (
          <Text fontSize="sm" fontWeight="semibold" mb={2}>
            {projectName}
          </Text>
        )}
        
        <Box mb={3}>
          <Flex align="center" gap={2} mb={1}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <Box 
                  flex="1" 
                  bg="bg.muted" 
                  rounded="full" 
                  height="10px" 
                  cursor="help"
                  position="relative"
                  overflow="hidden"
                >
                  <Box 
                    position="absolute"
                    top="0"
                    left="0"
                    height="100%"
                    width={`${pctTranslated}%`}
                    bg="green.solid"
                    transition="width 0.3s ease"
                  />
                  <Box 
                    position="absolute"
                    top="0"
                    left={`${pctTranslated}%`}
                    height="100%"
                    width={`${pctInFlight}%`}
                    bg="blue.solid"
                    transition="width 0.3s ease"
                  />
                  <Box 
                    position="absolute"
                    top="0"
                    left={`${pctTranslated + pctInFlight}%`}
                    height="100%"
                    width={`${pctLowQuality}%`}
                    bg="yellow.solid"
                    transition="width 0.3s ease"
                  />
                  <Box 
                    position="absolute"
                    top="0"
                    left={`${pctTranslated + pctInFlight + pctLowQuality}%`}
                    height="100%"
                    width={`${pctUntranslated}%`}
                    bg="red.solid"
                    transition="width 0.3s ease"
                  />
                </Box>
              </Tooltip.Trigger>
              <Tooltip.Positioner>
                <Tooltip.Content maxW="300px" bg="bg.default" borderWidth="1px" borderColor="border.default" shadow="lg" zIndex={1000}>
                  <Tooltip.Arrow />
                  <Box p={2}>
                    <Text fontSize="sm" fontWeight="bold" mb={2} color="fg.default">Translation Status Details</Text>
                    {translationStatus && translationStatus.length > 0 ? (
                      <Box>
                        {translationStatus.map((item, index) => {
                          const status = item.q === null ? 'untranslated' : (item.q === 0 ? 'in flight' : (item.q >= item.minQ ? 'translated' : 'low quality'));
                          const statusColor = status === 'translated' ? 'green.solid' : 
                                            status === 'in flight' ? 'blue.solid' : 
                                            status === 'low quality' ? 'yellow.solid' : 'red.solid';
                          
                          return (
                            <Flex key={index} align="center" gap={2} mb={1}>
                              <Box w="8px" h="8px" bg={statusColor} borderRadius="full" />
                              <Text fontSize="xs" color="fg.default">
                                Q: {item.q || 'null'} | Segs: {item.seg} | Words: {item.words} | Chars: {item.chars}
                              </Text>
                            </Flex>
                          );
                        })}
                      </Box>
                    ) : (
                      <Box>
                        <Flex align="center" gap={2} mb={1}>
                          <Box w="8px" h="8px" bg="green.solid" borderRadius="full" />
                          <Text fontSize="xs" color="fg.default">Translated: {statusCounts.translated}</Text>
                        </Flex>
                        <Flex align="center" gap={2} mb={1}>
                          <Box w="8px" h="8px" bg="blue.solid" borderRadius="full" />
                          <Text fontSize="xs" color="fg.default">In Flight: {statusCounts['in flight']}</Text>
                        </Flex>
                        <Flex align="center" gap={2} mb={1}>
                          <Box w="8px" h="8px" bg="yellow.solid" borderRadius="full" />
                          <Text fontSize="xs" color="fg.default">Low Quality: {statusCounts['low quality']}</Text>
                        </Flex>
                        <Flex align="center" gap={2}>
                          <Box w="8px" h="8px" bg="red.solid" borderRadius="full" />
                          <Text fontSize="xs" color="fg.default">Untranslated: {statusCounts.untranslated}</Text>
                        </Flex>
                      </Box>
                    )}
                  </Box>
                </Tooltip.Content>
              </Tooltip.Positioner>
            </Tooltip.Root>
            <Text fontSize="sm" color="fg.muted" minW="45px">
              {pctTranslated}%
            </Text>
          </Flex>
        </Box>
        
        <Flex gap={2} flexWrap="wrap" align="center">
          <Badge variant="subtle" colorPalette="blue">
            Segments: {pairSummary?.segs?.toLocaleString() || '0'}
          </Badge>
          <Badge variant="subtle" colorPalette="green">
            Words: {pairSummary?.words?.toLocaleString() || '0'}
          </Badge>
          <Badge variant="subtle" colorPalette="purple">
            Chars: {pairSummary?.chars?.toLocaleString() || '0'}
          </Badge>
          {statusCounts.untranslated > 0 && (
            <Badge variant="solid" colorPalette="red">
              Untranslated: {statusCounts.untranslated.toLocaleString()}
            </Badge>
          )}
          {statusCounts['low quality'] > 0 && (
            <Badge variant="solid" colorPalette="orange">
              Low Quality: {statusCounts['low quality'].toLocaleString()}
            </Badge>
          )}
        </Flex>
      </Card.Body>
    </Card.Root>
  );
};

export default ProjectCard; 