#!/bin/zsh

if [ "$#" -ne 3 ]; then
    echo "Usage: $0 <cli|js> <local|npm> <all|regression_case>"
    exit 1
fi

setopt ERR_EXIT

find expected -name '.DS_Store' -type f -delete
rm -rf wd
mkdir -p wd/cases

if [[ "$3" == "all" ]]; then
    cp -pr mint/* wd/cases
else
    cp -pr mint/$3 wd/cases
fi

if [[ "$2" == "npm" ]]; then
    cp package-npm.json wd/package.json
else
    cp package-local.json wd/package.json
fi

cd wd
echo "Installing npm dependencies..."
npm i --no-package-lock
npm ls

cd cases
for dir in *
do
    echo "\nTesting $dir..."
    cd $dir
    if [[ "$1" == "cli" ]]; then
        time zsh regressionScript.zsh
    else
        time node regressionScript.cjs
    fi

    echo "\nDiffing working dir vs. expected..."
    rm -rf .l10nmonster
    rm regressionScript.cjs
    rm regressionScript.zsh
    rm l10nmonster.cjs
    cd ..
    find $dir -name '.DS_Store' -type f -delete
    diff -qr $dir ../../expected/$dir
done

echo "Regression test completed successfully (error code $?)"
