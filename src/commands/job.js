export async function jobPushCmd(mm, pushJobGuid) {
    const blockedRequest = await mm.jobStore.getJobRequest(pushJobGuid);
    if (blockedRequest.status === 'blocked') {
        const translationProvider = mm.getTranslationProvider(blockedRequest);
        if (translationProvider) {
            const jobResponse = await translationProvider.translator.requestTranslations(blockedRequest);
            await mm.processJob(jobResponse);
            return {
                status: jobResponse.status,
                num: jobResponse.tus?.length ?? jobResponse.inflight?.length ?? 0,
            };
        } else {
            throw 'No corresponding translationProvider configured';
        }
    } else {
        throw `Only blocked jobs can be submitted (current status is ${blockedRequest.status})`;
    }
}
