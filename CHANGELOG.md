## [0.8.1](https://github.com/ubud-app/server/compare/v0.8.0...v0.8.1) (2024-09-09)


### Bug Fixes

* Fix CSV Import ([79b4596](https://github.com/ubud-app/server/commit/79b45963fd812179934ef6a35bef3a88239ecc65))
* Fix Umzug glob attribute ([5adf529](https://github.com/ubud-app/server/commit/5adf52947b25ee819b3361ba0c1680dcb28ba31a))
* Fix umzug import ([3199bf1](https://github.com/ubud-app/server/commit/3199bf1c572ccdc99f536f936d665a07e3844b30))
* Fix Umzug usage ([356e8ad](https://github.com/ubud-app/server/commit/356e8ada665977a179468df22b31a3bd92cef5ca))
* Use import() for node-fetch ([54a68aa](https://github.com/ubud-app/server/commit/54a68aab9fbfc48e1e9b0127e2c2523daf1a1bb8))

# [0.8.0](https://github.com/ubud-app/server/compare/v0.7.1...v0.8.0) (2023-07-11)


### Features

* Update Sentry DSN ([8ce1f9b](https://github.com/ubud-app/server/commit/8ce1f9b6cc700b5f461cd5d72ab70ae2205f89e0))

## [0.7.1](https://github.com/ubud-app/server/compare/v0.7.0...v0.7.1) (2023-02-08)


### Bug Fixes

* **Repository:** Ignore npm/node.js version errors ([9cc9780](https://github.com/ubud-app/server/commit/9cc97808be1cf1aae1cacb9669b3d6759f0aba6f))

# [0.7.0](https://github.com/ubud-app/server/compare/v0.6.1...v0.7.0) (2022-01-22)


### Bug Fixes

* **build:** Bump node-fetch to 2.6.7 ([91e7c95](https://github.com/ubud-app/server/commit/91e7c95f8fd50eef291967947138c8d5f6ffa238))


### Features

* **Transaction:** Add fallback for "stupid german banks" 🤪 ([cbb3ce1](https://github.com/ubud-app/server/commit/cbb3ce178bdfe511686c0403e1bc9dd10002c202))

## [0.6.1](https://github.com/ubud-app/server/compare/v0.6.0...v0.6.1) (2021-07-31)


### Bug Fixes

* **TransactionLogic:** Don't remove lost transaction for single items ([d32d6ec](https://github.com/ubud-app/server/commit/d32d6ecc425adbb55fdcff1b267f4482e73f1337))
* **TransactionLogic:** Fix auto-budget ([66d0f9b](https://github.com/ubud-app/server/commit/66d0f9bbca6336adfb799dc238ecd5e7f7b2dd2b))
* **CSVImporter:** Fix importing wrong date format ([f0a93b1](https://github.com/ubud-app/server/commit/f0a93b12a067f1f269a7de5445005783c33d1df9))
* **CSVImporter:** Fix importing wrong date format ([933ac78](https://github.com/ubud-app/server/commit/933ac78a963d0e55ca9c30765fb25ee10ff07493))
* **CSV Import:** Handle column "Wertstellung" with DD.MM.YYYY values ([f72853b](https://github.com/ubud-app/server/commit/f72853b6c5af3d2a34f211fd4af86538514b998f))
* **Dockerfile:** replace apk from "nodejs-npm" to "npm" ([a5e4809](https://github.com/ubud-app/server/commit/a5e4809354edb8cec1aa37058897461962e5b64d))
* **Importer:** Trim long memos during import ([c919e93](https://github.com/ubud-app/server/commit/c919e93df367ca6f13803ceefd1999e6e12e02a2))

# [0.6.0](https://github.com/ubud-app/server/compare/v0.5.0...v0.6.0) (2021-04-25)


### Bug Fixes

* **CSV Import:** Fix year for DKB credit card imports ([57f8c91](https://github.com/ubud-app/server/commit/57f8c91193bea3f33f0185cc6c4c017dfe0d5445))


### Features

* **CSV Importer:** Add columns for DKB credit cards ([bad692d](https://github.com/ubud-app/server/commit/bad692db6b20385018fbd5d58f0b808b7724ec71))
* **CSV Importer:** Add support for dkb.de csv export ([e9a86d7](https://github.com/ubud-app/server/commit/e9a86d707f76171ecf626606382ff04bff65be0d))
* **Transactions:** Guess budget for new, synced transactions ([1bb5ee2](https://github.com/ubud-app/server/commit/1bb5ee26edc8f571c9edcb605a1cfdd45d5f34ef))

# [0.5.0](https://github.com/ubud-app/server/compare/v0.4.0...v0.5.0) (2021-04-13)


### Bug Fixes

* **Log:** Fix scope.addTag is not a function ([0e98323](https://github.com/ubud-app/server/commit/0e983238bc89b3c5e73285d0dfab33e6c3306a73))


### Features

* **PluginInstances:** add logging for plugin initialization for debugging purposes ([8dcce61](https://github.com/ubud-app/server/commit/8dcce61b23c3e799262b84458541b1d01e1553bb))
* **bin/server:** Do not allow to create first user with that tool ([25dda15](https://github.com/ubud-app/server/commit/25dda15a18956357659a035ccdde0ec5f54b7b84))

# [0.4.0](https://github.com/ubud-app/server/compare/v0.3.0...v0.4.0) (2020-12-09)


### Bug Fixes

* **Dockerfile:** Client version for next channel ([fd7c604](https://github.com/ubud-app/server/commit/fd7c604c79e0f3364f7de8da583ce5ca76054cea))
* **Transactions:** Correct transaction background sync ([25735e7](https://github.com/ubud-app/server/commit/25735e7c76e4f05ad8e6d926692b06e8013a60f7))
* **CI:** Fix CI cache issue ([592aedc](https://github.com/ubud-app/server/commit/592aedcbfcadf05862f587f5840e871756b9167f))
* **Dockerfile:** Fix client version ([6e77d04](https://github.com/ubud-app/server/commit/6e77d04cbcd0d543270c124207606659a792da68))
* **Dockerfile:** Fix client version ([4a6e968](https://github.com/ubud-app/server/commit/4a6e96814d5f22af7f7211e614f5acb55222d1b1))
* **Summaries:** Fix document balances ([45eab5e](https://github.com/ubud-app/server/commit/45eab5e7c29b633e39fa13eb5a7032fbfbe423f8))
* **Accounts:** Handle pluginInstanceId = "null" correctly ([bc9c3ef](https://github.com/ubud-app/server/commit/bc9c3ef3f480e359e86ed126dcb923c1c879e58c))
* **Server:** Serve client again ([de15d7d](https://github.com/ubud-app/server/commit/de15d7dc2e2bb4876652f9f0421cec78557472e0))


### Features

* **Docker:** Add labels (http://label-schema.org) ([423c544](https://github.com/ubud-app/server/commit/423c544c44611d3a3742c30371a7768e4af6b081))
* **Socket:** Use querystrings for collection filtering ([540f396](https://github.com/ubud-app/server/commit/540f39610a3b02227506815922dca7eca54edbc2))
