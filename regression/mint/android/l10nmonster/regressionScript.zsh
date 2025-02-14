#!/bin/zsh

npx l10n --regression -v2 tm syncdown default
npx l10n --regression -v2 push --provider grandfather,default
npx l10n --regression -v2 pull
npx l10n --regression -v2 translate all
npx l10n --regression -v2 status --output status.json
npx l10n --regression -v2 tmexport
