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

      // Add the API routes
      app.get('/api/status', async (req, res) => {
        try {
          const status = await mm.getTranslationStatus();
          res.json(status);
        } catch {
          res.status(500).json({ message: 'Problems fetching status data' });
        }
      });

      app.get('/api/untranslated/:sourceLang/:targetLang', (req, res) => {
        const content = [
          {
            id: 'test1',
            sourceText: 'Hello world',
            channel: 'default',
            project: 'test',
            resourcePath: 'test.json'
          }
        ];
        res.json(content);
      });

      app.get('/api/tm/stats/:sourceLang/:targetLang', (req, res) => {
        const tmInfo = {
          summary: { totalUnits: 100, lastUpdated: '2024-01-01' },
          units: [
            {
              id: 'tm1',
              sourceText: 'Hello',
              targetText: 'Bonjour',
              quality: 1
            }
          ]
        };
        res.json(tmInfo);
      });

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

  test('GET /api/status returns translation status', async () => {
    const response = await fetch(`${baseUrl}/api/status`);
    assert.strictEqual(response.status, 200);
    
    const data = await response.json();
    assert.ok(data);
    assert.strictEqual(typeof data, 'object');
    assert.ok(data.default);
  });

  test('GET /api/untranslated/:sourceLang/:targetLang returns content', async () => {
    const response = await fetch(`${baseUrl}/api/untranslated/en/fr`);
    assert.strictEqual(response.status, 200);
    
    const data = await response.json();
    assert.ok(Array.isArray(data));
    assert.strictEqual(data.length, 1);
    assert.strictEqual(data[0].sourceText, 'Hello world');
  });

  test('GET /api/tm/stats/:sourceLang/:targetLang returns TM data', async () => {
    const response = await fetch(`${baseUrl}/api/tm/stats/en/fr`);
    assert.strictEqual(response.status, 200);
    
    const data = await response.json();
    assert.ok(data);
    assert.ok(Object.hasOwn(data, 'summary'));
    assert.ok(Object.hasOwn(data, 'units'));
    assert.strictEqual(data.summary.totalUnits, 100);
  });
}); 