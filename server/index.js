import express from 'express';
import cors from 'cors';
import path from 'path';
import open from 'open';
import { readFileSync } from 'fs';
import { getBaseDir } from '@l10nmonster/core';
import { setupStatusRoute } from './routes/status.js';
import { setupActiveContentStatsRoute } from './routes/sources.js';
import { setupTmRoutes } from './routes/tm.js';

const serverPackage = JSON.parse(readFileSync(path.join(import.meta.dirname, 'package.json'), 'utf-8'));

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

        apiRouter.get('/info', async (req, res) => {
            res.json({
                version: serverPackage.version,
                description: serverPackage.description,
                baseDir: path.resolve(getBaseDir()),
            });
        });
    
        // Setup routes from separate files
        setupStatusRoute(apiRouter, mm);
        setupActiveContentStatsRoute(apiRouter, mm);
        setupTmRoutes(apiRouter, mm);

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
