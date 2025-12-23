import { pluralForms } from '../pluralForms.js';

/**
 * @typedef {import('../../index.js').TranslationPlan} TranslationPlan
 * @typedef {import('../../index.js').TranslationPolicy} TranslationPolicy
 * @typedef {import('../../index.js').PolicyContext} PolicyContext
 */

/**
 * Creates a policy that sets fixed target languages with a minimum quality.
 * @param {string | string[]} targetLangs - Target language(s) to translate to.
 * @param {number} minimumQuality - Minimum quality score (0-100).
 * @returns {TranslationPolicy} A translation policy function.
 */
export function fixedTargets(targetLangs, minimumQuality) {

    /** @type {string[]} */
    const langs = targetLangs ? (Array.isArray(targetLangs) ? targetLangs : [ targetLangs ]) : [];

    /** @type {TranslationPlan} */
    const planToApply = Object.fromEntries(langs.map(targetLang => [ targetLang, minimumQuality ]));
    return ({ plan }) => ({ plan: { ...plan, ...planToApply } });
};

/**
 * Creates a policy that routes to different pipelines based on project.
 * @param {Record<string, TranslationPolicy[]>} prjToPipelineMap - Map of project names to policy pipelines.
 * @returns {TranslationPolicy} A translation policy function.
 */
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

/**
 * Creates a policy that filters out plural forms not needed by target languages.
 * @returns {TranslationPolicy} A translation policy function.
 */
export function minimizePluralForms() {
    return (/** @type {PolicyContext} */ { plan, seg, ...rest }) => {
        if (seg.pluralForm) {

            /** @type {TranslationPlan} */
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
