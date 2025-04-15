export function fixedTargets(targetLangs, minimumQuality) {
    if (!Array.isArray(targetLangs)) {
        targetLangs = [ targetLangs ];
    }
    const planToApply = Object.fromEntries(targetLangs.map(targetLang => [ targetLang, minimumQuality ]));
    return ({ plan }) => Object.assign(plan, planToApply);
};

export function byProject(prjToPipelineMap) {
    return (policyContext) => {
        const pipeline = prjToPipelineMap[policyContext.res.prj] ?? [];
        pipeline.forEach(policy => policyContext.plan = policy(policyContext));
        return policyContext.plan;
    };
};
