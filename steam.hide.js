const SteamHider = function () {
    const settings = {
        injectedClassName: 'HIDE_BUTTON_INJECTED',
        logEnabled: false,
        cleanUp: {
            classesToRemove: [
                'ds_ignored',
                'ds_owned',
                'ds_wishlist'
            ],
            maxToProcess: 500,
            interval: 500
        }
    };

    const dom = {
        resultsRows: document.getElementById("search_resultsRows"),
        globalHeader: document.getElementById("global_header")
    }

    const state = {
        removed: 0,
        removedTotal: 0,
        started: false,
        timers: {
            cleanUpIntervalId: null,
            removedNodesLogIntervalId: null
        }
    };

    const removeNode = function (node) {
        const parent = node.parentNode;
        parent.removeChild(node);
        state.removed++;
    }

    const onItemAdded = function (addedNode) {
        if (addedNode.nodeType === Node.ELEMENT_NODE) {
            const classList = addedNode.classList;
            if (settings.cleanUp.classesToRemove.some(classToRemove => classList.contains(classToRemove))) {
                removeNode(addedNode);
                return true;
            }
            if (classList.contains(settings.cleanUp.injectedClassName)) {
                return false;
            }
            // packages are not ignorable
            const dsPackageId = addedNode.dataset.dsPackageid;
            if (dsPackageId) {
                removeNode(addedNode);
                return false;
            }
            const dsAppid = addedNode.dataset.dsAppid;
            if (!dsAppid) {
                removeNode(addedNode);
                return true;
            }
            addedNode.classList.add(settings.cleanUp.injectedClassName);
            addedNode.style.overflow = "visible";
            const hideButton = document.createElement("button");
            hideButton.style.position = "absolute";
            hideButton.style.left = "-48px";
            hideButton.style.width = "24px";
            hideButton.style.height = "24px";
            hideButton.innerText = "-";
            hideButton.onclick = function (e) {
                e.preventDefault();
                IgnoreButton(hideButton, dsAppid);
                removeNode(addedNode);
            };
            addedNode.insertBefore(hideButton, addedNode.children[0]);
        } else {
            removeNode(addedNode);
        }
        return true;
    }


    const cleanUp = function () {
        const childNodes = dom.resultsRows.childNodes;
        let processed = 0;
        for (let i = 0; i < childNodes.length && processed < settings.cleanUp.maxToProcess; i++) {
            if (!state.started) {
                return;
            }
            const child = childNodes[i];
            if (onItemAdded(child)) {
                processed++;
            }
        }
    }

    const logRemoved = function () {
        const removedNodes = state.removed;
        state.removed -= removedNodes;
        state.removedTotal += removedNodes;
        if(!settings.logEnabled) {
            return
        }
        if (removedNodes > 0) {
            console.log(`Removed ${removedNodes} per second, total: ${state.removedTotal}`);
        }
    }

    const plugin = {
        settings: settings,
        start: function () {
            if (state.started) {
                return;
            }
            dom.resultsRows = document.getElementById("search_resultsRows");
            const clientFilter = document.getElementById("client_filter");
            if (clientFilter) {
                clientFilter.parentNode.removeChild(clientFilter);
            }

            state.timers.cleanUpIntervalId = setInterval(cleanUp, settings.cleanUp.interval);
            state.timers.removedNodesLogIntervalId = setInterval(logRemoved, 1000);

            state.started = true;
        },
        stop: function () {
            if (!state.started) {
                return;
            }
            state.started = false;
            clearInterval(state.timers.cleanUpIntervalId);
            clearInterval(state.timers.removedNodesLogIntervalId);
        }
    };

    const activationButton = document.createElement("button");
    activationButton.style.position = "fixed";
    activationButton.style.top = "32px";
    activationButton.style.right = "32px";
    activationButton.style.width = "48px";
    activationButton.style.height = "24px";
    activationButton.innerText = "Run";
    activationButton.onclick = function (e) {
        if (!state.started) {
            plugin.start();
            activationButton.innerText = "Stop";
        } else {
            plugin.stop();
            activationButton.innerText = "Run";
        }
    };
    dom.globalHeader.insertBefore(activationButton, dom.globalHeader.children[0]);


    return plugin;
}();
