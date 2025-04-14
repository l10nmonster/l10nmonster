export function fixedTargets(targetLangs, minimumQuality) {
    if (!Array.isArray(targetLangs)) {
        targetLangs = [ targetLangs ];
    }
    return () => Object.fromEntries(targetLangs.map(targetLang => [ targetLang, minimumQuality ]));
};

export function byProject(prjToPipelineMap) {
    return (policyContext) => {
        const pipeline = prjToPipelineMap[policyContext.res.prj] ?? [];
        pipeline.forEach(policy => policyContext.plan = policy(policyContext));
        return policyContext.plan;
    };
};
