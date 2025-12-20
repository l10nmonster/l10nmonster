#!/bin/zsh

# Step 1: Create translations and sync up to storeA
npx l10n --regression -v2 source untranslated --push --provider
npx l10n --regression -v2 translate all
npx l10n --regression -v2 tm syncup storeA --commit
npx l10n --regression -v2 source list --statusFile status-before.json

# Step 2: Reassign job to storeB using sqlite3 CLI
JOB_GUID=$(sqlite3 l10nmonsterTM.db "SELECT jobGuid FROM jobs LIMIT 1")
echo "Reassigning job $JOB_GUID from storeA to storeB"
sqlite3 l10nmonsterTM.db "UPDATE jobs SET tmStore = 'storeB' WHERE jobGuid = '$JOB_GUID'"

# Step 3: Sync up to storeA with delete - mismatched job should be removed
npx l10n --regression -v2 tm syncup storeA --commit --delete

# Step 4: Export final status
npx l10n --regression -v2 source list --statusFile status.json
npx l10n --regression -v2 translate all
