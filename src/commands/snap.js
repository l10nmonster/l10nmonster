export async function snapCmd(mm, { maxSegments } = {}) {
    if (mm.snapStore) {
        maxSegments ??= 1000;
        let resourceCount = 0;
        await mm.snapStore.startSnapshot();
        let currentPrj;
        let currentChunk = {};
        let accumulatedSegments = 0;
        let resources = [];
        for await (const res of mm.source.getAllResourcesFromSources()) {
            // eslint-disable-next-line no-unused-vars
            const prj = res.prj ?? 'default';
            if (currentPrj !== prj || accumulatedSegments >= maxSegments) {
                if (resources.length > 0) {
                    await mm.snapStore.commitResources(currentPrj, currentChunk[prj], resources);
                    accumulatedSegments = 0;
                    resources = [];
                }
                currentChunk[prj] ??= 0;
                currentChunk[prj]++;
                currentPrj = prj;
            }
            resources.push(res);
            accumulatedSegments += res.segments.length;
            resourceCount++;
        }
        if (resources.length > 0) {
            await mm.snapStore.commitResources(currentPrj, currentChunk[currentPrj], resources);
        }
        await mm.snapStore.endSnapshot();
        return resourceCount;
    } else {
        throw `Snap store not configured`;
    }
}
