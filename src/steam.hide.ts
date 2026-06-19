interface SteamHiderPlugin {
    start(): void;
    stop(): void;
}

interface Window {
    SteamHider?: SteamHiderPlugin;
}

type SelectButton = HTMLButtonElement & {
    checked: boolean;
};

interface SelectedItem {
    parent: HTMLElement;
    checkbox: SelectButton;
}

declare const IgnoreButton: (button: HTMLElement, appId?: string) => void | Promise<void>;
declare const InitInfiniteScroll: {
    oController: {
        OnScroll(): void;
    };
};

const SteamHider = function (): SteamHiderPlugin {
    if (window.SteamHider) {
        return window.SteamHider;
    }

    const settings = {
        injectedClassName: 'HIDE_BUTTON_INJECTED',
        checkboxClassName: 'HIDE_CHECKBOX',
        logEnabled: false,
        cleanUp: {
            classesToRemove: [
                'ds_ignored',
                'ds_owned',
                'ds_wishlist'
            ],
            maxToProcess: 500,
            interval: 500
        },
        autoScroll: {
            interval: 500
        }
    };

    const dom: {
        resultsRows: HTMLElement | null;
        globalHeader: HTMLElement | null;
        removedLabel: HTMLParagraphElement | null;
        hideSelectedButton: HTMLButtonElement | null;
    } = {
        resultsRows: document.getElementById("search_resultsRows"),
        globalHeader: document.getElementById("global_header"),
        removedLabel: null,
        hideSelectedButton: null
    };

    const state: {
        removed: number;
        removedTotal: number;
        selected: SelectedItem[];
        started: boolean;
        lastChecked: SelectButton | null;
        lastCheckedIndex: number | null;
        timers: {
            cleanUpIntervalId: number | null;
            autoScrollIntervalId: number | null;
            removedNodesLogIntervalId: number | null;
        };
    } = {
        removed: 0,
        removedTotal: 0,
        selected: [],
        started: false,
        lastChecked: null,
        lastCheckedIndex: null,
        timers: {
            cleanUpIntervalId: null,
            autoScrollIntervalId: null,
            removedNodesLogIntervalId: null
        }
    };

    const removeNode = (node: ChildNode | null): void => {
        node?.parentNode?.removeChild(node);
        state.removed++;
    };

    const setCheckboxState = (checkbox: SelectButton, checked: boolean): void => {
        checkbox.checked = checked;
        checkbox.innerText = checked ? "✓" : "+";
        checkbox.setAttribute("aria-pressed", checked ? "true" : "false");
        checkbox.title = checked ? "Unselect row" : "Select row";
    };

    const getIndex = (node: Element): number => {
        let index = 0;
        let el: Element | null = node;

        while ((el = el.previousElementSibling) !== null) {
            index++;
        }

        return index;
    };

    const onCheckboxClick = (e: MouseEvent, gameNode: HTMLElement, checkbox: SelectButton): void => {
        const index = getIndex(gameNode);

        if (!checkbox.checked) {
            const last = state.lastCheckedIndex;
            if (e.shiftKey && last !== null && gameNode.parentElement) {
                const begin = last < index ? last : index;
                const end = begin === last ? index : last;
                const children = gameNode.parentElement.children;
                for (let i = begin; i <= end; i++) {
                    const child = children[i] as HTMLElement;
                    const childCheckbox = child.querySelector<SelectButton>(`.${settings.checkboxClassName}`);
                    if (childCheckbox && !childCheckbox.checked) {
                        setCheckboxState(childCheckbox, true);
                        state.selected.push({parent: child, checkbox: childCheckbox});
                    }
                }
            } else {
                setCheckboxState(checkbox, true);
                state.selected.push({parent: gameNode, checkbox});
            }
        } else {
            setCheckboxState(checkbox, false);
            state.selected = state.selected.filter(it => it.checkbox !== checkbox);
        }

        state.lastChecked = checkbox;
        state.lastCheckedIndex = index;
        if (dom.hideSelectedButton) {
            dom.hideSelectedButton.disabled = state.selected.length === 0;
        }
    };

    const onItemAdded = (addedNode: ChildNode): boolean => {
        if (addedNode.nodeType !== Node.ELEMENT_NODE) {
            removeNode(addedNode);
            return true;
        }

        const item = addedNode as HTMLElement;
        const classList = item.classList;
        if (settings.cleanUp.classesToRemove.some(c => classList.contains(c))) {
            removeNode(item);
            return true;
        }
        if (classList.contains(settings.injectedClassName)) return false;
        if (item.dataset.dsPackageid) {
            removeNode(item);
            return false;
        }
        if (!item.dataset.dsAppid) {
            removeNode(item);
            return true;
        }

        item.classList.add(settings.injectedClassName);
        item.style.overflow = "visible";

        const controlsContainer = document.createElement("div");
        controlsContainer.classList.add("steam-hider-row-controls");
        item.insertBefore(controlsContainer, item.firstChild);

        const checkbox = document.createElement("button") as SelectButton;
        checkbox.classList.add(settings.checkboxClassName, "steam-hider-icon-button", "steam-hider-select-button");
        checkbox.type = "button";
        checkbox.setAttribute("aria-label", "Select row");
        setCheckboxState(checkbox, false);
        checkbox.onclick = e => {
            e.preventDefault();
            onCheckboxClick(e, item, checkbox);
        };
        controlsContainer.appendChild(checkbox);

        const hideButton = document.createElement("button");
        hideButton.classList.add("steam-hider-icon-button", "steam-hider-hide-button");
        hideButton.type = "button";
        hideButton.setAttribute("aria-label", "Hide row");
        hideButton.title = "Hide row";
        hideButton.innerText = "×";
        hideButton.onclick = e => {
            e.preventDefault();
            IgnoreButton(hideButton, item.dataset.dsAppid);
            removeNode(item);
        };
        controlsContainer.appendChild(hideButton);
        return true;
    };

    const cleanUp = (): void => {
        if (!dom.resultsRows) return;

        const childNodes = dom.resultsRows.childNodes;
        let processed = 0;
        for (let i = 0; i < childNodes.length && processed < settings.cleanUp.maxToProcess; i++) {
            if (!state.started) return;
            const child = childNodes[i];
            if (onItemAdded(child)) processed++;
        }
    };

    const autoScroll = (): void => InitInfiniteScroll.oController.OnScroll();

    const logRemoved = (): void => {
        const removedNodes = state.removed;
        state.removed -= removedNodes;
        state.removedTotal += removedNodes;
        if (dom.removedLabel) {
            dom.removedLabel.innerText = String(state.removedTotal);
        }
        if (settings.logEnabled && removedNodes > 0) {
            console.log(`Removed ${removedNodes} per second, total: ${state.removedTotal}`);
        }
    };

    const plugin: SteamHiderPlugin = {
        start() {
            if (state.started) return;
            dom.resultsRows = document.getElementById("search_resultsRows");
            document.getElementById("client_filter")?.remove();
            state.timers.cleanUpIntervalId = window.setInterval(cleanUp, settings.cleanUp.interval);
            state.timers.autoScrollIntervalId = window.setInterval(autoScroll, settings.autoScroll.interval);
            state.timers.removedNodesLogIntervalId = window.setInterval(logRemoved, 1000);
            state.started = true;
        },
        stop() {
            if (!state.started) return;
            state.started = false;
            if (state.timers.cleanUpIntervalId !== null) clearInterval(state.timers.cleanUpIntervalId);
            if (state.timers.autoScrollIntervalId !== null) clearInterval(state.timers.autoScrollIntervalId);
            if (state.timers.removedNodesLogIntervalId !== null) clearInterval(state.timers.removedNodesLogIntervalId);
        }
    };

    const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

    const randomDelay = (min = 200, max = 800): Promise<void> =>
        delay(Math.floor(Math.random() * (max - min + 1)) + min);

    const widgetBlock = document.createElement("div");
    widgetBlock.style.position = "fixed";
    widgetBlock.style.top = "32px";
    widgetBlock.style.right = "32px";
    widgetBlock.style.display = "flex";
    widgetBlock.style.alignItems = "center";
    widgetBlock.style.gap = "4px";
    widgetBlock.style.zIndex = "1000";

    const hideSelectedButton = document.createElement("button");
    hideSelectedButton.classList.add('btnv6_blue_hoverfade', 'btn_small');
    hideSelectedButton.style.width = "100px";
    hideSelectedButton.style.height = "24px";
    hideSelectedButton.innerText = "Hide Selected";
    hideSelectedButton.disabled = true;
    hideSelectedButton.onclick = async () => {
        const failed: SelectedItem[] = [];

        for (const item of state.selected) {
            const parent = item.parent;

            try {
                const result = IgnoreButton(item.checkbox, parent.dataset.dsAppid);

                if (result instanceof Promise) {
                    await result;
                }

                removeNode(parent);

                await randomDelay(300, 1200);
            } catch (err) {
                console.error('Ignore failed for', parent.dataset.dsAppid, err);
                failed.push(item);
            }
        }

        state.selected = failed;

        hideSelectedButton.disabled = state.selected.length === 0;
    };
    widgetBlock.appendChild(hideSelectedButton);
    dom.hideSelectedButton = hideSelectedButton;

    const activationButton = document.createElement("button");
    activationButton.classList.add('btnv6_blue_hoverfade', 'btn_small');
    activationButton.style.width = "48px";
    activationButton.style.height = "24px";
    activationButton.innerText = "Run";
    activationButton.onclick = () => {
        if (!state.started) {
            plugin.start();
            activationButton.innerText = "Stop";
        } else {
            plugin.stop();
            activationButton.innerText = "Run";
        }
    };
    widgetBlock.appendChild(activationButton);

    dom.removedLabel = document.createElement("p");
    dom.removedLabel.style.fontSize = "x-small";
    dom.removedLabel.style.userSelect = "none";
    dom.removedLabel.style.margin = "4px";
    dom.removedLabel.style.textAlign = "center";
    widgetBlock.appendChild(dom.removedLabel);

    dom.globalHeader?.insertBefore(widgetBlock, dom.globalHeader.firstChild);

    window.SteamHider = plugin;
    return plugin;
}();
