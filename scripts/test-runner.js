#!/usr/bin/env node

import { spawn } from 'child_process';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

// ANSI color codes
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m'
};

// Command line flags
const args = process.argv.slice(2);
const failFast = args.includes('--fail-fast') || args.includes('-f');
const verbose = args.includes('--verbose') || args.includes('-v');
const skipRegression = args.includes('--skip-regression');
const onlyUnit = args.includes('--unit-only');

class TestRunner {
    constructor() {
        this.results = [];
        this.startTime = Date.now();
    }

    log(message, color = colors.reset) {
        console.log(`${color}${message}${colors.reset}`);
    }

    logHeader(message) {
        const line = '='.repeat(60);
        this.log(`\n${line}`, colors.cyan);
        this.log(`${message}`, colors.cyan + colors.bright);
        this.log(`${line}`, colors.cyan);
    }

    logSubHeader(message) {
        this.log(`\n${colors.blue}${colors.bright}${message}${colors.reset}`);
        this.log(`${'-'.repeat(40)}`, colors.blue);
    }

    async getWorkspaces() {
        try {
            const rootPackageJson = JSON.parse(readFileSync('package.json', 'utf8'));
            const workspaces = rootPackageJson.workspaces || [];
            
            const allWorkspaces = [];
            
            for (const workspace of workspaces) {
                if (workspace.includes('*')) {
                    // Handle glob patterns like "helpers-*"
                    const baseDir = workspace.replace('*', '');
                    const dirs = readdirSync('.', { withFileTypes: true })
                        .filter(dirent => dirent.isDirectory())
                        .map(dirent => dirent.name)
                        .filter(name => name.startsWith(baseDir));
                    allWorkspaces.push(...dirs);
                } else {
                    allWorkspaces.push(workspace);
                }
            }
            
            return allWorkspaces;
        } catch (error) {
            this.log(`Error reading workspaces: ${error.message}`, colors.red);
            return [];
        }
    }

    async getWorkspacesWithTests() {
        const workspaces = await this.getWorkspaces();
        const workspacesWithTests = [];
        
        for (const workspace of workspaces) {
            try {
                const packageJsonPath = join(workspace, 'package.json');
                const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
                
                if (packageJson.scripts && packageJson.scripts.test) {
                    workspacesWithTests.push({
                        name: workspace,
                        displayName: packageJson.name || workspace,
                        testScript: packageJson.scripts.test
                    });
                }
            } catch (error) {
                // Workspace doesn't have package.json or test script
                if (verbose) {
                    this.log(`Skipping ${workspace}: ${error.message}`, colors.yellow);
                }
            }
        }
        
        return workspacesWithTests;
    }

    async runWorkspaceTest(workspace) {
        const startTime = Date.now();
        
        return new Promise((resolve) => {
            const child = spawn('npm', ['test'], {
                cwd: workspace.name,
                stdio: verbose ? 'inherit' : 'pipe'
            });
            
            let stdout = '';
            let stderr = '';
            
            if (!verbose) {
                child.stdout?.on('data', (data) => {
                    stdout += data.toString();
                });
                
                child.stderr?.on('data', (data) => {
                    stderr += data.toString();
                });
            }
            
            child.on('close', (code) => {
                const duration = Date.now() - startTime;
                const result = {
                    workspace: workspace.name,
                    displayName: workspace.displayName,
                    success: code === 0,
                    duration,
                    stdout,
                    stderr
                };
                
                resolve(result);
            });
        });
    }

    async runUnitTests() {
        this.logHeader('Running Unit Tests');
        
        const workspaces = await this.getWorkspacesWithTests();
        
        if (workspaces.length === 0) {
            this.log('No workspaces with test scripts found', colors.yellow);
            return true;
        }
        
        this.log(`Found ${workspaces.length} workspaces with tests:`, colors.white);
        workspaces.forEach(ws => {
            this.log(`  • ${ws.displayName} (${ws.name})`, colors.dim);
        });
        
        let allPassed = true;
        
        for (const [index, workspace] of workspaces.entries()) {
            this.logSubHeader(`[${index + 1}/${workspaces.length}] Testing ${workspace.displayName}`);
            
            const result = await this.runWorkspaceTest(workspace);
            this.results.push(result);
            
            if (result.success) {
                this.log(`✅ ${result.displayName} ${colors.green}PASSED${colors.reset} (${result.duration}ms)`, colors.green);
            } else {
                this.log(`❌ ${result.displayName} ${colors.red}FAILED${colors.reset} (${result.duration}ms)`, colors.red);
                allPassed = false;
                
                if (!verbose && (result.stdout || result.stderr)) {
                    this.log('\nTest output:', colors.yellow);
                    if (result.stdout) {
                        this.log(result.stdout, colors.dim);
                    }
                    if (result.stderr) {
                        this.log(result.stderr, colors.red);
                    }
                }
                
                if (failFast) {
                    this.log('\n🚨 Stopping on first failure (--fail-fast enabled)', colors.red + colors.bright);
                    break;
                }
            }
        }
        
        return allPassed;
    }

