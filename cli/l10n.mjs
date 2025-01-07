#!/usr/bin/env node

import runMonsterCLI from '@l10nmonster/cli';
import { resolve } from 'path';

await runMonsterCLI((await import(resolve('.', 'l10nmonster.config.mjs'))).default);
