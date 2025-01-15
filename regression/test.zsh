#!/bin/zsh

if [ "$#" -ne 3 ]; then
    echo "Usage: $0 <cli|js> <local|npm> <all|regression_case>"
    exit 1
fi

script_type=$1
monster_location=$2
cases=$3

run_regression() {
    script_type=$1
    monster_location=$2
    case=$3
    echo "\nTesting $case..."
    cd ../wd
    cp -pr ../mint/$case .
    cd $case/l10nmonster
    if [[ $monster_location == "npm" ]]; then
        cp ../../../package-npm.json ./package.json
    else
        cp ../../../package-local.json ./package.json
    fi
    echo "Installing npm dependencies..."
    npm i --no-package-lock
    npm ls
    if [[ $script_type == "cli" ]]; then
        time zsh regressionScript.zsh
    else
        time node regressionScript.mjs
    fi

    echo "\nDiffing working dir vs. expected..."
    rm -rf node_modules
    rm l10nmonster* package.json regressionScript.*
    cd ../..
    find $case -name '.DS_Store' -type f -delete
    diff -qr $case ../expected/$case
}

setopt ERR_EXIT
find expected -name '.DS_Store' -type f -delete
rm -rf wd
mkdir wd

cd mint
if [[ $cases == "all" ]]; then
    for case in *; do
        run_regression $script_type $monster_location $case
    done
else
    run_regression $script_type $monster_location $cases
fi

echo "Regression test completed successfully (error code $?)"
