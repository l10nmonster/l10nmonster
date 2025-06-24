# Test Suite for LQA Boss Helper

This directory contains unit tests for the LQA Boss helper module.

## Test Files

### index.test.js
Tests for the main action interface and functionality:
- Help structure validation
- Action method interface
- Filename sanitization
- Error handling

### capture.test.js
Tests for the capture functionality:
- **fe00 encoding/decoding**: Tests the custom encoding/decoding mechanism used for metadata
  - Correct encoding/decoding of JSON objects
  - Empty string handling
  - Error cases (odd-length input, invalid char codes)
  
- **Regex pattern matching**: Tests the regex used to extract encoded metadata from text
  - Single match extraction
  - Multiple matches in the same text
  
- **Captured page data structure**: Validates the structure of captured page data
  - ID format validation
  - URL and timestamp validation
  - Screenshot buffer and text content structure
  
- **Browser context function extraction**: Tests ability to extract browser-context code
  
- **Error handling scenarios**: Tests various error conditions
  - Decoding errors in metadata
  - Timeout error format
  
- **runCapture function interface**: Tests the main capture function interface
  - Async function validation
  - Parameter validation
  
- **Integration tests**: Skipped by default, can be run with actual puppeteer
  - Real web page capture

## Running Tests

```bash
npm test
```

The tests use Node.js's built-in test runner (`node --test`) and require no additional testing frameworks.

## Notes

- The regex patterns have been simplified to avoid Node.js compatibility issues with negative lookbehind assertions
- Integration tests are skipped by default to avoid external dependencies
- Some tests validate error handling behavior which may produce expected error output during test runs 