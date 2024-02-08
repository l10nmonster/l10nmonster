module.exports = class lint {
    static help = {
        description: 'a sample lint checker for content sources',
    };
    static async action(mm) {
        const warnings = [];
        for await (const res of mm.rm.getAllResources()) {
            l10nmonster.logger.verbose(`Running DuplicateLinter on ${res.id}`);
                const keys = new Set();
                for (const seg of res.segments) {
                    if (keys.has(seg.sid)) {
                        warnings.push({
                            location: {
                                resourceId: res.id,
                                ...seg.location
                            },
                            message: `Found duplicate key ${seg.sid}`,
                        });
                        l10nmonster.logger.error(`Found duplicate key ${seg.sid} in resource ${res.id}`);
                    } else {
                        keys.add(seg.sid);
                    }
                }
        }
        return warnings;
    }
}
