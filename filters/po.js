import {
    createHash,
} from 'crypto';

import gettextParser from 'gettext-parser';

export class PoFilter {
    async parseResource({ resource, isSource }) {
        const poFile = gettextParser.po.parse(resource);
        const translationUnits = [];
        for (const [domain, segments] of Object.entries(poFile.translations)) {
            for (const s of Object.values(segments)) {
                if (s.msgid.length > 0) {
                    const sidHash = createHash('sha1');
                    sidHash.update(s.msgid, 'utf8');
                    const sid = `${domain}:${sidHash.digest().toString('base64')}`;
                    const str = isSource ? s.msgid : s.msgstr[0];
                    const tu = {
                        sid,
                        str,
                        notes: JSON.stringify(s.comments),
                    };
                    if (s?.comments?.flag) {
                        tu.msgFmt = s.comments.flag; // TODO: don't just log this but actually use it for protecting placeholders
                    }
                    if (s.msgid_plural) {
                        const baseSid = tu.sid;
                        tu.isSuffixPluralized = true;
                        translationUnits.push({
                            ...tu,
                            sid: `${baseSid}_one`,
                        });
                        tu.sid = `${baseSid}_other`;
                        tu.str = s.msgid_plural; // TODO: this is wrong if isSource === true, should get s.msgstr array and create corresponding tu's
                    }
                    translationUnits.push(tu);
                }
            }
        }
        return {
            translationUnits,
        };
    }

    async generateTranslatedResource({ resourceId, resource, lang, translator }) {
        const poFile = gettextParser.po.parse(resource);
        for (const [domain, segments] of Object.entries(poFile.translations)) {
            for (const [k, s] of Object.entries(segments)) {
                if (s.msgid.length > 0) {
                    const sidHash = createHash('sha1');
                    sidHash.update(s.msgid);
                    const sid = `${domain}:${sidHash.digest().toString('base64')}`;
                    if (s?.comments?.flag) {
                        // TODO: we need to convert back to raw format from normalized format
                    }
                    if (s.msgid_plural) {
                        // TODO
                    } else {
                        s.msgstr = [ await translator(resourceId, sid, s.msgid) ];
                    }
                } else {
                    // TODO: do we need to generate correct meta for empty msgid?
                }
            }
        }
        return gettextParser.po.compile(poFile);
    }
}