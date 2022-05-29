export async function jobPushCmd(mm, pushJobGuid) {
    const blockedRequest = await mm.jobStore.getJob(pushJobGuid);
    if (blockedRequest.status === 'blocked') {
        const translationProvider = mm.getTranslationProvider(blockedRequest);
        if (translationProvider) {
            const jobResponse = await translationProvider.translator.requestTranslations(blockedRequest);
            jobResponse.num = jobResponse.tus?.length ?? jobResponse.inflight?.length ?? 0;
            await mm.processJob(jobResponse);
            return {
                status: jobResponse.status,
                num: jobResponse.num,
            };
        } else {
            throw 'No translationProvider configured';
        }
    } else {
        throw `Only blocked jobs can be submitted (current status is ${blockedRequest.status})`;
    }
}
