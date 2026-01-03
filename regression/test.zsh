#!/bin/zsh

if [ "$#" -lt 3 ] || [ "$#" -gt 4 ]; then
    echo "Usage: $0 <cli|js> <local|npm|kitchensink> <all|regression_case> [sqlite|pgsql]"
    exit 1
fi

script_type=$1
monster_location=$2
cases=$3
storage_type=${4:-sqlite}

# Find psql in common locations
find_psql() {
    if command -v psql &> /dev/null; then
        echo "psql"
    elif [[ -x "/opt/homebrew/bin/psql" ]]; then
        echo "/opt/homebrew/bin/psql"
    elif [[ -x "/usr/local/bin/psql" ]]; then
        echo "/usr/local/bin/psql"
    elif [[ -x "/Applications/Postgres.app/Contents/Versions/latest/bin/psql" ]]; then
        echo "/Applications/Postgres.app/Contents/Versions/latest/bin/psql"
    else
        echo ""
    fi
}

PSQL_CMD=$(find_psql)

# Database setup/teardown functions for pgsql
setup_pgsql_db() {
    local db_name=$1
    if [[ -z "$PSQL_CMD" ]]; then
        echo "ERROR: psql not found. Please install PostgreSQL or add it to PATH."
        exit 1
    fi
    $PSQL_CMD -h localhost -c "DROP DATABASE IF EXISTS \"${db_name}\";" postgres 2>/dev/null
    $PSQL_CMD -h localhost -c "CREATE DATABASE \"${db_name}\";" postgres 2>/dev/null
}

teardown_pgsql_db() {
    local db_name=$1
    $PSQL_CMD -h localhost -c "DROP DATABASE IF EXISTS \"${db_name}\";" postgres 2>/dev/null
}

run_regression() {
    script_type=$1
    monster_location=$2
    case=$3
    storage_type=$4
    local start_ms=$(($(date +%s%N)/1000000))
    local db_name="l10n_regression_${case}"

    echo -n "Testing $case"
    if [[ $storage_type == "pgsql" ]]; then
        echo -n " (pgsql)... "
        setup_pgsql_db $db_name
        export PGSQL_DB_NAME=$db_name
    else
        echo -n "... "
    fi

    cd ../wd
    cp -pr ../mint/$case .
    cd $case/l10nmonster

    # Select package.json based on location and storage type
    if [[ $monster_location == "npm" ]]; then
        cp ../../../package-npm.json ./package.json
    elif [[ $monster_location == "kitchensink" ]]; then
        cp ../../../package-kitchensink.json ./package.json
        if [[ -f "l10nmonster.config.kitchensink.mjs" ]]; then
            cp l10nmonster.config.kitchensink.mjs l10nmonster.config.mjs
        fi
    else
        # For local, use pgsql package if pgsql mode is enabled
        if [[ $storage_type == "pgsql" ]]; then
            cp ../../../package-pgsql.json ./package.json
        else
            cp ../../../package-local.json ./package.json
        fi
    fi

    # Use pgsql config if it exists and pgsql mode is enabled
    if [[ $storage_type == "pgsql" && -f "l10nmonster.config.pgsql.mjs" ]]; then
        cp l10nmonster.config.pgsql.mjs l10nmonster.config.mjs
    fi

    # Install deps, suppress stdout
    npm i --no-package-lock > /dev/null 2>&1
    # Run regression script, suppress stdout
    if [[ $script_type == "cli" ]]; then
        zsh regressionScript.zsh > /dev/null
    else
        node regressionScript.mjs > /dev/null
    fi

    # Diff working dir vs. expected
    rm -rf node_modules
    rm l10nmonster* package.json regressionScript.*
    cd ../..
    find $case -name '.DS_Store' -type f -delete
    find $case -name '.gitkeep' -type f -delete
    node ../compare.mjs $case ../expected/$case
    local end_ms=$(($(date +%s%N)/1000000))
    local elapsed=$((end_ms - start_ms))
    echo "ok (${elapsed}ms)"

    # Teardown pgsql database after test
    if [[ $storage_type == "pgsql" ]]; then
        teardown_pgsql_db $db_name
        unset PGSQL_DB_NAME
    fi
}

# Enable error exit - exit immediately if any command fails
setopt ERR_EXIT 2>/dev/null || set -e
find expected -name '.DS_Store' -type f -delete
rm -rf wd
mkdir wd

# Track total time
SECONDS=0

echo "=== Running $script_type $monster_location $storage_type tests ==="
cd mint
if [[ $cases == "all" ]]; then
    for case in *; do
        run_regression $script_type $monster_location $case $storage_type
    done
else
    run_regression $script_type $monster_location $cases $storage_type
fi

echo "\nCompleted in ${SECONDS}s"
