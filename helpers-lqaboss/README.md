# @l10nmonster/helpers-lqaboss

Helper module for L10n Monster that provides LQA Boss flow capture functionality.

## Features

- Captures web pages with screenshots and text metadata
- Creates `.lqaboss` files containing flow data
- Supports multi-page flows with interactive capture

## Usage

This module exports an action that can be used with L10n Monster:

```javascript
import { actions } from '@l10nmonster/helpers-lqaboss';

// Use the lqaboss action
await actions.lqaboss.action(mm, {
    url: 'https://example.com',
    flowName: 'my-flow'
});
```

## Testing

This module includes unit tests using Node.js built-in testing facilities.

### Running Tests

```bash
npm test
```

### Test Structure

The tests are located in `test/index.test.js` and cover:

- Help structure validation
- Action method interface verification  
- Filename sanitization logic
- Module exports validation

### Test Requirements

- Node.js 18+ (for built-in test runner)
- No additional test dependencies required

## Dependencies

- `puppeteer` - For browser automation and page capture
- `jszip` - For creating compressed flow files
- `@l10nmonster/core` - Core L10n Monster functionality
