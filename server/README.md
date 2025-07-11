# @l10nmonster/server

L10n Monster Manager UI - Web-based interface for managing localization projects and translation workflows.

## Installation

```bash
npm install @l10nmonster/server
```

## Usage

Start the server with API only:

```bash
l10n serve --port 9691
```

Start the server with web UI:

```bash
l10n serve --port 9691 --ui
```

## Features

### Web UI

Modern React-based interface built with:
- **Material-UI**: Professional design system
- **React Router**: Client-side routing
- **Vite**: Fast development and build tooling
- **Responsive Design**: Works on desktop and mobile

### API Endpoints

- `GET /api/status` - Translation status and project overview
- `GET /api/untranslated/:sourceLang/:targetLang` - Untranslated content for language pairs
- `GET /api/tm/stats/:sourceLang/:targetLang` - Translation memory statistics

### Pages

- **Home**: Project overview and status dashboard
- **Untranslated**: Browse untranslated content by language pair
- **Translation Memory**: View and manage translation memory statistics
- **404**: Error handling for unknown routes

## Development

### Start Development Server

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Configuration

The server supports:
- **Custom Port**: Specify listening port with `--port` option
- **UI Toggle**: Enable/disable web interface with `--ui` flag
- **CORS**: Cross-Origin Resource Sharing enabled for API access
- **Static Serving**: Production-ready static file serving

## Architecture

- **Express.js**: Backend API server
- **React 19**: Modern frontend framework
- **Material-UI v7**: Component library and theming
- **Client-Side Routing**: Single-page application with React Router
- **Mock Data**: Development-friendly mock data system

## Dependencies

### Backend
- `express`: Web application framework
- `cors`: Cross-Origin Resource Sharing
- `open`: Automatic browser launching

### Frontend
- `react` & `react-dom`: Core React libraries
- `@mui/material` & `@mui/icons-material`: Material Design components
- `@emotion/react` & `@emotion/styled`: CSS-in-JS styling
- `react-router-dom`: Client-side routing

### Development
- `vite`: Build tool and development server
- `@vitejs/plugin-react`: React integration for Vite
- `vitest`: Testing framework
- `@testing-library/*`: React testing utilities