import React from 'react';
import { Card, CardContent, Typography, LinearProgress, Box } from '@mui/material';

const ProjectCard = ({ project }) => {
    const { sourceLang, targetLang, resCount, segmentCount, translationStatus } = project;
    const pairSummary = { untranslated: 0, "in flight": 0, translated: 0, "low quality": 0, words: 0, chars: 0 };
    for (const { minQ, q, seg, words, chars } of translationStatus) {
        const tuType = q === null ? 'untranslated' : (q === 0 ? 'in flight' : (q >= minQ ? 'translated' : 'low quality'));
        pairSummary[tuType] += seg;
        pairSummary.words += words;
        pairSummary.chars += chars;
    }
    const pctTranslated = Math.round(pairSummary.translated / segmentCount * 100);
    const otherTranslations = `${pairSummary['in flight'] ? `pairSummary['in flight'] in flight` : ''} ${pairSummary['low quality'] ? `pairSummary['low quality'] low quality` : ''}`;

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" component="div" gutterBottom>
          {sourceLang} → {targetLang}
        </Typography>
        {/* <Typography sx={{ mb: 1 }} color="text.secondary">
          Status: {status}
        </Typography> */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Box sx={{ width: '100%', mr: 1 }}>
            <LinearProgress variant="determinate" value={pctTranslated} />
          </Box>
          <Box sx={{ minWidth: 35 }}>
            <Typography variant="body2" color="text.secondary">{`${pctTranslated}%`}</Typography>
          </Box>
        </Box>
        <Typography variant="body2">Resources: {resCount}</Typography>
        <Typography variant="body2">Segments: {segmentCount}</Typography>
        <Typography variant="body2">Words: {pairSummary.words}</Typography>
        {pairSummary.translated < segmentCount && (<Typography variant="body2" sx={{ color: 'warning.main' }}>Untranslated: {segmentCount - pairSummary.translated} segments</Typography>)}
      </CardContent>
    </Card>
  );
};

export default ProjectCard;
