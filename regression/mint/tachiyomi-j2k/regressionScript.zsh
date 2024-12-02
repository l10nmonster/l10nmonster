#!/bin/zsh

../../node_modules/@l10nmonster/cli/l10n.cjs --regression -v2 push --provider grandfather,repetition,default
../../node_modules/@l10nmonster/cli/l10n.cjs --regression -v2 pull
../../node_modules/@l10nmonster/cli/l10n.cjs --regression -v2 translate all
../../node_modules/@l10nmonster/cli/l10n.cjs --regression -v2 status --output status.json
../../node_modules/@l10nmonster/cli/l10n.cjs --regression -v2 tmexport
