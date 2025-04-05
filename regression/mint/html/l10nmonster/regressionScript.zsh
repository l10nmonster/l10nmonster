#!/bin/zsh

npx l10n --regression -v2 source untranslated --push
npx l10n --regression -v2 translate all
npx l10n --regression -v2 status --output status.json
npx l10n --regression -v2 tmexport
