# Development notes

To develop:

* Keep `npm run esbuild-watch` running in a terminal
* Every save should automatically trigger a build and report errors
* To debug just use Run / Start Debugging as usual

To prepare a release package:

* Bump version in package.json
* Run `npm run package`
* There should be a new `.vsix` package, delete the old version
* Use `code --install-extension l10nmanager-0.0.1.vsix` to install

## Attribution

* Icon made from [Icon Fonts](http://www.onlinewebfonts.com/icon) is licensed by CC BY 3.0
