import { lqaboss_capture } from './lqabossCapture.js';

/**
 * CLI actions for LQA Boss integration.
 * @type {import('@l10nmonster/core').L10nAction}
 */
export const LQABossActions = {
    name: 'lqaboss',
    help: {
        description: 'Actions to integrate with LQA Boss.',
    },
    subActions: [ lqaboss_capture ],
};
