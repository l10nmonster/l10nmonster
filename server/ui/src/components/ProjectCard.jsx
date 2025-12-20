import React, { useState } from 'react';
import { Card, Text, Box, Flex, Badge, Link, Table } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';

const ProjectCard = ({ project, channelId, sourceLang, targetLang }) => {
  const [isTranslatedExpanded, setIsTranslatedExpanded] = useState(false);
  const [isUntranslatedExpanded, setIsUntranslatedExpanded] = useState(false);
  const {
    projectName,
    pairSummaryByStatus,
    translatedDetails,
    untranslatedDetails
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

  // Build translated rows
  const translatedRows = [];
  translatedDetails?.forEach((item, index) => {
    const status = item.q === 0 ? 'in flight' : (item.q >= item.minQ ? 'translated' : 'low quality');
    const statusColor = status === 'translated' ? 'green.solid' :
                        status === 'in flight' ? 'blue.solid' : 'yellow.solid';
    translatedRows.push({
      key: `translated-${index}`,
      status,
      statusColor,
      group: null,
      q: item.q,
      minQ: item.minQ,
      res: item.res,
      seg: item.seg,
      words: item.words,
      chars: item.chars
    });
  });

  // Build untranslated rows
  const untranslatedRows = [];
  Object.entries(untranslatedDetails || {}).forEach(([group, groupDetails]) => {
    const groupName = group === 'null' ? '(no group)' : group;
    groupDetails.forEach((item, index) => {
      untranslatedRows.push({
        key: `untranslated-${group}-${index}`,
        group: groupName,
        minQ: item.minQ,
        res: item.res,
        seg: item.seg,
        words: item.words,
        chars: item.chars
      });
    });
  });

  const hasTranslatedDetails = translatedRows.length > 0;
  const hasUntranslatedDetails = untranslatedRows.length > 0;

  // Calculate subtotals (res is not summed because resources are not mutually exclusive)
  const translatedSubtotal = translatedRows.reduce((acc, row) => ({
    seg: acc.seg + (row.seg || 0),
    words: acc.words + (row.words || 0),
    chars: acc.chars + (row.chars || 0)
  }), { seg: 0, words: 0, chars: 0 });

  const untranslatedSubtotal = untranslatedRows.reduce((acc, row) => ({
    seg: acc.seg + (row.seg || 0),
    words: acc.words + (row.words || 0),
    chars: acc.chars + (row.chars || 0)
  }), { seg: 0, words: 0, chars: 0 });

  return (
    <Card.Root variant="outline" bg="yellow.subtle">
      <Card.Body>
        <Flex align="center" justify="space-between" gap={2} mb={2}>
          {statusUrl ? (
            <Link
              as={RouterLink}
              to={statusUrl}
              fontSize="sm"
              fontWeight="semibold"
              color="purple.600"
              _hover={{ textDecoration: "underline" }}
            >
              {projectName}
            </Link>
          ) : (
            <Text fontSize="sm" fontWeight="semibold">
              {projectName}
            </Text>
          )}
          {statusCounts.untranslated > 0 && (
            <Badge variant="solid" colorPalette="red" size="sm">
              {statusCounts.untranslated.toLocaleString()} untranslated
            </Badge>
          )}
        </Flex>

        <Box mb={3}>
          <Flex align="center" gap={2} mb={1}>
            <Box
              flex="1"
              bg="bg.muted"
              rounded="full"
              height="10px"
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
            <Text fontSize="sm" color="fg.muted" minW="45px">
              {pctTranslated}%
            </Text>
          </Flex>
        </Box>

        {/* Single table with expandable sections */}
        <Box overflow="auto">
          <Table.Root size="sm" variant="line">
            <Table.Header>
              <Table.Row bg="yellow.100">
                <Table.ColumnHeader></Table.ColumnHeader>
                <Table.ColumnHeader textAlign="right">Min Q</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="right">Res</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="right">Strings</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="right">Words</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="right">Chars</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {/* Translated section header */}
              <Table.Row
                bg="green.subtle"
                cursor={hasTranslatedDetails ? "pointer" : "default"}
                onClick={() => hasTranslatedDetails && setIsTranslatedExpanded(!isTranslatedExpanded)}
                _hover={hasTranslatedDetails ? { bg: "green.100" } : {}}
              >
                <Table.Cell>
                  <Flex align="center" gap={2}>
                    {hasTranslatedDetails && (
                      <Text fontSize="xs" color="green.700">{isTranslatedExpanded ? "▼" : "▶"}</Text>
                    )}
                    <Text fontSize="xs" fontWeight="semibold" color="green.700">Translated</Text>
                  </Flex>
                </Table.Cell>
                <Table.Cell></Table.Cell>
                <Table.Cell></Table.Cell>
                <Table.Cell textAlign="right">
                  <Text fontSize="xs" fontWeight="medium" color="green.700">{translatedSubtotal.seg.toLocaleString()}</Text>
                </Table.Cell>
                <Table.Cell textAlign="right">
                  <Text fontSize="xs" fontWeight="medium" color="green.700">{translatedSubtotal.words.toLocaleString()}</Text>
                </Table.Cell>
                <Table.Cell textAlign="right">
                  <Text fontSize="xs" fontWeight="medium" color="green.700">{translatedSubtotal.chars.toLocaleString()}</Text>
                </Table.Cell>
              </Table.Row>

              {/* Translated detail rows */}
              {isTranslatedExpanded && translatedRows.map((row) => (
                <Table.Row key={row.key} bg="green.50">
                  <Table.Cell pl={8}>
                    <Text fontSize="xs" color="fg.muted">
                      Quality {row.q}
                    </Text>
                  </Table.Cell>
                  <Table.Cell textAlign="right">
                    <Text fontSize="xs" color="fg.muted">{row.minQ}</Text>
                  </Table.Cell>
                  <Table.Cell textAlign="right">
                    <Text fontSize="xs" color="fg.muted">{row.res?.toLocaleString() || '—'}</Text>
                  </Table.Cell>
                  <Table.Cell textAlign="right">
                    <Text fontSize="xs" color="fg.muted">{row.seg?.toLocaleString()}</Text>
                  </Table.Cell>
                  <Table.Cell textAlign="right">
                    <Text fontSize="xs" color="fg.muted">{row.words?.toLocaleString()}</Text>
                  </Table.Cell>
                  <Table.Cell textAlign="right">
                    <Text fontSize="xs" color="fg.muted">{row.chars?.toLocaleString()}</Text>
                  </Table.Cell>
                </Table.Row>
              ))}

              {/* Untranslated section header */}
              {untranslatedSubtotal.seg > 0 && (
                <Table.Row
                  bg="red.subtle"
                  cursor={hasUntranslatedDetails ? "pointer" : "default"}
                  onClick={() => hasUntranslatedDetails && setIsUntranslatedExpanded(!isUntranslatedExpanded)}
                  _hover={hasUntranslatedDetails ? { bg: "red.100" } : {}}
                >
                  <Table.Cell>
                    <Flex align="center" gap={2}>
                      {hasUntranslatedDetails && (
                        <Text fontSize="xs" color="red.700">{isUntranslatedExpanded ? "▼" : "▶"}</Text>
                      )}
                      <Text fontSize="xs" fontWeight="semibold" color="red.700">Untranslated</Text>
                    </Flex>
                  </Table.Cell>
                  <Table.Cell></Table.Cell>
                  <Table.Cell></Table.Cell>
                  <Table.Cell textAlign="right">
                    <Text fontSize="xs" fontWeight="medium" color="red.700">{untranslatedSubtotal.seg.toLocaleString()}</Text>
                  </Table.Cell>
                  <Table.Cell textAlign="right">
                    <Text fontSize="xs" fontWeight="medium" color="red.700">{untranslatedSubtotal.words.toLocaleString()}</Text>
                  </Table.Cell>
                  <Table.Cell textAlign="right">
                    <Text fontSize="xs" fontWeight="medium" color="red.700">{untranslatedSubtotal.chars.toLocaleString()}</Text>
                  </Table.Cell>
                </Table.Row>
              )}

              {/* Untranslated detail rows */}
              {isUntranslatedExpanded && untranslatedRows.map((row) => (
                <Table.Row key={row.key} bg="red.50">
                  <Table.Cell pl={8}>
                    <Text fontSize="xs" color="fg.muted">
                      {row.group}
                    </Text>
                  </Table.Cell>
                  <Table.Cell textAlign="right">
                    <Text fontSize="xs" color="fg.muted">{row.minQ}</Text>
                  </Table.Cell>
                  <Table.Cell textAlign="right">
                    <Text fontSize="xs" color="fg.muted">{row.res?.toLocaleString() || '—'}</Text>
                  </Table.Cell>
                  <Table.Cell textAlign="right">
                    <Text fontSize="xs" color="fg.muted">{row.seg?.toLocaleString()}</Text>
                  </Table.Cell>
                  <Table.Cell textAlign="right">
                    <Text fontSize="xs" color="fg.muted">{row.words?.toLocaleString()}</Text>
                  </Table.Cell>
                  <Table.Cell textAlign="right">
                    <Text fontSize="xs" color="fg.muted">{row.chars?.toLocaleString()}</Text>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      </Card.Body>
    </Card.Root>
  );
};

export default ProjectCard;
