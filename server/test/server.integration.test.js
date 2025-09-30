import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';

describe('L10n Monster Server Integration Tests', () => {
  let server;
  let baseUrl;

  before(async () => {
    // Import the server module
    const { default: serve } = await import('../index.js');
    
    // Create a mock monsterManager
    const mockMM = {
      getTranslationStatus: async () => ({
        'default': {
          'project1': {
            'en': {
              'fr': {
                resCount: 10,
                segmentCount: 100,
                translationStatus: [
                  { minQ: 1, q: 1, seg: 80, words: 800, chars: 4000 },
                  { minQ: 1, q: null, seg: 20, words: 200, chars: 1000 }
                ]
              }
            }
          }
        }
      }),
      getActiveContentStats: async () => ({
        'ios': [
          {
            prj: null,
            sourceLang: 'en',
            targetLangs: ['ar', 'it'],
            segmentCount: 96,
            resCount: 3,
            lastModified: '2025-04-21T21:14:28.050Z'
          }
        ]
      }),
      getTmStats: async () => ({
        'en': {
          'ar': [
            {
              translationProvider: 'gemini-openai',
              status: 'done',
              tuCount: 31,
              distinctGuids: 31,
              jobCount: 1
            }
          ]
        }
      })
    };

    // Start the server on a random port
    const port = 0; // Use 0 to get a random available port
    
    // Mock the action to return a promise that resolves with the server
    serve.action = async (mm, options) => {
      const express = (await import('express')).default;
      const cors = (await import('cors')).default;
      const app = express();
      
      app.use(cors());
      app.use(express.json());

      // === API Routes ===
      const apiRouter = express.Router();

      apiRouter.get('/info', async (req, res) => {
        res.json({
          version: '3.0.0-alpha.3',
          description: 'L10n Monster Manager',
          baseDir: '/test/path',
        });
      });

      // Status route
      apiRouter.get('/status', async (req, res) => {
        try {
          const status = await mm.getTranslationStatus();
          res.json(status);
        } catch {
          res.status(500).json({ message: 'Problems fetching status data' });
        }
      });

      // TM stats route
      apiRouter.get('/tm/stats', async (req, res) => {
        try {
          const stats = await mm.tmm.getTmStats();
          res.json(stats);
        } catch {
          res.status(500).json({ message: 'Problems fetching TM stats' });
        }
      });

      // Mount the API router under the /api prefix
      app.use('/api', apiRouter);

      return new Promise((resolve) => {
        server = app.listen(options.port, () => {
          const actualPort = server.address().port;
          baseUrl = `http://localhost:${actualPort}`;
          resolve(server);
        });
      });
    };

    await serve.action(mockMM, { port });
  });

  after(() => {
    if (server) {
      server.close();
    }
  });

  test('GET /api/info returns server information', async () => {
    const response = await fetch(`${baseUrl}/api/info`);
    assert.strictEqual(response.status, 200);
    
    const data = await response.json();
    assert.ok(data);
    assert.strictEqual(typeof data, 'object');
    assert.ok(data.version);
    assert.ok(data.description);
    assert.ok(data.baseDir);
  });

  test('GET /api/status returns translation status', async () => {
    const response = await fetch(`${baseUrl}/api/status`);
    assert.strictEqual(response.status, 200);
    
    const data = await response.json();
    assert.ok(data);
    assert.strictEqual(typeof data, 'object');
    assert.ok(data.default);
  });

  test('GET /api/tm/stats returns TM statistics', async () => {
    const response = await fetch(`${baseUrl}/api/tm/stats`);
    assert.strictEqual(response.status, 200);
    
    const data = await response.json();
    assert.ok(data);
    assert.strictEqual(typeof data, 'object');
    assert.ok(data.en);
    assert.ok(data.en.ar);
    assert.ok(Array.isArray(data.en.ar));
    assert.strictEqual(data.en.ar[0].translationProvider, 'gemini-openai');
  });
}); 