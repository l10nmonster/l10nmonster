# @l10nmonster/server

L10n Monster Manager UI - Web-based interface for managing localization projects and translation workflows.

## How It Works

The L10n Monster server is implemented as an **action** in the L10n Monster CLI. When you run `l10n serve --ui`, it:

1. **Starts an Express server** that connects to the current L10n Monster project
2. **Serves real-time data** from your project's translation memory and source files
3. **Optionally serves the web UI** (when `--ui` flag is used) from pre-built static files

### Important: This is NOT a standalone server
- The server must be run from within a L10n Monster project directory (where `l10nmonster.config.mjs` exists)
- It accesses the project's MonsterManager instance (`mm`) to fetch real translation data
- The API endpoints return actual project data, not mock data

## Installation

```bash
npm install @l10nmonster/server
```

## Usage

### From within a L10n Monster project:

```bash
# Navigate to your l10nmonster project directory
cd samples/CardboardSDK/l10nmonster

# Start the server with API only
npx l10n serve --port 9691

# Start the server with web UI
npx l10n serve --port 9691 --ui
```

## Building the UI

The UI must be built before it can be served:

```bash
cd server
npm install
npm run build
```

This creates the `ui/dist` directory with the built static files.

## Features

### Web UI

Modern React-based interface built with:
- **Chakra UI 3.0**: Modern component library with excellent performance
- **React 19**: Latest React with improved performance
- **TypeScript**: Type-safe development
- **React Router**: Client-side routing
- **Vite**: Fast development and build tooling
- **Responsive Design**: Works on desktop and mobile

### API Endpoints

All endpoints return **real project data** from the MonsterManager instance:

- `GET /api/status` - Real-time translation status from `mm.getTranslationStatus()`
- `GET /api/untranslated/:sourceLang/:targetLang` - Actual untranslated content (currently using mock data, needs implementation)
- `GET /api/tm/stats/:sourceLang/:targetLang` - Translation memory statistics (currently using mock data, needs implementation)

### Pages

- **Home**: Project overview with real translation status
- **Untranslated**: Browse untranslated content by language pair
- **Translation Memory**: View translation memory statistics
- **404**: Error handling for unknown routes

## Development

### Prerequisites

1. Build the UI first:
```bash
cd server
npm install
npm run build
```

2. Run from a L10n Monster project:
```bash
cd your-project/l10nmonster
npx l10n serve --ui
```

### Development Mode

For UI development with hot reload:

```bash
cd server
npm run dev  # Runs Vite dev server on port 5173
```

Note: In development mode, the Vite dev server proxies API calls to `http://localhost:9691`, so you need the L10n Monster server running.

### Build for Production

```bash
cd server
npm run build
```

### Run Tests

```bash
# Frontend tests
npm run test

# Server tests  
npm run test:server

# Test coverage
npm run test:coverage
```

## Configuration

The server supports:
- **Custom Port**: Specify listening port with `--port` option (default: 9691)
- **UI Toggle**: Enable/disable web interface with `--ui` flag
- **CORS**: Cross-Origin Resource Sharing enabled for API access
- **Static Serving**: Production-ready static file serving from `ui/dist`

## Architecture

### Backend (index.js)
- Implemented as a L10n Monster action class
- Receives MonsterManager instance (`mm`) with access to project data
- Express.js server with API routes
- Serves static UI files when `--ui` flag is used

### Frontend (ui/)
- **React 19**: Modern frontend framework
- **Chakra UI 3.0**: High-performance component library
- **TypeScript**: Type safety throughout
- **Vite**: Build tool and development server
- **Client-Side Routing**: Single-page application with React Router

## Dependencies

### Backend
- `express`: Web application framework
- `cors`: Cross-Origin Resource Sharing
- `open`: Automatic browser launching

### Frontend
- `react` & `react-dom`: Core React libraries (v19)
- `@chakra-ui/react`: Chakra UI 3.0 components
- `lucide-react`: Modern icon library
- `react-router-dom`: Client-side routing
- `typescript`: Type-safe development

### Development
- `vite`: Build tool and development server
- `@vitejs/plugin-react`: React integration for Vite
- `vitest`: Testing framework
- `@testing-library/*`: React testing utilities
- `eslint` & `prettier`: Code quality tools