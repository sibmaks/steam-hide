# SteamHider

Simple plugin, which adds more friendly "Hide" controls on the Steam search page.

## Chrome/Vivaldi extension

1. Run `npm run build` on Windows, or `npm run build:linux` on Linux.
2. Open `chrome://extensions` or `vivaldi://extensions`.
3. Enable developer mode.
4. Load unpacked extension from `dist/steam-hider`, or use `dist/steam-hider-chrome-vivaldi.zip`.
5. Open `https://store.steampowered.com/search`.

The extension starts automatically on the Steam search page.

## Console usage

1. Copy [steam.hide.js](steam.hide.js) into your console.
2. Use `SteamHider.start()` to run hider.
3. Use `SteamHider.stop()` to shut down hider.

Optionally you can dynamically change clean up settings via `SteamHider.settings.cleanUp.<propertyName>`,
supported properties:

* `maxToProcess` - maximum amount of items that will be proceeds on each clean up iteration. 
* `interval` - clean up interval in ms. 

