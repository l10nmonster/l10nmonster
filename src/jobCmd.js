export async function jobPush(mm, pushJobId) {
    const jobRequest = await mm.jobStore.getJob(pushJobId);
    if (jobRequest.status === 'blocked') {
        const translationProvider = mm.getTranslationProvider(jobRequest);
        if (translationProvider) {
            const jobResponse = await translationProvider.requestTranslations(jobRequest);
            jobResponse.num = jobResponse.tus?.length ?? jobResponse.inflight?.length ?? 0;
            await mm.processJob(jobResponse, jobRequest);
            return {
                status: jobResponse.status,
                num: jobResponse.num,
            };
        } else {
            throw 'No translationProvider configured';
        }
    } else {
        throw `Only blocked jobs can be submitted (current status is ${jobRequest.status})`;
    }
}
