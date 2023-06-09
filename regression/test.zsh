#!/usr/bin/zsh

setopt ERR_EXIT
setopt MONITOR

regressTestFromCLI() {
    echo "\nTesting $1..."
    cd $1
    npm i --no-package-lock
    time ../../../cli/out/l10n.cjs --regression push --provider grandfather,repetition,default
    time ../../../cli/out/l10n.cjs --regression pull
    time ../../../cli/out/l10n.cjs --regression translate
    time ../../../cli/out/l10n.cjs --regression status --output status.json
    time ../../../cli/out/l10n.cjs --regression tmexport tm job
    cd ..
}

regressTestFromScript() {
    echo "\nTesting $1..."
    cd $1
    npm i --no-package-lock
    time node ../../regressionScript.cjs
    cd ..
}

rm -rf wd
# rm **/.DS_Store
mkdir wd
cp -pr mint/* wd
# cp -pr mint/tachiyomi-j2k wd
cd wd
for dir in *
do
    if [ "$#" -ne 1 ]; then
        regressTestFromScript $dir
    else
        regressTestFromCLI $dir
    fi
done
cd ..
wait
echo "\nDiffing working dir vs. expected..."
rm -rf wd/*/.l10nmonster
rm -rf wd/*/node_modules
rm wd/*/package.json
rm wd/*/l10nmonster.cjs
find wd -name '.DS_Store' -type f -delete
find expected -name '.DS_Store' -type f -delete
diff -qr wd expected
