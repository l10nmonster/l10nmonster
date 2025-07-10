import { readFileSync } from 'fs';
import path from 'path';

export class ImportTextFile {
    static configMancerSample = {
        '@': 'string',
        'fileName': 'string',
    }

    static configMancerFactory(obj) {
        const pathName = obj['@baseDir'] ? path.join(obj['@baseDir'], obj.fileName) : obj.fileName;
        const text = readFileSync(pathName, 'utf8');
        return text;
    }
}

export class ImportJsonFile {
    static configMancerSample = {
        '@': 'object',
        'fileName': 'string',
    }

    static configMancerFactory(obj) {
        const pathName = obj['@baseDir'] ? path.join(obj['@baseDir'], obj.fileName) : obj.fileName;
        const json = JSON.parse(readFileSync(pathName, 'utf8'));
        return json;
    }
}
