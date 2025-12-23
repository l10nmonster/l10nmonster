#!/bin/zsh

if [ "$#" -ne 3 ]; then
    echo "Usage: $0 <cli|js> <local|npm|kitchensink> <all|regression_case>"
    exit 1
fi

script_type=$1
monster_location=$2
cases=$3

run_regression() {
    script_type=$1
    monster_location=$2
    case=$3
    local start_ms=$(($(date +%s%N)/1000000))
    echo -n "Testing $case... "
    cd ../wd
    cp -pr ../mint/$case .
    cd $case/l10nmonster
    if [[ $monster_location == "npm" ]]; then
        cp ../../../package-npm.json ./package.json
    elif [[ $monster_location == "kitchensink" ]]; then
        cp ../../../package-kitchensink.json ./package.json
        # Use kitchensink config if it exists
        if [[ -f "l10nmonster.config.kitchensink.mjs" ]]; then
            cp l10nmonster.config.kitchensink.mjs l10nmonster.config.mjs
        fi
    else
        cp ../../../package-local.json ./package.json
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
    diff -qr $case ../expected/$case --exclude='.gitkeep'
    local end_ms=$(($(date +%s%N)/1000000))
    local elapsed=$((end_ms - start_ms))
    echo "ok (${elapsed}ms)"
}

# Enable error exit - exit immediately if any command fails
setopt ERR_EXIT 2>/dev/null || set -e
find expected -name '.DS_Store' -type f -delete
rm -rf wd
mkdir wd

# Track total time
SECONDS=0

echo "=== Running $script_type $monster_location tests ==="
cd mint
if [[ $cases == "all" ]]; then
    for case in *; do
        run_regression $script_type $monster_location $case
    done
else
    run_regression $script_type $monster_location $cases
fi

echo "\nCompleted in ${SECONDS}s"
