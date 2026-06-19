/// <reference path="./settings.ts" />

interface ChromeStorageArea {
    get(keys?: string | string[] | Record<string, unknown> | null): Promise<Record<string, unknown>>;
}

interface ChromeStorageChange {
    newValue?: unknown;
}

interface ChromeRuntime {
    getURL(path: string): string;
}

interface ChromeApi {
    runtime: ChromeRuntime;
    storage: {
        local: ChromeStorageArea;
        onChanged: {
            addListener(
                callback: (changes: Record<string, ChromeStorageChange>, areaName: string) => void
            ): void;
        };
    };
}

declare const chrome: ChromeApi;

const writeSettingsNode = (settings: SteamHiderSettings): void => {
    let settingsNode = document.getElementById(STEAM_HIDER_SETTINGS_SCRIPT_ID) as HTMLScriptElement | null;

    if (!settingsNode) {
        settingsNode = document.createElement("script");
        settingsNode.id = STEAM_HIDER_SETTINGS_SCRIPT_ID;
        settingsNode.type = "application/json";
        document.documentElement.appendChild(settingsNode);
    }

    settingsNode.textContent = JSON.stringify(settings);
};

const loadStoredSettings = async (): Promise<SteamHiderSettings> => {
    const stored = await chrome.storage.local.get(STEAM_HIDER_SETTINGS_STORAGE_KEY);
    return mergeSteamHiderSettings(stored[STEAM_HIDER_SETTINGS_STORAGE_KEY]);
};

const injectSteamHider = (): void => {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("steam.hide.js");
    script.onload = () => script.remove();
    document.documentElement.appendChild(script);
};

const initSteamHiderContentScript = async (): Promise<void> => {
    writeSettingsNode(await loadStoredSettings());
    injectSteamHider();

    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== "local" || !changes[STEAM_HIDER_SETTINGS_STORAGE_KEY]) return;

        writeSettingsNode(mergeSteamHiderSettings(changes[STEAM_HIDER_SETTINGS_STORAGE_KEY].newValue));
        window.dispatchEvent(new Event(STEAM_HIDER_SETTINGS_UPDATED_EVENT));
    });
};

initSteamHiderContentScript().catch(err => console.error("Steam Hider failed to initialize", err));
