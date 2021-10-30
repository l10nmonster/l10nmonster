import android from 'android-string-resource';

export class AndroidFilter {
    constructor({ comment }) {
        this.comment = comment || 'pre';
    }

    async parseResource({ resource }) {
        const parsedResource = await android.asr2js(resource, { comment: this.comment });
        const translationUnits = [];
        for (const [sid, source] of Object.entries(parsedResource)) {
            // TODO: support pluggable message format handlers for placeholders
            // if (source.attr.translatable !== 'false') { // TODO: support translatable attribute
                const tu = { };
                if (sid.indexOf('.') >= 0) {
                    tu.isSuffixPluralized = true;
                    tu.sid = sid.replace('.', '_');
                } else {
                    tu.sid = sid;
                }
                if (typeof source === 'object') {
                    tu.str = source.value;
                    if (source.comment) {
                        tu.notes = typeof source.comment === 'string' ? source.comment : source.comment.join('\n');
                    }
                } else {
                    tu.str = source;
                }
                translationUnits.push(tu);
            // }
        }
        return {
            translationUnits,
        };
    }

    async generateTranslatedResource({ resourceId, resource, lang, translator }) {
        const parsedResource = await android.asr2js(resource);
        for (const [id, source] of Object.entries(parsedResource)) {
            const sid = id.indexOf('.') >= 0? id.replace('.', '_') : id;
            const sourceStr = typeof source === 'object' ? source.value : source;
            parsedResource[id] = translator(resourceId, sid, sourceStr);
            // TODO: deal with plurals of the target language, not the source
        }
        return await android.js2asr(parsedResource);
    }
}