import { pluralForms } from '../pluralForms.js';

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

export function minimizePluralForms() {
    return ({ plan, seg, ...rest }) => {
        if (seg.pluralForm) {
            const filteredPlan = {};
            for (const [lang, quality] of Object.entries(plan)) {
                // Extract language family (first part before "-" or "_")
                const langFamily = lang.split(/[-_]/)[0];
                const requiredForms = pluralForms[langFamily];
                // Keep the language if we don't know its plural forms or if the form is required
                if (!requiredForms || requiredForms.includes(seg.pluralForm)) {
                    filteredPlan[lang] = quality;
                }
            }
            return { plan: filteredPlan, seg, ...rest };
        }
        return { plan, seg, ...rest };
    };
}
