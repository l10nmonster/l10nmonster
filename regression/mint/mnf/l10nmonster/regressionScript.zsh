#!/bin/zsh

npx l10n --regression -v2 tm syncdown legacy --commit
npx l10n --regression -v2 source untranslated --push --provider
npx l10n --regression -v2 translate all
npx l10n --regression -v2 source list --statusFile status.json
npx l10n --regression -v2 tm export tmexport
npx l10n --regression -v2 tm syncup default --commit
