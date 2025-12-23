# Regression Tests

This suite of tests verifies that code changes don't introduce regressions. It tests the complete L10n Monster pipeline including source extraction, translation, and target generation.

## Running Tests

Run from the shell with `test.zsh` passing 3 parameters:

```bash
./test.zsh <mode> <location> <case>
```

### Parameters

1. **Mode** - How to run L10n Monster:
   - `cli` - Via the command line (`regressionScript.zsh`)
   - `js` - Via the JavaScript API (`regressionScript.mjs`)

2. **Location** - Which package source to use:
   - `local` - Local workspace packages (uses `package-local.json`)
   - `npm` - Published npm packages (uses `package-npm.json`)
   - `kitchensink` - Bundled all-in-one package (uses `package-kitchensink.json`)

3. **Case** - Which test case to run:
   - `all` - Run all test cases
   - `<name>` - Run a specific test (e.g., `android`, `react-icu`)

### Examples

```bash
# Run all tests with local packages via JavaScript API
./test.zsh js local all

# Run Android test with CLI
./test.zsh cli local android

# Test the bundled kitchensink package
./test.zsh js kitchensink all
./test.zsh cli kitchensink all
```

### Prerequisites

For local testing, install dependencies in each workspace:
```bash
# From the repository root
npm install
```

For npm testing, no local setup needed (downloads from registry).

For kitchensink testing, build the bundle first:
```bash
cd ../kitchensink && npm run build
```

## Test Cases

| Case | Format | Description |
|------|--------|-------------|
| android | Android XML | Android string resources with plurals |
| CardboardSDK | JSON (i18next) | React i18next with nested keys |
| EisenVault | iOS Strings | iOS .strings files |
| gramps | GNU gettext PO | Gettext portable object files |
| html | HTML | HTML content extraction |
| mnf | Custom | Multi-format normalized filter |
| react-icu | JSON (i18next) | ICU message format with interpolation |
| tachiyomi-j2k | Android XML | Android with Java MessageFormat |
| tm-mismatch | JSON | Translation memory mismatch detection |

## How Tests Work

1. **Setup**: The `mint` directory is copied to a `wd` (working directory)
2. **Execution**: Regression scripts run L10n Monster operations
3. **Verification**: The `wd` directory is compared against `expected`
4. **Pass criteria**: All files must match exactly

## Directory Structure

```
regression/
├── test.zsh                      # Main test runner
├── package-local.json            # Dependencies for local testing
├── package-npm.json              # Dependencies for npm testing
├── package-kitchensink.json      # Dependencies for kitchensink testing
├── mint/                         # Source files for each test
│   └── <case>/
│       ├── l10nmonster/
│       │   ├── l10nmonster.config.mjs           # Standard config
│       │   ├── l10nmonster.config.kitchensink.mjs  # Kitchensink config (optional)
│       │   ├── regressionScript.mjs             # JavaScript API test
│       │   └── regressionScript.zsh             # CLI test
│       └── <source files>
├── expected/                     # Expected output for each test
│   └── <case>/
└── wd/                          # Working directory (created during tests)
```

## Kitchensink Configuration

When running in kitchensink mode, the test script:
1. Copies `package-kitchensink.json` as `package.json`
2. If `l10nmonster.config.kitchensink.mjs` exists, copies it as `l10nmonster.config.mjs`

Kitchensink configs use unified imports from the bundled package:

```javascript
// Standard config (individual packages)
import { L10nMonsterConfig, adapters, providers } from '@l10nmonster/core';
import * as ios from '@l10nmonster/helpers-ios';
new ios.StringsFilter()

// Kitchensink config (bundled package)
import { L10nMonsterConfig, adapters, providers, filters } from 'l10nmonster';
new filters.StringsFilter()
```

## Adding a New Test Case

1. Create a new folder under `mint/` with your test name
2. Add source files and an `l10nmonster/` directory with:
   - `l10nmonster.config.mjs` - Configuration file
   - `regressionScript.mjs` - JavaScript API test script
   - `regressionScript.zsh` - CLI test script
3. Optionally add `l10nmonster.config.kitchensink.mjs` for kitchensink testing
4. Run the test to generate output in `wd/`
5. Copy the correct output to `expected/<case>/`
6. Add any new dependencies to the package JSON files
