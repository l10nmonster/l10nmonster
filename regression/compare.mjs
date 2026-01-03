#!/usr/bin/env node
/**
 * Order-independent file comparison tool for regression tests.
 * Compares directories semantically rather than byte-for-byte.
 *
 * Usage: node compare.mjs <actual-dir> <expected-dir>
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, extname, relative, basename, dirname } from 'node:path';

// Job GUID pattern: xxx followed by digits followed by xxx
const JOB_GUID_PATTERN = /xxx\d+xxx/g;

// Directories that are storage-implementation-specific and should be skipped
// when they exist only in expected (pgsql stores data in DB, not files)
const STORAGE_SPECIFIC_DIRS = new Set([
    'tmStore',
    'translationJobs',
    'job',      // FsJsonlTmStore partitioning=job
    'language', // FsJsonlTmStore partitioning=language
    'provider', // FsJsonlTmStore partitioning=provider
]);

// Normalize job GUIDs in text (replace xxx0xxx, xxx1xxx etc with xxxNxxx)
function normalizeJobGuids(text) {
    return text.replace(JOB_GUID_PATTERN, 'xxxNxxx');
}

// Extract language code from xliff filename (e.g., "prjxxx5xxx-zh-Hant.xml" -> "zh-Hant")
function extractLangFromXliffName(filename) {
    const match = filename.match(/xxx\d+xxx-(.+)\.xml$/);
    return match ? match[1] : null;
}

/**
 * Create a sortable string for array element comparison.
 */
function sortKey(item) {
    if (item === null) return 'null';
    if (typeof item !== 'object') return JSON.stringify(item);
    if (Array.isArray(item)) {
        return '[' + item.map(sortKey).join(',') + ']';
    }
    const keys = Object.keys(item).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + sortKey(item[k])).join(',') + '}';
}

/**
 * Deep equality for objects (ignoring key order).
 * Arrays are compared as sets (order-independent).
 * Handles nested stringified JSON fields.
 */
function deepEqual(a, b) {
    if (a === b) return true;
    if (a === null || b === null) return a === b;
    if (typeof a !== typeof b) return false;

    if (typeof a === 'object') {
        if (Array.isArray(a) !== Array.isArray(b)) return false;

        if (Array.isArray(a)) {
            if (a.length !== b.length) return false;
            // Sort arrays by canonical key for order-independent comparison
            const sortedA = [...a].sort((x, y) => sortKey(x).localeCompare(sortKey(y)));
            const sortedB = [...b].sort((x, y) => sortKey(x).localeCompare(sortKey(y)));
            for (let i = 0; i < sortedA.length; i++) {
                if (!deepEqual(sortedA[i], sortedB[i])) return false;
            }
            return true;
        }

        const keysA = Object.keys(a).sort();
        const keysB = Object.keys(b).sort();
        if (keysA.length !== keysB.length) return false;
        if (!keysA.every((k, i) => k === keysB[i])) return false;

        for (const key of keysA) {
            if (!deepEqual(a[key], b[key])) return false;
        }
        return true;
    }

    return false;
}

/**
 * Try to parse a string as JSON. Returns the parsed object or the original string.
 */
function tryParseJson(value) {
    if (typeof value !== 'string') return value;
    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
}

/**
 * Recursively expand stringified JSON fields in an object.
 * Fields like tuProps, jobProps, nsrc, ntgt, notes contain stringified JSON.
 */
function expandNestedJson(obj) {
    if (obj === null || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
        return obj.map(expandNestedJson);
    }

    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            // Try to parse stringified JSON fields
            const parsed = tryParseJson(value);
            result[key] = typeof parsed === 'object' ? expandNestedJson(parsed) : parsed;
        } else if (typeof value === 'object') {
            result[key] = expandNestedJson(value);
        } else {
            result[key] = value;
        }
    }
    return result;
}

/**
 * Create a canonical string representation for set comparison.
 * Sorts object keys recursively.
 */
function canonicalize(obj) {
    if (obj === null) return 'null';
    if (typeof obj !== 'object') return JSON.stringify(obj);

    if (Array.isArray(obj)) {
        return '[' + obj.map(canonicalize).join(',') + ']';
    }

    const keys = Object.keys(obj).sort();
    const pairs = keys.map(k => JSON.stringify(k) + ':' + canonicalize(obj[k]));
    return '{' + pairs.join(',') + '}';
}

