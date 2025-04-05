import { jobs_list } from './jobsList.js';
import { jobs_update } from './jobsUpdate.js';

export class jobs {
    static help = {
        description: 'various operations on jobs.',
        // options: [
        //     [ '-l, --lang <language>', 'only get jobs for the target language' ],
        // ]
    };

    static subActions = [ jobs_list, jobs_update ];
}
