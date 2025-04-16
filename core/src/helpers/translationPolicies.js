export function fixedTargets(targetLangs, minimumQuality) {
    if (targetLangs && !Array.isArray(targetLangs)) {
        targetLangs = [ targetLangs ];
    }
    const planToApply = targetLangs ? Object.fromEntries(targetLangs.map(targetLang => [ targetLang, minimumQuality ])) : {};
    return ({ plan }) => Object.assign(plan, planToApply);
};

export function byProject(prjToPipelineMap) {
    return (policyContext) => {
        const pipeline = prjToPipelineMap[policyContext.res.prj] ?? [];
        pipeline.forEach(policy => policyContext.plan = policy(policyContext));
        return policyContext.plan;
    };
};
