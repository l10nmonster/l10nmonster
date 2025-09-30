export function fixedTargets(targetLangs, minimumQuality) {
    if (targetLangs && !Array.isArray(targetLangs)) {
        targetLangs = [ targetLangs ];
    }
    const planToApply = targetLangs ? Object.fromEntries(targetLangs.map(targetLang => [ targetLang, minimumQuality ])) : {};
    return ({ plan }) => ({ plan: { ...plan, ...planToApply } });
};

export function byProject(prjToPipelineMap) {
    return (policyContext) => {
        const pipeline = prjToPipelineMap[policyContext.res.prj] ?? [];
        pipeline.forEach(policy => {
            const returnedContext = policy(policyContext);
            if (returnedContext) {
                // eslint-disable-next-line no-unused-vars
                const { res, seg, ...segmentProps } = returnedContext; // preserve res and seg in policyContext
                Object.assign(policyContext, segmentProps);
            } else {
                throw new Error(`got nothing from policy ${policy} in project ${policyContext.res.prj}`);
            }
        });
        return policyContext;
    };
};
