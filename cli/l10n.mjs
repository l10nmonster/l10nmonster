#!/usr/bin/env node

import runMonsterCLI from './index.js';
import { resolve } from 'path';

await runMonsterCLI((await import(resolve('.', 'l10nmonster.config.mjs'))).default);
