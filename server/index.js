import express from 'express';
import cors from 'cors';
import path from 'path';
import open from 'open';
import * as mockData from './mockData.js'; // Import named exports, add .js extension

export default class serve {
    static help = {
        description: 'starts the L10n Monster server.',
        options: [
            [ '--port <number>', 'listen to specified port' ],
            [ '--ui', 'also serve a web frontend' ],
        ]
    };

    static async action(mm, options) {
        const port = options.port ?? 9691;
        const app = express();

        // === Middleware ===
        app.use(cors());
        app.use(express.json());

        // === API Routes ===
        const apiRouter = express.Router();

        // GET /api/status
        apiRouter.get('/status', async (req, res) => {
            try {
                const status = await mm.getTranslationStatus()
                res.json(status);
            } catch (error) {
                console.error('Error fetching status: ', error);
                res.status(500).json({ message: 'Problems fetching status data' });
            }
        });

        // GET /api/untranslated/:sourceLang/:targetLang
        apiRouter.get('/untranslated/:sourceLang/:targetLang', (req, res) => {
            const { sourceLang, targetLang } = req.params;
            const pairKey = `${sourceLang}_${targetLang}`;
            const content = mockData.untranslatedContent[pairKey] || [];
            res.json(content);
        });

        // GET /api/tm/stats/:sourceLang/:targetLang
        apiRouter.get('/tm/stats/:sourceLang/:targetLang', (req, res) => {
            const { sourceLang, targetLang } = req.params;
            const pairKey = `${sourceLang}_${targetLang}`;
            const tmInfo = mockData.tmData[pairKey] || { summary: { totalUnits: 0, lastUpdated: 'N/A' }, units: [] };
            res.json(tmInfo);
        });

        // Mount the API router under the /api prefix
        app.use('/api', apiRouter);

        if (options.ui) {
            const uiDistPath = path.join(import.meta.dirname, 'ui', 'dist');
            app.use(express.static(uiDistPath)); // rest of dist files
            app.get('/*splat', (req, res) => res.sendFile(path.join(uiDistPath, 'index.html'))); // fallback for Client-Side Routing
        }

        // === Start Server ===
        app.listen(port, async () => {
            console.log(`🚀 L10n Monster Server listening on port ${port}`);
            options.ui && await open(`http://localhost:${port}`);
        });
    }
}
