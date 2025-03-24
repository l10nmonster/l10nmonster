export function fixedTargets(targetLangs, minimumQuality) {
    if (!Array.isArray(targetLangs)) {
        targetLangs = [targetLangs];
    }
    return ([plan]) => targetLangs.forEach(targetLang => plan[targetLang] = minimumQuality);
};
