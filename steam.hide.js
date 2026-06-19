const SteamHider = function () {
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
        },
        styles: {
            id: 'steam-hider-styles'
        }
    };

    const dom = {
        resultsRows: document.getElementById("search_resultsRows"),
        globalHeader: document.getElementById("global_header"),
        removedLabel: null,
        hideSelectedButton: null
    };

    const state = {
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

    const removeNode = node => {
        node?.parentNode?.removeChild(node);
        state.removed++;
    };

    const ensureStyles = () => {
        if (document.getElementById(settings.styles.id)) {
            return;
        }

        const style = document.createElement('style');
        style.id = settings.styles.id;
        style.textContent = `
            .steam-hider-row-controls {
                position: absolute;
                left: -76px;
                top: 14px;
                display: flex;
                align-items: center;
                gap: 6px;
                z-index: 5;
            }

            .steam-hider-icon-button {
                width: 28px;
                height: 28px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border: 1px solid rgba(255, 255, 255, 0.18);
                border-radius: 6px;
                background: linear-gradient(180deg, #2a475e 0%, #1b2838 100%);
                color: #c7d5e0;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.08);
                cursor: pointer;
                font: 700 16px/1 Arial, Helvetica, sans-serif;
                padding: 0;
                transition: background 120ms ease, border-color 120ms ease, color 120ms ease, transform 120ms ease;
            }

            .steam-hider-icon-button:hover {
                border-color: rgba(102, 192, 244, 0.7);
                color: #ffffff;
                background: linear-gradient(180deg, #3b6f8f 0%, #26445d 100%);
                transform: translateY(-1px);
            }

            .steam-hider-icon-button:active {
                transform: translateY(0);
            }

            .steam-hider-select-button[aria-pressed="true"] {
                border-color: rgba(164, 208, 7, 0.75);
                background: linear-gradient(180deg, #87a416 0%, #526d09 100%);
                color: #ffffff;
            }

            .steam-hider-hide-button {
                font-size: 18px;
            }

            .steam-hider-hide-button:hover {
                border-color: rgba(255, 118, 118, 0.75);
                background: linear-gradient(180deg, #7c2f2f 0%, #4b2020 100%);
            }
        `;
        document.head.appendChild(style);
    };

    const setCheckboxState = (checkbox, checked) => {
        checkbox.checked = checked;
        checkbox.innerText = checked ? "✓" : "+";
        checkbox.setAttribute("aria-pressed", checked ? "true" : "false");
        checkbox.title = checked ? "Unselect row" : "Select row";
    };

    const getIndex = (node) => {
        let index = 0;
        let el = node;

        while ((el = el.previousElementSibling) !== null) {
            index++;
        }

        return index;
    }

    const onCheckboxClick = (e, gameNode, checkbox) => {
        let index = getIndex(gameNode);

        if (!checkbox.checked) {
            const last = state.lastCheckedIndex;
            if (e.shiftKey && last !== null) {
                const begin = last < index ? last : index;
                const end = begin === last ? index : last;
                const children = gameNode.parentNode.children;
                for (let i = begin; i <= end; i++) {
                    const child = children[i];
                    const childCheckbox = child.querySelector(`.${settings.checkboxClassName}`);
                    if (!childCheckbox.checked) {
                        setCheckboxState(childCheckbox, true);
                        state.selected.push({parent: child, checkbox: childCheckbox})
                    }
                }
            } else {
                setCheckboxState(checkbox, true);
                state.selected.push({parent: gameNode, checkbox: checkbox})
            }
        } else {
            setCheckboxState(checkbox, false);
            state.selected = state.selected.filter(it => it.checkbox !== checkbox)
        }

        state.lastChecked = checkbox;
        state.lastCheckedIndex = index;
        dom.hideSelectedButton.disabled = state.selected.length === 0;
    };

    const onItemAdded = addedNode => {
        if (addedNode.nodeType !== Node.ELEMENT_NODE) {
            removeNode(addedNode);
            return true;
        }
        const classList = addedNode.classList;
        if (settings.cleanUp.classesToRemove.some(c => classList.contains(c))) {
            removeNode(addedNode);
            return true;
        }
        if (classList.contains(settings.injectedClassName)) return false;
        if (addedNode.dataset.dsPackageid) {
            removeNode(addedNode);
            return false;
        }
        if (!addedNode.dataset.dsAppid) {
            removeNode(addedNode);
            return true;
        }

        addedNode.classList.add(settings.injectedClassName);
        addedNode.style.overflow = "visible";

        const controlsContainer = document.createElement("div");
        controlsContainer.classList.add("steam-hider-row-controls");
        addedNode.insertBefore(controlsContainer, addedNode.firstChild);

        const checkbox = document.createElement("button");
        checkbox.classList.add(settings.checkboxClassName, "steam-hider-icon-button", "steam-hider-select-button");
        checkbox.type = "button";
        checkbox.setAttribute("aria-label", "Select row");
        setCheckboxState(checkbox, false);
        checkbox.onclick = e => {
            e.preventDefault();
            onCheckboxClick(e, addedNode, checkbox)
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
            IgnoreButton(hideButton, addedNode.dataset.dsAppid);
            removeNode(addedNode);
        };
        controlsContainer.appendChild(hideButton);
        return true;
    };

    const cleanUp = () => {
        const childNodes = dom.resultsRows.childNodes;
        let processed = 0;
        for (let i = 0; i < childNodes.length && processed < settings.cleanUp.maxToProcess; i++) {
            if (!state.started) return;
            const child = childNodes[i];
            if (onItemAdded(child)) processed++;
        }
    };

    const autoScroll = () => InitInfiniteScroll.oController.OnScroll();

    const logRemoved = () => {
        const removedNodes = state.removed;
        state.removed -= removedNodes;
        state.removedTotal += removedNodes;
        dom.removedLabel.innerText = state.removedTotal;
        if (settings.logEnabled && removedNodes > 0) {
            console.log(`Removed ${removedNodes} per second, total: ${state.removedTotal}`);
        }
    };

    const plugin = {
        start() {
            if (state.started) return;
            dom.resultsRows = document.getElementById("search_resultsRows");
            document.getElementById("client_filter")?.remove();
            state.timers.cleanUpIntervalId = setInterval(cleanUp, settings.cleanUp.interval);
            state.timers.autoScrollIntervalId = setInterval(autoScroll, settings.autoScroll.interval);
            state.timers.removedNodesLogIntervalId = setInterval(logRemoved, 1000);
            state.started = true;
        },
        stop() {
            if (!state.started) return;
            state.started = false;
            clearInterval(state.timers.cleanUpIntervalId);
            clearInterval(state.timers.autoScrollIntervalId);
            clearInterval(state.timers.removedNodesLogIntervalId);
        }
    };

    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    const randomDelay = (min = 200, max = 800) =>
        delay(Math.floor(Math.random() * (max - min + 1)) + min);


    const widgetBlock = document.createElement("div");
    ensureStyles();
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
        const failed = [];

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

        dom.hideSelectedButton.disabled = state.selected.length === 0;
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

    dom.globalHeader.insertBefore(widgetBlock, dom.globalHeader.firstChild);

    window.SteamHider = plugin;
    return plugin;
}();
