import { logInfo, logVerbose } from '@l10nmonster/core';

export function setupProviderRoute(apiRouter, mm) {
  apiRouter.get('/providers/:providerId', async (req, res) => {
    const { providerId } = req.params;
    logInfo`/providers/${providerId}`;
    try {
      const provider = mm.dispatcher.getProvider(providerId);
      const { id, ...info } = await provider.info();
      logVerbose`Returned provider info for ${id}`;
      res.json({ properties: provider, info });
    } catch (error) {
      console.error('Error fetching provider data:', error);
      res.status(500).json({ error: 'Failed to fetch provider data' });
    }
  });
}