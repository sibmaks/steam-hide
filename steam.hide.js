const SteamHider = function () {
    if (window.SteamHider) {
        return;
    }
    window.SteamHider = this;

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

    const getIndex = (node) => {
        let index = 0;
        let el = node;

        while ((el = el.previousElementSibling) !== null) {
            index++;
        }

        return index;
    }

    const onCheckboxClick = (e, gameNode, checkbox) => {
        console.log(state)
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
                        childCheckbox.checked = true;
                        childCheckbox.innerText = "[+]";
                        state.selected.push({parent: child, checkbox: childCheckbox})
                    }
                }
            } else {
                checkbox.checked = true;
                checkbox.innerText = "[+]";
                state.selected.push({parent: gameNode, checkbox: checkbox})
            }
        } else {
            checkbox.checked = false;
            checkbox.innerText = "[]";
            state.selected = state.selected.filter(it => it.checkbox !== checkbox)
        }

        state.lastChecked = checkbox;
        state.lastCheckedIndex = index;
        dom.hideSelectedButton.disabled = state.selected.length === 0;
        console.log(state)
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
        controlsContainer.style.position = "absolute";
        controlsContainer.style.left = "-68px";
        controlsContainer.style.top = "16px";
        controlsContainer.style.display = "flex";
        controlsContainer.style.alignItems = "center";
        controlsContainer.style.gap = "4px";
        addedNode.insertBefore(controlsContainer, addedNode.firstChild);

        const checkbox = document.createElement("button");
        checkbox.classList.add(settings.checkboxClassName);
        checkbox.style.width = "24px";
        checkbox.style.height = "24px";
        checkbox.innerText = "[]";
        checkbox.checked = false;
        checkbox.onclick = e => {
            e.preventDefault();
            onCheckboxClick(e, addedNode, checkbox)
        };
        controlsContainer.appendChild(checkbox);

        const hideButton = document.createElement("button");
        hideButton.style.width = "24px";
        hideButton.style.height = "24px";
        hideButton.innerText = "-";
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

    return plugin;
}();
