set -e

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
    # regressTestFromCLI $dir
    regressTestFromScript $dir
done
cd ..

echo "\nDiffing working dir vs. expected..."
rm -rf wd/*/.l10nmonster
diff -qr wd expected