/**
 * Compare two JSONL files as sets of objects (order-independent).
 */
async function compareJsonl(actualPath, expectedPath) {
    const [actualContent, expectedContent] = await Promise.all([
        readFile(actualPath, 'utf-8'),
        readFile(expectedPath, 'utf-8')
    ]);

    const parseLines = (content) => {
        return content.trim().split('\n')
            .filter(line => line.trim())
            .map(line => {
                const parsed = JSON.parse(line);
                return expandNestedJson(parsed);
            });
    };

    const actualObjects = parseLines(actualContent);
    const expectedObjects = parseLines(expectedContent);

    if (actualObjects.length !== expectedObjects.length) {
        return `Line count mismatch: actual=${actualObjects.length}, expected=${expectedObjects.length}`;
    }

    // Create canonical string sets for comparison
    const actualSet = new Set(actualObjects.map(canonicalize));
    const expectedSet = new Set(expectedObjects.map(canonicalize));

    // Find differences
    const onlyInActual = [...actualSet].filter(x => !expectedSet.has(x));
    const onlyInExpected = [...expectedSet].filter(x => !actualSet.has(x));

    if (onlyInActual.length > 0 || onlyInExpected.length > 0) {
        const messages = [];
        if (onlyInActual.length > 0) {
            messages.push(`${onlyInActual.length} extra object(s) in actual`);
        }
        if (onlyInExpected.length > 0) {
            messages.push(`${onlyInExpected.length} missing object(s) from expected`);
        }
        return messages.join('; ');
    }

    return null; // No differences
}

/**
 * Compare two JSON files with deep equality (ignoring key order).
 */
async function compareJson(actualPath, expectedPath) {
    const [actualContent, expectedContent] = await Promise.all([
        readFile(actualPath, 'utf-8'),
        readFile(expectedPath, 'utf-8')
    ]);

    const actualObj = expandNestedJson(JSON.parse(actualContent));
    const expectedObj = expandNestedJson(JSON.parse(expectedContent));

    if (!deepEqual(actualObj, expectedObj)) {
        return 'JSON content differs (ignoring key order)';
    }

    return null;
}

/**
 * Compare two text/binary files byte-for-byte.
 */
async function compareBytes(actualPath, expectedPath) {
    const [actualContent, expectedContent] = await Promise.all([
        readFile(actualPath),
        readFile(expectedPath)
    ]);

    if (!actualContent.equals(expectedContent)) {
        return 'File content differs';
    }

    return null;
}

/**
 * Compare XLIFF content with job GUID normalization.
 */
async function compareXliff(actualPath, expectedPath) {
    const [actualContent, expectedContent] = await Promise.all([
        readFile(actualPath, 'utf-8'),
        readFile(expectedPath, 'utf-8')
    ]);

    const normalizedActual = normalizeJobGuids(actualContent);
    const normalizedExpected = normalizeJobGuids(expectedContent);

    if (normalizedActual !== normalizedExpected) {
        return 'XLIFF content differs (after job GUID normalization)';
    }

    return null;
}

/**
 * Compare xliff directories with language-based matching.
 * Files are matched by language suffix, not by full filename.
 */
async function compareXliffDirectory(actualDir, expectedDir, relPath) {
    const diffs = [];

    let actualFiles, expectedFiles;
    try {
        actualFiles = await readdir(actualDir);
    } catch {
        actualFiles = [];
    }
    try {
        expectedFiles = await readdir(expectedDir);
    } catch {
        expectedFiles = [];
    }

    // Group files by language code
    const actualByLang = new Map();
    const expectedByLang = new Map();

    for (const file of actualFiles) {
        const lang = extractLangFromXliffName(file);
        if (lang) {
            actualByLang.set(lang, file);
        } else {
            // Non-xliff file, use exact name
            actualByLang.set(file, file);
        }
    }

    for (const file of expectedFiles) {
        const lang = extractLangFromXliffName(file);
        if (lang) {
            expectedByLang.set(lang, file);
        } else {
            expectedByLang.set(file, file);
        }
    }

    // Check for missing/extra languages
    const allLangs = new Set([...actualByLang.keys(), ...expectedByLang.keys()]);

    for (const lang of allLangs) {
        const actualFile = actualByLang.get(lang);
        const expectedFile = expectedByLang.get(lang);

        if (!actualFile) {
            diffs.push(`Files ${relPath}/*-${lang}.xml and ${relPath}/*-${lang}.xml differ`);
            continue;
        }
        if (!expectedFile) {
            diffs.push(`Files ${relPath}/*-${lang}.xml and ${relPath}/*-${lang}.xml differ`);
            continue;
        }

        // Compare the files
        const actualPath = join(actualDir, actualFile);
        const expectedPath = join(expectedDir, expectedFile);
        const diff = await compareXliff(actualPath, expectedPath);
        if (diff) {
            diffs.push(`Files ${relPath}/${actualFile} and ${relPath}/${expectedFile} differ`);
        }
    }

    return diffs;
}

