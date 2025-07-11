# Enhanced Test Runner

The enhanced test runner (`test-runner.js`) provides better visualization and control over workspace testing compared to the default `npm test` command.

## Features

### 🎯 **Better Visualization**
- **Workspace listing**: Shows all workspaces with tests upfront
- **Progress indicators**: Clear [x/y] progress for each test
- **Color-coded results**: Green for pass, red for fail, with emojis
- **Individual timings**: Duration for each workspace test
- **Comprehensive summary**: Overall statistics and failed workspace list

### 🚨 **Failure Handling**
- **Fail-fast mode**: Stop on first failure (`--fail-fast`)
- **Detailed output**: Show test output when tests fail
- **Clear failure summary**: List all failed workspaces at the end

### ⚡ **Performance & Control**
- **Unit tests only**: Skip regression tests (`--unit-only`)
- **Verbose mode**: Show detailed test output (`--verbose`)
- **Skip regression**: Skip regression tests (`--skip-regression`)

## Usage

### Basic Commands

```bash
# Run all tests with enhanced visualization
npm run test:enhanced

# Run only unit tests (faster)
npm run test:enhanced:unit-only

# Stop on first failure
npm run test:enhanced:fail-fast

# Show detailed output
npm run test:enhanced:verbose
```

### Advanced Usage

```bash
# Combine flags (direct node command)
node scripts/test-runner.js --unit-only --fail-fast --verbose

# Get help
node scripts/test-runner.js --help
```

## Command Line Options

| Flag | Short | Description |
|------|-------|-------------|
| `--fail-fast` | `-f` | Stop on first test failure |
| `--verbose` | `-v` | Show detailed test output |
| `--unit-only` | | Run only unit tests (skip regression) |
| `--skip-regression` | | Skip regression tests |
| `--help` | `-h` | Show help message |

## Example Output

```
============================================================
L10n Monster Test Runner
============================================================
Options:
  • Fail fast: enabled
  • Verbose: disabled
  • Skip regression: disabled
  • Unit only: enabled

============================================================
Running Unit Tests
============================================================
Found 18 workspaces with tests:
  • @l10nmonster/core (core)
  • @l10nmonster/cli (cli)
  • ... (more workspaces)

[1/18] Testing @l10nmonster/core
----------------------------------------
✅ @l10nmonster/core PASSED (281ms)

[2/18] Testing @l10nmonster/cli
----------------------------------------
✅ @l10nmonster/cli PASSED (231ms)

============================================================
Test Summary
============================================================
📊 Unit Tests: 18/18 workspaces passed

✅ Passed workspaces:
   • @l10nmonster/core (281ms)
   • @l10nmonster/cli (231ms)
   • ... (more results)

🎯 Overall Result: SUCCESS
⏱️  Total Duration: 12023ms
```

## Comparison with Default `npm test`

| Feature | Default `npm test` | Enhanced Test Runner |
|---------|-------------------|---------------------|
| **Visualization** | Basic npm workspace output | Rich, color-coded progress display |
| **Failure handling** | Continues on failure | Optional fail-fast mode |
| **Progress tracking** | No clear progress | [x/y] workspace progress |
| **Summary** | No overall summary | Comprehensive success/failure summary |
| **Timing** | No individual timings | Duration for each workspace |
| **Failed workspace list** | Mixed in output | Clear failed workspace section |
| **Flexibility** | All-or-nothing | Unit-only, skip-regression options |

## When to Use Each

### Use **Enhanced Test Runner** when:
- ✅ You want better visualization and feedback
- ✅ You need to stop on first failure (fail-fast development)
- ✅ You want to run only unit tests (faster iteration)
- ✅ You need a clear summary of which workspaces failed
- ✅ You're debugging test issues and need better output

### Use **Default `npm test`** when:
- ✅ You want the traditional npm workspace behavior
- ✅ You're running in CI/CD where the enhanced output isn't needed
- ✅ You prefer the minimal output style

## Performance Tips

1. **Use `--unit-only` for development**: Skip regression tests for faster iteration
2. **Use `--fail-fast` for quick debugging**: Stop immediately when something breaks
3. **Use `--verbose` only when needed**: It can be noisy but helpful for debugging
4. **Check the summary**: Look at the final summary to see which workspaces need attention 