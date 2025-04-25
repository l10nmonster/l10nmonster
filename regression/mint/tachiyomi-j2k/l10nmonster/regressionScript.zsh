#!/bin/zsh

npx l10n --regression -v2 source untranslated --push --provider Grandfather
npx l10n --regression -v2 source untranslated --push --provider Repetition
npx l10n --regression -v2 source untranslated --push --provider PigLatinizer,XliffBridge
npx l10n --regression -v2 ops update
npx l10n --regression -v2 translate all
npx l10n --regression -v2 source list --statusFile status.json
npx l10n --regression -v2 tmexport
