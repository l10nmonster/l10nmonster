#!/bin/zsh

npx l10n --regression -v2 tm syncdown legacy
npx l10n --regression -v2 push --provider grandfather,repetition,default
npx l10n --regression -v2 pull
npx l10n --regression -v2 translate all
npx l10n --regression -v2 status --output status.json
npx l10n --regression -v2 tmexport
npx l10n --regression -v2 tm syncup default
