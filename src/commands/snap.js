export async function snapCmd(mm) {
    if (mm.snapStore) {
        let resourceCount = 0;
        await mm.snapStore.startSnapshot();
        for await (const res of mm.source.getAllResources()) {
            // eslint-disable-next-line no-unused-vars
            const { modified, contentType, ...cleanSource } = res;
            await mm.snapStore.commitResource(cleanSource);
            resourceCount++;
        }
        await mm.snapStore.endSnapshot();
        return resourceCount;
    } else {
        throw `Snap store not configured`;
    }
}
