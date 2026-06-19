interface SteamHiderSettings {
    injectedClassName: string;
    checkboxClassName: string;
    logEnabled: boolean;
    cleanUp: {
        classesToRemove: string[];
        maxToProcess: number;
        interval: number;
    };
    autoScroll: {
        interval: number;
    };
    hideSelected: {
        minDelay: number;
        maxDelay: number;
    };
}

const STEAM_HIDER_SETTINGS_STORAGE_KEY = "steamHiderSettings";
const STEAM_HIDER_SETTINGS_SCRIPT_ID = "steam-hider-settings";
const STEAM_HIDER_SETTINGS_UPDATED_EVENT = "steam-hider-settings-updated";

const STEAM_HIDER_DEFAULT_SETTINGS: SteamHiderSettings = {
    injectedClassName: "HIDE_BUTTON_INJECTED",
    checkboxClassName: "HIDE_CHECKBOX",
    logEnabled: false,
    cleanUp: {
        classesToRemove: [
            "ds_ignored",
            "ds_owned",
            "ds_wishlist"
        ],
        maxToProcess: 500,
        interval: 500
    },
    autoScroll: {
        interval: 500
    },
    hideSelected: {
        minDelay: 300,
        maxDelay: 1000
    }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const readString = (value: unknown, fallback: string): string =>
    typeof value === "string" && value.trim() ? value.trim() : fallback;

const readBoolean = (value: unknown, fallback: boolean): boolean =>
    typeof value === "boolean" ? value : fallback;

const readNumber = (value: unknown, fallback: number): number =>
    typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;

const readStringArray = (value: unknown, fallback: string[]): string[] =>
    Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        : fallback;

const mergeSteamHiderSettings = (value: unknown): SteamHiderSettings => {
    const source = isRecord(value) ? value : {};
    const cleanUp = isRecord(source.cleanUp) ? source.cleanUp : {};
    const autoScroll = isRecord(source.autoScroll) ? source.autoScroll : {};
    const hideSelected = isRecord(source.hideSelected) ? source.hideSelected : {};
    const minDelay = readNumber(hideSelected.minDelay, STEAM_HIDER_DEFAULT_SETTINGS.hideSelected.minDelay);
    const maxDelay = readNumber(hideSelected.maxDelay, STEAM_HIDER_DEFAULT_SETTINGS.hideSelected.maxDelay);

    return {
        injectedClassName: readString(source.injectedClassName, STEAM_HIDER_DEFAULT_SETTINGS.injectedClassName),
        checkboxClassName: readString(source.checkboxClassName, STEAM_HIDER_DEFAULT_SETTINGS.checkboxClassName),
        logEnabled: readBoolean(source.logEnabled, STEAM_HIDER_DEFAULT_SETTINGS.logEnabled),
        cleanUp: {
            classesToRemove: readStringArray(
                cleanUp.classesToRemove,
                STEAM_HIDER_DEFAULT_SETTINGS.cleanUp.classesToRemove
            ),
            maxToProcess: readNumber(cleanUp.maxToProcess, STEAM_HIDER_DEFAULT_SETTINGS.cleanUp.maxToProcess),
            interval: readNumber(cleanUp.interval, STEAM_HIDER_DEFAULT_SETTINGS.cleanUp.interval)
        },
        autoScroll: {
            interval: readNumber(autoScroll.interval, STEAM_HIDER_DEFAULT_SETTINGS.autoScroll.interval)
        },
        hideSelected: {
            minDelay,
            maxDelay: Math.max(maxDelay, minDelay)
        }
    };
};

const cloneSteamHiderDefaultSettings = (): SteamHiderSettings =>
    mergeSteamHiderSettings(STEAM_HIDER_DEFAULT_SETTINGS);

const readSteamHiderSettingsFromPage = (): SteamHiderSettings => {
    const settingsNode = document.getElementById(STEAM_HIDER_SETTINGS_SCRIPT_ID);

    if (!settingsNode?.textContent) {
        return cloneSteamHiderDefaultSettings();
    }

    try {
        return mergeSteamHiderSettings(JSON.parse(settingsNode.textContent));
    } catch (err) {
        console.error("Failed to parse Steam Hider settings", err);
        return cloneSteamHiderDefaultSettings();
    }
};
