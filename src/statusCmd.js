export async function statusCmd(mm, { limitToLang }) {
    await mm.updateSourceCache();
    const status = {
        numSources: mm.getSourceCacheEntries().length,
        lang: {},
    };
    const targetLangs = mm.getTargetLangs(limitToLang);
    for (const targetLang of targetLangs) {
        const job = await mm.prepareTranslationJob({ targetLang });
        const unstranslatedContent = {};
        for (const tu of job.tus) {
            const prj = tu.prj || 'default';
            unstranslatedContent[prj] ??= {};
            unstranslatedContent[prj][tu.rid] ??= {};
            unstranslatedContent[prj][tu.rid][tu.sid] = tu.src;
        }
        status.lang[targetLang] = {
            leverage: job.leverage,
            unstranslatedContent,
        };
        if (mm.ctx.build && mm.ctx.release && mm.stateStore) {
            // TODO: calculate passing grade based on config and add it to status
            await mm.stateStore.updateBuildState(mm.ctx.build, mm.ctx.release, targetLang, job);
        }
    }
    status.pendingJobsNum = (await mm.jobStore.getJobManifests('pending')).length;
    return status;
}
