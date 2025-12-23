import express from 'express';
import cors from 'cors';
import path from 'path';
import open from 'open';
import os from 'os';
import { setupInfoRoute } from './routes/info.js';
import { setupStatusRoute } from './routes/status.js';
import { setupChannelRoutes } from './routes/sources.js';
import { setupTmRoutes } from './routes/tm.js';
import { setupProviderRoute } from './routes/providers.js';
import { setupDispatcherRoutes } from './routes/dispatcher.js';
import { consoleLog, l10nMonsterVersion, l10nMonsterDescription } from '@l10nmonster/core';

/**
 * CLI action for starting the L10n Monster server.
 * @type {import('@l10nmonster/core').L10nAction & { extensions: Record<string, Function>, registerExtension: (name: string, routeMaker: Function) => void }}
 */
const ServeAction = {
    extensions: {},
    name: 'serve',
    help: {
        description: 'starts the L10n Monster server.',
        options: [
            [ '--host <address>', 'hostname/IP to bind to and open in browser (default: all interfaces)' ],
            [ '--port <number>', 'listen to specified port (default: 9691)' ],
            [ '--ui', 'also serve a web frontend' ],
            [ '--open', 'open browser with web frontend' ],
        ]
    },

    registerExtension(name, routeMaker) {
        this.extensions[name] = routeMaker;
    },

    async action(mm, options) {
        const port = options.port ?? 9691;
        const host = options.host; // undefined means listen on all interfaces
        const app = express();

        // === Middleware ===
        app.use(cors());
        app.use(express.json());
        app.use(express.json({ limit: '10mb' }));

        // === API Routes ===
        const apiRouter = express.Router();

        // Setup routes from separate files
        setupInfoRoute(apiRouter, mm, l10nMonsterVersion, l10nMonsterDescription);
        setupStatusRoute(apiRouter, mm);
        setupChannelRoutes(apiRouter, mm);
        setupTmRoutes(apiRouter, mm);
        setupProviderRoute(apiRouter, mm);
        setupDispatcherRoutes(apiRouter, mm);

        // Mount the API router under the /api prefix
        app.use('/api', apiRouter);

        for (const [name, routeMaker] of Object.entries(ServeAction.extensions)) {
            const extensionRouter = express.Router();
            const routes = routeMaker(mm);
            for (const [method, path, handler] of routes) {
                extensionRouter[method](path, handler);
            }
            app.use(`/api/ext/${name}`, extensionRouter);
            consoleLog`Mounted extension ${name} at /api/ext/${name}`;
        }

        // API 404 handler - must come before the UI catch-all
        app.use('/api/*splat', (req, res) => {
            res.status(404).json({
                error: 'API endpoint not found',
                path: req.path,
                method: req.method
            });
        });

        if (options.ui || options.open) {
            const uiDistPath = path.join(import.meta.dirname, 'ui', 'dist');
            app.use(express.static(uiDistPath)); // rest of dist files
            app.get('/*splat', (req, res) => res.sendFile(path.join(uiDistPath, 'index.html'))); // fallback for Client-Side Routing
        }

        // === Start Server ===
        const listenArgs = [port];
        if (host) {
            listenArgs.push(host);
        }

        const server = app.listen(...listenArgs, async () => {
            const address = server.address();

            consoleLog`L10n Monster Server v${l10nMonsterVersion} started 🚀\n`;

            // Handle Unix domain sockets (string) vs TCP sockets (AddressInfo)
            if (typeof address === 'string') {
                consoleLog`  Listening on Unix socket:`;
                consoleLog`  - ${address}`;

                if (options.open && options.ui) {
                    consoleLog`\n  ⚠️  Cannot open browser for Unix domain socket. Please access the server manually.`;
                }
            } else {
                const boundPort = address.port;
                const boundAddress = address.address;

                consoleLog`  Available at:`;

                // Determine what URLs to show and what to open
                let openHost = host || 'localhost'; // Default to localhost for opening

                // If listening on all interfaces (0.0.0.0 or ::)
                if (!host || boundAddress === '0.0.0.0' || boundAddress === '::') {
                    // Show localhost first
                    consoleLog`  - http://localhost:${boundPort}`;
                    consoleLog`  - http://127.0.0.1:${boundPort}`;

                    // Get all network interfaces
                    const interfaces = os.networkInterfaces();
                    for (const [name, addresses] of Object.entries(interfaces)) {
                        for (const addr of addresses) {
                            // Skip internal interfaces and IPv6 link-local addresses
                            if (!addr.internal && addr.family === 'IPv4') {
                                consoleLog`  - http://${addr.address}:${boundPort} (${name})`;
                            }
                        }
                    }
                } else {
                    // Specific address was bound
                    openHost = boundAddress; // Use the bound address for opening
                    consoleLog`  - http://${boundAddress}:${boundPort}`;

                    // Also show localhost if we bound to 127.0.0.1
                    if (boundAddress === '127.0.0.1') {
                        consoleLog`  - http://localhost:${boundPort}`;
                    }
                }

                if (options.open) {
                    const openUrl = `http://${openHost}:${boundPort}`;
                    consoleLog``;
                    consoleLog`  Opening browser at: ${openUrl}`;
                    await open(openUrl);
                }
            }
            consoleLog``;
        });

        // Handle server binding errors
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                const addressStr = host ? `${host}:${port}` : `port ${port}`;
                throw new Error(`Failed to bind server: Address ${addressStr} is already in use`);
            } else if (error.code === 'EACCES') {
                const addressStr = host ? `${host}:${port}` : `port ${port}`;
                throw new Error(`Failed to bind server: Permission denied for ${addressStr}`);
            } else if (error.code === 'EADDRNOTAVAIL') {
                throw new Error(`Failed to bind server: Address ${host} is not available on this system`);
            } else {
                throw new Error(`Failed to bind server: ${error.message}`);
            }
        });

        return server;
    }
};

export default ServeAction;
