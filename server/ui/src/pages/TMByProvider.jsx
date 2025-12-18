import React from 'react';
import { Box, VStack, Button } from '@chakra-ui/react';
import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom';
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
            headerAction={
              <Button
                as={RouterLink}
                to={`/tm/${sourceLang}/${targetLang}`}
                size="sm"
                colorPalette="blue"
                variant="outline"
              >
                Search
              </Button>
            }
          />
        </VStack>
      </Box>
    </Box>
  );
};

export default TMByProvider;
