# SteamHider

Simple plugin, which add more friendly "Hide" button on steam search page.

## How it works

1. Copy [steam.hide.js](steam.hide.js) into your console.
2. Use `SteamHider.start()` to run hider.
3. Use `SteamHider.stop()` to shut down hider.

Optionally you can dynamically change clean up settings via `SteamHider.settings.cleanUp.<propertyName>`,
supported properties:

* `maxToProcess` - maximum amount of items that will be proceeds on each clean up iteration. 
* `interval` - clean up interval in ms. 

## To do

Make a Chrome plugin to more convenient usage.