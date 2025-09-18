import { describe, it } from 'node:test';
import assert from 'node:assert';
import { cliToZodSchema, validateArgs } from '../utils/schemaUtils.js';

describe('schemaUtils', () => {
    describe('cliToZodSchema', () => {
        it('should convert required arguments to required fields', () => {
            const help = {
                arguments: [
                    ['<sourceLang>', 'source language code'],
                    ['<targetLang>', 'target language code']
                ]
            };
            
            const schema = cliToZodSchema(help);
            const result = schema.parse({ sourceLang: 'en', targetLang: 'fr' });
            
            assert.strictEqual(result.sourceLang, 'en');
            assert.strictEqual(result.targetLang, 'fr');
        });

        it('should convert optional arguments to optional fields', () => {
            const help = {
                arguments: [
                    ['<sourceLang>', 'source language code'],
                    ['[mode]', 'translation mode', ['delta', 'all', 'dryrun']]
                ]
            };
            
            const schema = cliToZodSchema(help);
            
            // Should work without mode
            const result1 = schema.parse({ sourceLang: 'en' });
            assert.strictEqual(result1.sourceLang, 'en');
            assert.strictEqual(result1.mode, undefined);
            
            // Should work with mode
            const result2 = schema.parse({ sourceLang: 'en', mode: 'delta' });
            assert.strictEqual(result2.sourceLang, 'en');
            assert.strictEqual(result2.mode, 'delta');
        });

        it('should convert options to optional fields', () => {
            const help = {
                options: [
                    ['--query <text>', 'search query text'],
                    ['--limit <number>', 'maximum number of results'],
                    ['--detailed', 'show more details']
                ]
            };
            
            const schema = cliToZodSchema(help);
            
            // Should work with no options
            const result1 = schema.parse({});
            assert.strictEqual(Object.keys(result1).length, 0);
            
            // Should work with all options
            const result2 = schema.parse({ 
                query: 'hello', 
                limit: 20, 
                detailed: true 
            });
            assert.strictEqual(result2.query, 'hello');
            assert.strictEqual(result2.limit, 20);
            assert.strictEqual(result2.detailed, true);
        });

        it('should handle enum choices for arguments', () => {
            const help = {
                arguments: [
                    ['[mode]', 'translation mode', ['delta', 'all', 'dryrun']]
                ]
            };
            
            const schema = cliToZodSchema(help);
            
            // Valid enum value should work
            const result = schema.parse({ mode: 'delta' });
            assert.strictEqual(result.mode, 'delta');
            
            // Invalid enum value should throw
            assert.throws(() => {
                schema.parse({ mode: 'invalid' });
            });
        });

        it('should handle complex sourceQuery help structure', () => {
            const help = {
                summary: 'query sources in the local cache.',
                description: 'query sources in the local cache.',
                arguments: [
                    ['[whereCondition]', 'where condition against sources']
                ],
                requiredOptions: [
                    ['--lang <srcLang,tgtLang>', 'source and target language pair']
                ],
                options: [
                    ['--provider <name,...>', 'use the specified providers'],
                    ['--push', 'push content to providers'],
                    ['--instructions <instructions>', 'job-specific instructions'],
                    ['--outFile <filename>', 'write output to the specified file'],
                    ['--print', 'print jobs to console']
                ]
            };
            
            const schema = cliToZodSchema(help);
            
            // Test with minimal required args
            const result1 = schema.parse({ 
                lang: 'en,fr'
            });
            assert.strictEqual(result1.lang, 'en,fr');
            
            // Test with all options
            const result2 = schema.parse({
                whereCondition: 'channel = "mobile"',
                lang: 'en,fr',
                provider: 'openai,anthropic',
                push: true,
                instructions: 'Translate carefully',
                outFile: 'jobs.json',
                print: true
            });
            
            assert.strictEqual(result2.whereCondition, 'channel = "mobile"');
            assert.strictEqual(result2.lang, 'en,fr');
            assert.strictEqual(result2.provider, 'openai,anthropic');
            assert.strictEqual(result2.push, true);
            assert.strictEqual(result2.instructions, 'Translate carefully');
            assert.strictEqual(result2.outFile, 'jobs.json');
            assert.strictEqual(result2.print, true);
        });

        it('should handle required options correctly', () => {
            const help = {
                requiredOptions: [
                    ['--lang <language>', 'required language parameter']
                ],
                options: [
                    ['--optional <value>', 'optional parameter']
                ]
            };
            
            const schema = cliToZodSchema(help);
            
            // Should work with required option
            const result1 = schema.parse({ lang: 'en' });
            assert.strictEqual(result1.lang, 'en');
            
            // Should work with both required and optional
            const result2 = schema.parse({ lang: 'en', optional: 'value' });
            assert.strictEqual(result2.lang, 'en');
            assert.strictEqual(result2.optional, 'value');
            
            // Should fail without required option
            assert.throws(() => {
                schema.parse({ optional: 'value' });
            });
        });
    });

    describe('validateArgs', () => {
        it('should validate arguments using generated schema', () => {
            const help = {
                arguments: [
                    ['<sourceLang>', 'source language code']
                ],
                options: [
                    ['--limit <number>', 'maximum number of results']
                ]
            };
            
            const validArgs = { sourceLang: 'en', limit: 20 };
            const result = validateArgs(help, validArgs);
            
            assert.strictEqual(result.sourceLang, 'en');
            assert.strictEqual(result.limit, 20);
        });

        it('should throw on validation errors', () => {
            const help = {
                arguments: [
                    ['<sourceLang>', 'source language code']
                ]
            };
            
            assert.throws(() => {
                validateArgs(help, {}); // missing required sourceLang
            });
        });
    });
});