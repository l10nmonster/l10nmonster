export async function jobCmd(mm, { pushJobId }) {
    // eslint-disable-next-line no-negated-condition
    if (pushJobId !== undefined) {
        const jobRequest = await mm.jobStore.getJob(pushJobId);
        if (jobRequest.status === 'blocked') {
            const translationProvider = mm.getTranslationProvider(jobRequest);
            if (translationProvider) {
                jobRequest.translationProvider = translationProvider.constructor.name;
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
}
