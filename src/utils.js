import {
    createHash,
} from 'crypto';  

export function generateGuid(rid, sid, str) {
    // console.log(`generating guid from ${rid} + ${sid} + ${str}`);
    const sidContentHash = createHash('sha256');
    sidContentHash.update(rid, 'utf8');
    sidContentHash.update(sid, 'utf8');
    sidContentHash.update(str, 'utf8');
    return sidContentHash.digest().toString('base64');
}
