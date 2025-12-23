import { createHash } from 'crypto';
import gettextParser from 'gettext-parser';

/** @typedef {import('@l10nmonster/core').ResourceFilter} ResourceFilter */

/**
 * Filter for gettext PO files.
 * @implements {ResourceFilter}
 */
export class PoFilter {
    async parseResource({ resource, isSource }) {
        const poFile = gettextParser.po.parse(resource);
        const segments = [];
        for (const [domain, pairs] of Object.entries(poFile.translations)) {
            for (const s of Object.values(pairs)) {
                if (s.msgid.length > 0) {
                    const sidHash = createHash('sha1');
                    sidHash.update(s.msgid, 'utf8');
                    const sid = `${domain}:${sidHash.digest().toString('base64')}`;
                    const str = isSource ? s.msgid : s.msgstr[0];
                    const seg = {
                        sid,
                        str,
                        notes: JSON.stringify(s.comments),
                    };
                    if (s?.comments?.flag) {
                        seg.msgFmt = s.comments.flag; // TODO: don't just log this but actually use it for protecting placeholders
                    }
                    if (s.msgid_plural) {
                        const baseSid = seg.sid;
                        (isSource || seg.str.length > 0) && segments.push({
                            ...seg,
                            sid: `${baseSid}_one`,
                            pluralForm: 'one',
                        });
                        seg.sid = `${baseSid}_other`;
                        seg.pluralForm = "other";
                        seg.str = s.msgid_plural; // TODO: this is wrong if isSource === true, should get s.msgstr array and create corresponding segments
                    }
                    (isSource || seg.str.length > 0) && segments.push(seg);
                }
            }
        }
        return {
            segments,
        };
    }

    async translateResource({ resource, translator }) {
        const poFile = gettextParser.po.parse(resource);
        for (const [domain, segments] of Object.entries(poFile.translations)) {
            for (const s of Object.values(segments)) {
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
                        // TODO: deal with missing translations
                        s.msgstr = [ await translator(sid, s.msgid) ];
                    }
                } else {
                    // TODO: do we need to generate correct meta for empty msgid?
                }
            }
        }
        return gettextParser.po.compile(poFile);
    }
}
