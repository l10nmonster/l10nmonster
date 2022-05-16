// i18next j4 json format defined at https://www.i18next.com/misc/json-format
import flatten from "flat";

export class JsonFilter {
    constructor(params) {
        this.enableArbAnnotations = params?.enableArbAnnotations || false;
        this.enablePluralSuffixes = params?.enablePluralSuffixes || false;
        this.emitArbAnnotations = params?.emitArbAnnotations || false;
    }

    async parseResource({ resource }) {
        var segments = [];
        var notes = {};
        const parsedResource = Object.entries(flatten(resource));

        for (const [key, value] of parsedResource) {
            if (this.enableArbAnnotations &&key.split(".").slice(-2)[0].startsWith("@")) {
                const regExpKey =
                    /(?<prefix>.+?\.)?@(?<key>\S+)\.(?<attribute>\S+)/;
                const match = regExpKey.exec(key);
                if (["description", "type", "context", "placeholders", "screenshot", "video", "source_text"]
                    .some((attribute) => match.groups.attribute === attribute)) {
                    const sid = `${match.groups.prefix ?? ""}${match.groups.key}`;
                    notes[sid] = notes[sid] ?
                        (notes[sid] += `. ${value}`) :
                        value;
                } else if (this?.ctx?.verbose) {
                    console.log(`Unexpected ARB format: ${match.groups.attribute} for ${match.groups.key}`);
                    console.dir(resource, { depth: null });
                }
            }
        }

        for (const [key, value] of parsedResource) {
            if (!key.split(".").slice(-2)[0].startsWith("@")) {
                var seg = { sid: key, str: value };
                notes[key] && (seg.notes = notes[key]);
                this.enablePluralSuffixes &&
                    ["_one", "_other", "_zero", "_two", "_few", "_many"].some((plural) => key.endsWith(plural)) && 
                        (seg.isSuffixPluralized = true);
                segments.push(seg);
            }
        }
        return {
            segments,
        };
    }

    async generateTranslatedResource({ resource, translator }) {
        const parsedResource = flatten(resource);
        for (const [sid, str] of Object.entries(parsedResource)) {
            if (sid.split(".").slice(-2)[0].startsWith("@")) {
                !this.emitArbAnnotations &&
                    this.enableArbAnnotations &&
                    delete parsedResource[sid];
            } else {
                const translation = await translator(sid, str);
                if (translation === undefined) {
                    delete parsedResource[sid];
                } else {
                    parsedResource[sid] = translation;
                }
            }
        }
        return flatten.unflatten(parsedResource);
    }
}
