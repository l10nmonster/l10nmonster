import { logInfo, logVerbose } from '@l10nmonster/core';

export function setupProviderRoute(apiRouter, mm) {
  apiRouter.get('/providers', async (req, res) => {
    logInfo`/providers`;
    try {
      const providers = {};
      for (const provider of mm.dispatcher.providers) {
        const { id, ...info } = await provider.info();
        providers[id] = { properties: provider, info };
      }
      logVerbose`Returned provider info for ${Object.keys(providers).length} providers`;
      res.json(providers);
    } catch (error) {
      console.error('Error fetching provider data:', error);
      res.status(500).json({ error: 'Failed to fetch provider data' });
    }
  });
}