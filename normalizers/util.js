export function decodeString(str, decoderList) {
    let parts = [ str ];
    for (const decoder of decoderList) {
        parts = decoder(parts);
    }
    const consolidatedParts = [];
    let accumulatedString = '';
    for (const part of parts) {
        if (typeof part === 'string') {
            accumulatedString += part;
        } else {
            if (accumulatedString.length > 0) {
                consolidatedParts.push(accumulatedString);
                accumulatedString = '';
            }
            consolidatedParts.push(part);
        }
    }
    if (accumulatedString.length > 0) {
        consolidatedParts.push(accumulatedString);
    }
    return consolidatedParts;
}
