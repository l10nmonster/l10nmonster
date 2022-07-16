#!/usr/bin/zsh

setopt ERR_EXIT
setopt MONITOR

regressTestFromCLI() {
    echo "\nTesting $1..."
    cd $1
    ../../../l10n.js --regression push --provider grandfather,repetition,default
    ../../../l10n.js --regression pull
    ../../../l10n.js --regression translate
    ../../../l10n.js --regression status --output status.json
    cd ..
}

regressTestFromScript() {
    echo "\nTesting $1..."
    cd $1
    node ../../regressionScript.js
    cd ..
}

rm -rf wd
# rm **/.DS_Store
mkdir wd
cp -pr mint/* wd
cd wd
for dir in *
do
    if [ "$#" -ne 1 ]; then
        regressTestFromScript $dir &
    else
        regressTestFromCLI $dir &
    fi
done
cd ..
wait
echo "\nDiffing working dir vs. expected..."
rm -rf wd/*/.l10nmonster
diff -qr wd expected
