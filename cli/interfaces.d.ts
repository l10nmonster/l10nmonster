/**
 * Central type definitions for @l10nmonster/cli
 * Re-exports L10nAction as CLIAction for CLI-specific use.
 */

// Re-export L10nAction from core as CLIAction for backwards compatibility
export { ActionHelp, L10nAction as CLIAction } from '@l10nmonster/core';

/**
 * Function signature for running the L10n Monster CLI.
 */
export type RunMonsterCLI = (
    monsterConfig: any,
    cliCommand?: string | string[]
) => Promise<void>;
