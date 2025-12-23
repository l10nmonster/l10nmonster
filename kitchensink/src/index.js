// L10n Monster - Core exports only (fast startup)
// For helper packages, import from 'l10nmonster/<package>'

export * from '@l10nmonster/core';

import { l10nMonsterVersion } from '@l10nmonster/core';
export const version = l10nMonsterVersion;