/**
 * Compare a single file based on its extension.
 */
async function compareFile(actualPath, expectedPath, relPath) {
    const ext = extname(actualPath).toLowerCase();

    try {
        let diff;
        switch (ext) {
            case '.jsonl':
                diff = await compareJsonl(actualPath, expectedPath);
                break;
            case '.json':
                diff = await compareJson(actualPath, expectedPath);
                break;
            case '.xml':
                diff = await compareXliff(actualPath, expectedPath);
                break;
            default:
                diff = await compareBytes(actualPath, expectedPath);
        }

        if (diff) {
            return `Files ${relPath} and ${relPath} differ`;
        }
        return null;
    } catch (err) {
        return `Error comparing ${relPath}: ${err.message}`;
    }
}

/**
 * Check if a path exists.
 */
async function exists(path) {
    try {
        await stat(path);
        return true;
    } catch {
        return false;
    }
}

/**
 * Recursive directory comparison.
 */
async function compareDirectories(actualDir, expectedDir, baseActual = actualDir, baseExpected = expectedDir) {
    const diffs = [];
    const relPath = relative(baseActual, actualDir) || basename(actualDir);

    // Special handling for inbox/outbox directories
    if (actualDir.endsWith('/inbox') || actualDir.endsWith('/outbox')) {
        const xliffDiffs = await compareXliffDirectory(actualDir, expectedDir, relPath);
        return xliffDiffs;
    }

    // Get directory contents
    let actualEntries = [];
    let expectedEntries = [];

    try {
        actualEntries = await readdir(actualDir);
    } catch {
        // Directory doesn't exist in actual
    }

    try {
        expectedEntries = await readdir(expectedDir);
    } catch {
        // Directory doesn't exist in expected
    }

    // Combine and deduplicate entries
    const allEntries = new Set([...actualEntries, ...expectedEntries]);

    for (const entry of allEntries) {
        // Skip hidden files and common excludes
        if (entry.startsWith('.') || entry === 'node_modules') continue;

        const actualPath = join(actualDir, entry);
        const expectedPath = join(expectedDir, entry);
        const entryRelPath = join(relPath, entry);

        const actualExists = await exists(actualPath);
        const expectedExists = await exists(expectedPath);

        if (!actualExists && expectedExists) {
            // Skip storage-specific directories that exist only in expected
            // (pgsql stores data in DB instead of files)
            if (STORAGE_SPECIFIC_DIRS.has(entry)) {
                continue;
            }
            diffs.push(`Only in ${dirname(entryRelPath)}: ${entry}`);
            continue;
        }

        if (actualExists && !expectedExists) {
            diffs.push(`Only in ${dirname(entryRelPath)}: ${entry}`);
            continue;
        }

        const actualStat = await stat(actualPath);
        const expectedStat = await stat(expectedPath);

        if (actualStat.isDirectory() !== expectedStat.isDirectory()) {
            diffs.push(`Files ${entryRelPath} and ${entryRelPath} differ (type mismatch)`);
            continue;
        }

        if (actualStat.isDirectory()) {
            const subDiffs = await compareDirectories(actualPath, expectedPath, baseActual, baseExpected);
            diffs.push(...subDiffs);
        } else {
            const diff = await compareFile(actualPath, expectedPath, entryRelPath);
            if (diff) {
                diffs.push(diff);
            }
        }
    }

    return diffs;
}

// Main entry
const [,, actualDir, expectedDir] = process.argv;

if (!actualDir || !expectedDir) {
    console.error('Usage: node compare.mjs <actual-dir> <expected-dir>');
    process.exit(1);
}

try {
    const diffs = await compareDirectories(actualDir, expectedDir);
    if (diffs.length > 0) {
        console.error(diffs.join('\n'));
        process.exit(1);
    }
} catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
}
