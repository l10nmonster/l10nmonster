// Global unhandled promise rejection handler for server
process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 Unhandled Promise Rejection in L10n Monster Server:');
    console.error('Promise:', promise);
    console.error('Reason:', reason);
    if (reason instanceof Error && reason.stack) {
        console.error('Stack trace:', reason.stack);
    }
    // In server context, log but don't exit immediately to allow graceful handling
    console.error('This should be investigated and fixed!');
});

// Global uncaught exception handler
process.on('uncaughtException', (error) => {
    console.error('🚨 Uncaught Exception in L10n Monster Server:', error);
});

import express from 'express';
import cors from 'cors';
import path from 'path';
import open from 'open';
import os from 'os';
import { readFileSync } from 'fs';
import { setupInfoRoute } from './routes/info.js';
import { setupStatusRoute } from './routes/status.js';
import { setupChannelRoutes } from './routes/sources.js';
import { setupTmRoutes } from './routes/tm.js';
import { setupProviderRoute } from './routes/providers.js';
import { setupDispatcherRoutes } from './routes/dispatcher.js';

const serverPackage = JSON.parse(readFileSync(path.join(import.meta.dirname, 'package.json'), 'utf-8'));

export default class serve {
    static help = {
        description: 'starts the L10n Monster server.',
        options: [
            [ '--host <address>', 'hostname/IP to bind to and open in browser (default: all interfaces)' ],
            [ '--port <number>', 'listen to specified port (default: 9691)' ],
            [ '--ui', 'also serve a web frontend' ],
            [ '--open', 'open browser with web frontend' ],
        ]
    };

    static async action(mm, options) {
        const port = options.port ?? 9691;
        const host = options.host; // undefined means listen on all interfaces
        const app = express();

        // === Middleware ===
        app.use(cors());
        app.use(express.json());

        // === API Routes ===
        const apiRouter = express.Router();
    
        // Setup routes from separate files
        setupInfoRoute(apiRouter, mm, serverPackage);
        setupStatusRoute(apiRouter, mm);
        setupChannelRoutes(apiRouter, mm);
        setupTmRoutes(apiRouter, mm);
        setupProviderRoute(apiRouter, mm);
        setupDispatcherRoutes(apiRouter, mm);

        // Mount the API router under the /api prefix
        app.use('/api', apiRouter);

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
            
            console.log(`🚀 L10n Monster Server v${serverPackage.version} started\n`);
            
            // Handle Unix domain sockets (string) vs TCP sockets (AddressInfo)
            if (typeof address === 'string') {
                console.log('  Listening on Unix socket:');
                console.log(`  - ${address}`);
                
                if (options.open && options.ui) {
                    console.log('\n  ⚠️  Cannot open browser for Unix domain socket. Please access the server manually.');
                }
            } else {
                const boundPort = address.port;
                const boundAddress = address.address;
                
                console.log('  Available at:');
                
                // Determine what URLs to show and what to open
                let openHost = host || 'localhost'; // Default to localhost for opening
                
                // If listening on all interfaces (0.0.0.0 or ::)
                if (!host || boundAddress === '0.0.0.0' || boundAddress === '::') {
                    // Show localhost first
                    console.log(`  - http://localhost:${boundPort}`);
                    console.log(`  - http://127.0.0.1:${boundPort}`);
                    
                    // Get all network interfaces
                    const interfaces = os.networkInterfaces();
                    for (const [name, addresses] of Object.entries(interfaces)) {
                        for (const addr of addresses) {
                            // Skip internal interfaces and IPv6 link-local addresses
                            if (!addr.internal && addr.family === 'IPv4') {
                                console.log(`  - http://${addr.address}:${boundPort} (${name})`);
                            }
                        }
                    }
                } else {
                    // Specific address was bound
                    openHost = boundAddress; // Use the bound address for opening
                    console.log(`  - http://${boundAddress}:${boundPort}`);
                    
                    // Also show localhost if we bound to 127.0.0.1
                    if (boundAddress === '127.0.0.1') {
                        console.log(`  - http://localhost:${boundPort}`);
                    }
                }
                
                if (options.open) {
                    const openUrl = `http://${openHost}:${boundPort}`;
                    console.log('');
                    console.log(`  Opening browser at: ${openUrl}`);
                    await open(openUrl);
                }
            }
            console.log('');
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
}
