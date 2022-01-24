set -e

regressTest() {
    echo "\nTesting $1..."
    cd $1
    ../../../l10n.js grandfather -q 70
    ../../../l10n.js leverage -q 69 -u 61
    ../../../l10n.js push
    ../../../l10n.js pull
    ../../../l10n.js translate
    ../../../l10n.js status -b foo -r bar
    cd ..
}

rm -rf wd
mkdir wd
cp -pr mint/* wd
cd wd
for dir in *; regressTest $dir
cd ..

echo "\nDiffing working dir vs. expected..."
rm -rf wd/*/.l10nmonster
diff -qr wd expected
