#!/bin/zsh

# Step 1: Snap source content
npx l10n source snap

# Step 2: Export to snap store
npx l10n source export local

# Step 3: Delete source DB
rm -f l10nmonsterSource.db l10nmonsterSource.db-wal l10nmonsterSource.db-shm

# Step 4: Import from snap store
npx l10n source import local

# Step 5: List resources to verify
npx l10n source list --statusFile status.json

# Clean up snapshots directory (timestamps change every run)
rm -rf snapshots
