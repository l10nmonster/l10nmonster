import React from 'react';
import { Box, Text, VStack } from '@chakra-ui/react';
import { useNavigate, useParams } from 'react-router-dom';
import LazyTMCard from '../components/LazyTMCard';
import LanguagePairSelector from '../components/LanguagePairSelector';

const TMByProvider = () => {
  const navigate = useNavigate();
  const { sourceLang, targetLang } = useParams();

  const handleLanguagePairSelect = (newSourceLang, newTargetLang) => {
    navigate(`/tm/providers/${newSourceLang}/${newTargetLang}`);
  };

  return (
    <Box>
      {/* Language Pair Selector */}
      <LanguagePairSelector
        onSelect={handleLanguagePairSelect}
        currentPair={{ sourceLang, targetLang }}
      />

      {/* Main Content */}
      <Box py={6} px={6}>
        <VStack gap={6} align="stretch" maxW="800px" mx="auto" w="100%">
          <LazyTMCard
            sourceLang={sourceLang}
            targetLang={targetLang}
          />
        </VStack>
      </Box>
    </Box>
  );
};

export default TMByProvider;
