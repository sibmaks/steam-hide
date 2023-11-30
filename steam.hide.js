const SteamHider = function () {
    const settings = {
        injectedClassName: 'HIDE_BUTTON_INJECTED',
        cleanUp: {
            maxToProcess: 500,
            interval: 500
        }
    };

    const dom = {
        resultsRows: document.getElementById("search_resultsRows")
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

    const onItemAdded = function (addedNode) {
        if (addedNode.nodeType === Node.ELEMENT_NODE) {
            const classList = addedNode.classList;
            if (classList.contains("ds_ignored") || classList.contains("ds_owned") || classList.contains("ds_wishlist")) {
                const parent = addedNode.parentNode;
                parent.removeChild(addedNode);
                state.removed++;
                return true;
            }
            if (classList.contains(settings.cleanUp.injectedClassName)) {
                return false;
            }
            const dsAppid = addedNode.dataset.dsAppid;
            if(!dsAppid) {
                const parent = addedNode.parentNode;
                parent.removeChild(addedNode);
                state.removed++;
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
                const parent = addedNode.parentNode;
                parent.removeChild(addedNode);
                state.removed++;
            };
            addedNode.insertBefore(hideButton, addedNode.children[0]);
        } else {
            const parent = addedNode.parentNode;
            parent.removeChild(addedNode);
            state.removed++;
        }
        return true;
    }


    const cleanUp = function () {
        const childNodes = dom.resultsRows.childNodes;
        let processed = 0;
        for (let i = 0; i < childNodes.length && processed < settings.cleanUp.maxToProcess; i++) {
            if(!state.started) {
                return;
            }
            const child = childNodes[i];
            if(onItemAdded(child)) {
                processed++;
            }
        }
    }

    const logRemoved = function () {
        const removedNodes = state.removed;
        state.removed -= removedNodes;
        state.removedTotal += removedNodes;
        if (removedNodes > 0) {
            console.log(`Removed ${removedNodes} per second, total: ${state.removedTotal}`);
        }
    }


    return {
        settings: settings,
        start: function () {
            if(state.started) {
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
            if(!state.started) {
                return;
            }
            state.started = false;
            clearInterval(state.timers.cleanUpIntervalId);
            clearInterval(state.timers.removedNodesLogIntervalId);
        }
    };
}();