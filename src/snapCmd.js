export async function snapCmd(mm) {
    if (mm.snapStore) {
        const snapshot = (await mm.source.getResources()).map(e => {
            // eslint-disable-next-line no-unused-vars
            const { modified, contentType, ...cleanSource } = e;
            return cleanSource;
        });
        await mm.snapStore.commitSnapshot(snapshot);
        return snapshot.length;
    } else {
        throw `snap store not configured`;
    }
}
