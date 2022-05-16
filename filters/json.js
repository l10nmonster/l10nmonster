// i18next j4 json format defined at https://www.i18next.com/misc/json-format
import flatten from "flat";

export class JsonFilter {
    constructor(params) {
        this.enableARBAnnotations = params?.enableARBAnnotations || false;
        this.enablePluralSuffixes = params?.enablePluralSuffixes || false;
        this.emitComments = params?.emitComments || false;
    }

    async parseResource({ resource }) {
        var segments = [];
        var notes = {};
        for (const [key, value] of Object.entries(flatten(resource))) {
            if (key.indexOf("@") === -1) {
                var seg = { sid: key, str: value };
                notes[key] && (seg.notes = notes[key]);
                this.enablePluralSuffixes &&
                    ["_one", "_other", "_zero", "_two", "_few", "_many"].some((plural) => key.endsWith(plural)) &&
                    (seg.isSuffixPluralized = true);
                segments.push(seg);
            } else {
                if (this.enableARBAnnotations && key.endsWith(".description")) {
                    const sid = key
                        .replace("@", "")
                        .replace(".description", "");
                    const seg = segments.find((e) => e.sid === sid);
                    if (seg) {
                        seg.notes = value;
                    } else {
                        notes[sid] = value;
                    }
                } else {
                    console.error("Unsupported ARB format");
                }
            }
        }
        return {
            segments,
        };
    }

    async generateTranslatedResource({ resource, translator }) {
        let parsedResource = flatten(resource);
        for (const [sid, str] of Object.entries(parsedResource)) {
            if (sid.indexOf("@") === -1) {
                const translation = await translator(sid, str);
                if (translation === undefined) {
                    delete parsedResource[sid];
                } else {
                    parsedResource[sid] = translation;
                }
            } else {
                !this.emitComments &&
                    this.enableARBAnnotations &&
                    parsedResource[sid].endsWith(".description") &&
                    delete parsedResource[sid];
            }
        }
        return flatten.unflatten(parsedResource);
    }
}
