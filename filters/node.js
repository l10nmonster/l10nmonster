import flatten from 'flat'; 

export class NodeFilter {

    async parseResource( resource ) {
        const segments = [];
        for(const [key, value] of Object.entries(flatten(resource))){
            if (key.indexOf("@")===-1) {
                const seg = {
                    sid: key,
                    str: value,
                };
                if (key.endsWith("_one")||key.endsWith("_other")) {
                    seg.isSuffixPluralized = true;
                }
                segments.push(seg);
            } else {
                if(key.endsWith(".description")) {
                    const entry = segments.find(e=>e.sid===key.replace("@","").replace(".description",""));
                    entry.notes = value;
                }
            }
        }
        return {
            segments,
        }
    }

}