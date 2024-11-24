#!/usr/bin/zsh

if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <cli|js> <local|npm>"
    exit 1
fi

setopt ERR_EXIT
#setopt MONITOR

rm -rf wd
# rm **/.DS_Store
mkdir wd
cp -pr mint/* wd
# cp -pr mint/gramps wd
cp regressionScript.cjs wd


if [[ "$2" == "npm" ]]; then
    cp package-npm.json wd/package.json
else
    cp package-local.json wd/package.json
fi

cd wd
echo "Installing npm dependencies..."
npm i --no-package-lock
npm ls

for dir in *
do
    if [[ "$dir" != "node_modules" &&  "$dir" != "package.json" &&  "$dir" != "regressionScript.cjs" ]]; then
        echo "\nTesting $dir..."
        cd $dir
        if [[ "$1" == "cli" ]]; then
            time ../node_modules/@l10nmonster/cli/l10n.cjs --regression -v2 push --provider grandfather,repetition,default
            time ../node_modules/@l10nmonster/cli/l10n.cjs --regression -v2 pull
            time ../node_modules/@l10nmonster/cli/l10n.cjs --regression -v2 translate all
            time ../node_modules/@l10nmonster/cli/l10n.cjs --regression -v2 status --output status.json
            time ../node_modules/@l10nmonster/cli/l10n.cjs --regression -v2 tmexport
        else
            time node ../regressionScript.cjs
        fi
        cd ..
    fi
done
cd ..
wait
echo "\nDiffing working dir vs. expected..."
rm -rf wd/*/.l10nmonster
rm -rf wd/node_modules
rm wd/regressionScript.cjs
rm wd/package.json
rm wd/*/l10nmonster.cjs
find wd -name '.DS_Store' -type f -delete
find expected -name '.DS_Store' -type f -delete
diff -qr wd expected
