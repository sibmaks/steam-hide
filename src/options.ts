/// <reference path="./settings.ts" />

interface OptionsFormControls extends HTMLFormControlsCollection {
    injectedClassName: HTMLInputElement;
    checkboxClassName: HTMLInputElement;
    logEnabled: HTMLInputElement;
    cleanUpClassesToRemove: HTMLTextAreaElement;
    cleanUpMaxToProcess: HTMLInputElement;
    cleanUpInterval: HTMLInputElement;
    autoScrollInterval: HTMLInputElement;
    hideSelectedMinDelay: HTMLInputElement;
    hideSelectedMaxDelay: HTMLInputElement;
}

type OptionsForm = HTMLFormElement & {
    elements: OptionsFormControls;
};

interface OptionsChromeStorageArea {
    get(keys?: string | string[] | Record<string, unknown> | null): Promise<Record<string, unknown>>;
    set(items: Record<string, unknown>): Promise<void>;
}

interface OptionsChromeApi {
    storage: {
        local: OptionsChromeStorageArea;
    };
}

declare const chrome: OptionsChromeApi;

const form = document.querySelector<OptionsForm>("#settings-form");
const statusNode = document.querySelector<HTMLParagraphElement>("#status");
const resetButton = document.querySelector<HTMLButtonElement>("#reset-settings");

if (!form || !statusNode || !resetButton) {
    throw new Error("Options page markup is incomplete.");
}

let statusTimer: number | null = null;

const showStatus = (message: string): void => {
    statusNode.textContent = message;

    if (statusTimer !== null) {
        window.clearTimeout(statusTimer);
    }

    statusTimer = window.setTimeout(() => {
        statusNode.textContent = "";
        statusTimer = null;
    }, 2400);
};

const readNumericInput = (input: HTMLInputElement): number => {
    const value = Number(input.value);
    return Number.isFinite(value) && value >= 0 ? value : Number(input.defaultValue);
};

const settingsFromForm = (): SteamHiderSettings =>
    mergeSteamHiderSettings({
        injectedClassName: form.elements.injectedClassName.value,
        checkboxClassName: form.elements.checkboxClassName.value,
        logEnabled: form.elements.logEnabled.checked,
        cleanUp: {
            classesToRemove: form.elements.cleanUpClassesToRemove.value
                .split(/\r?\n/)
                .map(item => item.trim())
                .filter(Boolean),
            maxToProcess: readNumericInput(form.elements.cleanUpMaxToProcess),
            interval: readNumericInput(form.elements.cleanUpInterval)
        },
        autoScroll: {
            interval: readNumericInput(form.elements.autoScrollInterval)
        },
        hideSelected: {
            minDelay: readNumericInput(form.elements.hideSelectedMinDelay),
            maxDelay: readNumericInput(form.elements.hideSelectedMaxDelay)
        }
    });

const renderSettings = (settings: SteamHiderSettings): void => {
    form.elements.injectedClassName.value = settings.injectedClassName;
    form.elements.checkboxClassName.value = settings.checkboxClassName;
    form.elements.logEnabled.checked = settings.logEnabled;
    form.elements.cleanUpClassesToRemove.value = settings.cleanUp.classesToRemove.join("\n");
    form.elements.cleanUpMaxToProcess.value = String(settings.cleanUp.maxToProcess);
    form.elements.cleanUpInterval.value = String(settings.cleanUp.interval);
    form.elements.autoScrollInterval.value = String(settings.autoScroll.interval);
    form.elements.hideSelectedMinDelay.value = String(settings.hideSelected.minDelay);
    form.elements.hideSelectedMaxDelay.value = String(settings.hideSelected.maxDelay);
};

const saveSettings = async (settings: SteamHiderSettings): Promise<void> => {
    await chrome.storage.local.set({
        [STEAM_HIDER_SETTINGS_STORAGE_KEY]: settings
    });
};

const loadSettings = async (): Promise<void> => {
    const stored = await chrome.storage.local.get(STEAM_HIDER_SETTINGS_STORAGE_KEY);
    renderSettings(mergeSteamHiderSettings(stored[STEAM_HIDER_SETTINGS_STORAGE_KEY]));
};

form.addEventListener("submit", event => {
    event.preventDefault();
    saveSettings(settingsFromForm())
        .then(() => showStatus("Saved"))
        .catch(err => {
            console.error("Failed to save Steam Hider settings", err);
            showStatus("Save failed");
        });
});

resetButton.addEventListener("click", () => {
    const settings = cloneSteamHiderDefaultSettings();
    renderSettings(settings);
    saveSettings(settings)
        .then(() => showStatus("Defaults restored"))
        .catch(err => {
            console.error("Failed to reset Steam Hider settings", err);
            showStatus("Reset failed");
        });
});

loadSettings().catch(err => {
    console.error("Failed to load Steam Hider settings", err);
    showStatus("Load failed");
});
