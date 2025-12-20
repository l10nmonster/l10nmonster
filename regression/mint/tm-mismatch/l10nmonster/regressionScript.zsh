#!/bin/zsh

# Step 1: Sync down from storeA - jobs get assigned tmStore=storeA
npx l10n --regression -v2 tm syncdown storeA --commit

# Step 2: Sync down from storeB - jobs already exist with tmStore=storeA, won't overwrite
npx l10n --regression -v2 tm syncdown storeB --commit

# Step 3: Export status before syncup
npx l10n --regression -v2 source list --statusFile status-before.json

# Step 4: Sync up to storeB with delete - mismatched jobs should be removed
npx l10n --regression -v2 tm syncup storeB --commit --delete

# Step 5: Export final status
npx l10n --regression -v2 source list --statusFile status.json
