import React from 'react';
import { Card, Text, Box, Flex } from '@chakra-ui/react';

const ProjectCard = ({ project }) => {
  const { sourceLang, targetLang, resCount, segmentCount, translationStatus } = project;
  
  const pairSummary = { 
    untranslated: 0, 
    "in flight": 0, 
    translated: 0, 
    "low quality": 0, 
    words: 0, 
    chars: 0 
  };
  
  for (const { minQ, q, seg, words, chars } of translationStatus) {
    const tuType = q === null ? 'untranslated' : (q === 0 ? 'in flight' : (q >= minQ ? 'translated' : 'low quality'));
    pairSummary[tuType] += seg;
    pairSummary.words += words;
    pairSummary.chars += chars;
  }
  
  const pctTranslated = Math.round(pairSummary.translated / segmentCount * 100);

  return (
    <Card.Root variant="outline">
      <Card.Body>
        <Text fontSize="lg" fontWeight="semibold" mb={2}>
          {sourceLang} → {targetLang}
        </Text>
        
        <Box mb={3}>
          <Flex align="center" gap={2} mb={1}>
            <Box 
              flex="1" 
              bg="gray.200" 
              rounded="full" 
              height="6px" 
              position="relative"
            >
              <Box 
                bg="blue.500" 
                height="100%" 
                rounded="full" 
                width={`${pctTranslated}%`}
                transition="width 0.3s ease"
              />
            </Box>
            <Text fontSize="sm" color="gray.600" minW="45px">
              {pctTranslated}%
            </Text>
          </Flex>
        </Box>
        
        <Text fontSize="sm">Resources: {resCount}</Text>
        <Text fontSize="sm">Segments: {segmentCount}</Text>
        <Text fontSize="sm">Words: {pairSummary.words}</Text>
        
        {pairSummary.untranslated > 0 && (
          <Text fontSize="sm" color="orange.600">
            Untranslated: {pairSummary.untranslated} segments
          </Text>
        )}
      </Card.Body>
    </Card.Root>
  );
};

export default ProjectCard; 