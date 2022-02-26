import { flattenNormalizedSourceV1 } from '../normalizers/util.js';

export async function pushCmd(mm, { limitToLang, leverage, dryRun }) {
    const status = [];
    await mm.updateSourceCache();
    const targetLangs = mm.getTargetLangs(limitToLang);
    for (const targetLang of targetLangs) {
        const langStatus = { targetLang };
        const jobBody = await mm.prepareTranslationJob({ targetLang, leverage });
        if (Object.keys(jobBody.tus).length > 0) {
            if (dryRun) {
                const unstranslatedContent = {};
                for (const tu of jobBody.tus) {
                    const prj = tu.prj || 'default';
                    unstranslatedContent[prj] ??= {};
                    unstranslatedContent[prj][tu.rid] ??= {};
                    unstranslatedContent[prj][tu.rid][tu.sid] = tu.nsrc ? flattenNormalizedSourceV1(tu.nsrc)[0] : tu.src;
                }
                langStatus.unstranslatedContent = unstranslatedContent;
            } else {
                const manifest = await mm.jobStore.createJobManifest();
                const jobRequest = {
                    ...jobBody,
                    ...manifest,
                };
                const translationProvider = mm.getTranslationProvider(jobRequest);
                if (translationProvider) {
                    jobRequest.translationProvider = translationProvider.constructor.name;
                    // this may return a "jobResponse" if syncronous or a "jobManifest" if asynchronous
                    const jobResponse = await translationProvider.requestTranslations(jobRequest);
                    await mm.processJob(jobResponse, jobRequest);
                    langStatus.status = jobResponse.status;
                    langStatus.num = jobResponse.tus?.length ?? jobResponse.inflight?.length ?? 0;
                } else {
                    throw 'No translationProvider configured';
                }
            }
            status.push(langStatus);
        }
    }
    return status;
}