    async runRegressionTests() {
        if (skipRegression) {
            this.log('\n📋 Skipping regression tests (--skip-regression enabled)', colors.yellow);
            return true;
        }
        
        this.logHeader('Running Regression Tests');
        
        const startTime = Date.now();
        
        return new Promise((resolve) => {
            const child = spawn('npm', ['run', 'test:regression'], {
                stdio: verbose ? 'inherit' : 'pipe'
            });
            
            let stdout = '';
            let stderr = '';
            
            if (!verbose) {
                child.stdout?.on('data', (data) => {
                    stdout += data.toString();
                });
                
                child.stderr?.on('data', (data) => {
                    stderr += data.toString();
                });
            }
            
            child.on('close', (code) => {
                const duration = Date.now() - startTime;
                const success = code === 0;
                
                if (success) {
                    this.log(`✅ Regression tests ${colors.green}PASSED${colors.reset} (${duration}ms)`, colors.green);
                } else {
                    this.log(`❌ Regression tests ${colors.red}FAILED${colors.reset} (${duration}ms)`, colors.red);
                    
                    if (!verbose && (stdout || stderr)) {
                        this.log('\nRegression test output:', colors.yellow);
                        if (stdout) {
                            this.log(stdout, colors.dim);
                        }
                        if (stderr) {
                            this.log(stderr, colors.red);
                        }
                    }
                }
                
                resolve(success);
            });
        });
    }

    printSummary(unitTestsPassed, regressionTestsPassed) {
        const totalDuration = Date.now() - this.startTime;
        
        this.logHeader('Test Summary');
        
        // Unit tests summary
        const passed = this.results.filter(r => r.success).length;
        const failed = this.results.filter(r => r.success === false).length;
        const total = this.results.length;
        
        this.log(`📊 Unit Tests: ${passed}/${total} workspaces passed`, 
            passed === total ? colors.green : colors.red);
        
        if (failed > 0) {
            this.log(`\n❌ Failed workspaces:`, colors.red);
            this.results.filter(r => !r.success).forEach(r => {
                this.log(`   • ${r.displayName} (${r.workspace})`, colors.red);
            });
        }
        
        if (passed > 0) {
            this.log(`\n✅ Passed workspaces:`, colors.green);
            this.results.filter(r => r.success).forEach(r => {
                this.log(`   • ${r.displayName} (${r.duration}ms)`, colors.green);
            });
        }
        
        // Regression tests summary
        if (!skipRegression) {
            this.log(
                `\n📋 Regression Tests: ${
                    regressionTestsPassed ? 'PASSED' : 'FAILED'
                }`, 
                regressionTestsPassed ? colors.green : colors.red
            );
        }
        
        // Overall summary
        const overallSuccess = unitTestsPassed && regressionTestsPassed;
        this.log(
            `\n🎯 Overall Result: ${
                overallSuccess ? 'SUCCESS' : 'FAILURE'
            }`, 
            overallSuccess ? colors.green + colors.bright : colors.red + colors.bright
        );
        
        this.log(`⏱️  Total Duration: ${totalDuration}ms`, colors.cyan);
        
        if (!overallSuccess) {
            this.log(`\n💡 Tips:`, colors.yellow);
            this.log(`   • Use --fail-fast to stop on first failure`, colors.yellow);
            this.log(`   • Use --verbose for detailed output`, colors.yellow);
            this.log(`   • Use --unit-only to skip regression tests`, colors.yellow);
        }
    }

    async run() {
        this.logHeader('L10n Monster Test Runner');
        
        this.log(`Options:`, colors.white);
        this.log(`  • Fail fast: ${failFast ? 'enabled' : 'disabled'}`, colors.dim);
        this.log(`  • Verbose: ${verbose ? 'enabled' : 'disabled'}`, colors.dim);
        this.log(`  • Skip regression: ${skipRegression ? 'enabled' : 'disabled'}`, colors.dim);
        this.log(`  • Unit only: ${onlyUnit ? 'enabled' : 'disabled'}`, colors.dim);
        
        const unitTestsPassed = await this.runUnitTests();
        
        let regressionTestsPassed = true;
        if (!onlyUnit && (unitTestsPassed || !failFast)) {
            regressionTestsPassed = await this.runRegressionTests();
        }
        
        this.printSummary(unitTestsPassed, regressionTestsPassed);
        
        const overallSuccess = unitTestsPassed && regressionTestsPassed;
        process.exit(overallSuccess ? 0 : 1);
    }
}

// Usage information
if (args.includes('--help') || args.includes('-h')) {
    console.log(`
${colors.cyan}${colors.bright}L10n Monster Test Runner${colors.reset}

Usage: npm run test:enhanced [options]

Options:
  --fail-fast, -f      Stop on first test failure
  --verbose, -v        Show detailed test output
  --skip-regression    Skip regression tests
  --unit-only          Run only unit tests (skip regression)
  --help, -h           Show this help message

Examples:
  npm run test:enhanced                    # Run all tests
  npm run test:enhanced --fail-fast        # Stop on first failure
  npm run test:enhanced --verbose          # Show detailed output
  npm run test:enhanced --unit-only        # Unit tests only
`);
    process.exit(0);
}

// Run the test runner
const runner = new TestRunner();
runner.run().catch(error => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
}); 