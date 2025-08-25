import { readFileSync } from 'fs';
import path from 'path';
import { parse as yamlParse } from 'yaml';

/**
 * Checks if a file path has a YAML extension.
 * @param {string} pathName - The file path to check
 * @returns {boolean} True if the file has a .yaml or .yml extension
 */
function isYamlFile(pathName) {
    const ext = path.extname(pathName).toLowerCase();
    return ext === '.yaml' || ext === '.yml';
}

export class ImportTextFile {
    static configMancerSample = {
        '@': 'string',
        'fileName': 'string',
    }

    static configMancerFactory(obj) {
        const pathName = (obj['@baseDir'] && !path.isAbsolute(obj.fileName)) ?
            path.join(obj['@baseDir'], obj.fileName) :
            obj.fileName;
        return readFileSync(pathName, 'utf8');
    }
}

export class ImportJsonFile {
    static configMancerSample = {
        '@': 'object',
        'fileName': 'string',
    }

    static configMancerFactory(obj) {
        const pathName = (obj['@baseDir'] && !path.isAbsolute(obj.fileName)) ?
            path.join(obj['@baseDir'], obj.fileName) :
            obj.fileName;
        const contents = readFileSync(pathName, 'utf8');
        return isYamlFile(pathName) ? yamlParse(contents) : JSON.parse(contents);
    }
}
