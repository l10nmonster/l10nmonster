import { lqaboss_capture } from './lqaboss_capture.js';

export class lqaboss {
    static help = {
        description: 'LQA Boss CLI.',
    };

    static subActions = [ lqaboss_capture ];
}
