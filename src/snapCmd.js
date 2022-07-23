export async function snapCmd(mm) {
    if (mm.snap) {
        const snapshot = (await mm.source.getEntries()).map(e => {
            // eslint-disable-next-line no-unused-vars
            const { modified, ...cleanSource } = e[1];
            return cleanSource;
        });
        await mm.snap.commitSnapshot(snapshot);
        return snapshot.length;
    } else {
        throw `snap store not configured`;
    }
}
