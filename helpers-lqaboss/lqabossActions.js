import { lqaboss_capture } from './lqabossCapture.js';

export class LQABossActions {
    static name = 'lqaboss';
    static help = {
        description: 'Actions to integrate with LQA Boss.',
    };

    static subActions = [ lqaboss_capture ];
}
