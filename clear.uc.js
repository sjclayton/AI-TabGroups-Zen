// FINAL VERSION 4.9.2-ClearOnly-Minified (Removed Sort, Comments, Logs)
(() => {
    const CONFIG = {
        styles: `
        .vertical-pinned-tabs-container-separator,
        .zen-workspace-tabs-section[hide-separator] .vertical-pinned-tabs-container-separator {
             display: flex !important;
             flex-direction: column;
             margin-left: 0 !important;
             min-height: 1px !important;
             background-color: var(--lwt-toolbarbutton-border-color, rgba(200, 200, 200, 0.1));
             transition: width 0.1s ease-in-out, margin-right 0.1s ease-in-out, background-color 0.3s ease-out;
             margin-top: 5px !important;
             margin-bottom: 8px !important;
        }
        #clear-button {
            opacity: 0;
            transition: opacity 0.1s ease-in-out;
            position: absolute;
            right: 0;
            font-size: 12px;
            width: 60px;
            pointer-events: auto;
            align-self: end;
            appearance: none;
            margin-top: -8px;
            padding: 1px;
            color: grey;
            label { display: block; }
        }
        #clear-button:hover {
            opacity: 1;
            color: white;
            border-radius: 4px;
        }
        .vertical-pinned-tabs-container-separator:has(#clear-button):hover,
        .zen-workspace-tabs-section[hide-separator] .vertical-pinned-tabs-container-separator:has(#clear-button):hover {
            width: calc(100% - 60px);
            margin-right: auto;
            background-color: var(--lwt-toolbarbutton-hover-background, rgba(200, 200, 200, 0.2));
        }
        .vertical-pinned-tabs-container-separator:hover #clear-button,
        .zen-workspace-tabs-section[hide-separator] .vertical-pinned-tabs-container-separator:hover #clear-button {
            opacity: 1;
        }
        .tab-closing {
            animation: fadeUp 0.5s forwards;
        }
        @keyframes fadeUp {
            0% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-20px); max-height: 0px; padding: 0; margin: 0; border: 0; }
        }
        .tabbrowser-tab {
            transition: transform 0.3s ease-out, opacity 0.3s ease-out, max-height 0.5s ease-out, margin 0.5s ease-out, padding 0.5s ease-out;
        }
    `
    };

    let commandListenerAdded = false;

    const injectStyles = () => {
        let styleElement = document.getElementById('tab-clear-styles');
        if (!styleElement) {
            styleElement = Object.assign(document.createElement('style'), {
                id: 'tab-clear-styles',
                textContent: CONFIG.styles
            });
            document.head.appendChild(styleElement);
        } else if (styleElement.textContent !== CONFIG.styles) {
            styleElement.textContent = CONFIG.styles;
        }
    };

    const clearTabs = () => {
        try {
            const currentWorkspaceId = window.ZenWorkspaces?.activeWorkspace;
            if (!currentWorkspaceId) return;
            const groupSelector = `tab-group:has(tab[zen-workspace-id="${currentWorkspaceId}"])`;
            const tabsToClose = [];
            for (const tab of gBrowser.tabs) {
                 const isSameWorkSpace = tab.getAttribute('zen-workspace-id') === currentWorkspaceId;
                 const groupParent = tab.closest('tab-group');
                 const isInGroupInCorrectWorkspace = groupParent ? groupParent.matches(groupSelector) : false;
                 const isEmptyZenTab = tab.hasAttribute("zen-empty-tab");
                 if (isSameWorkSpace && !tab.selected && !tab.pinned && !isInGroupInCorrectWorkspace && !isEmptyZenTab && tab.isConnected) {
                    tabsToClose.push(tab);
                 }
            }
            if (tabsToClose.length === 0) return;

            tabsToClose.forEach(tab => {
                tab.classList.add('tab-closing');
                setTimeout(() => {
                    if (tab && tab.isConnected) {
                        try {
                            gBrowser.removeTab(tab, { animate: false, skipSessionStore: false, closeWindowWithLastTab: false });
                        } catch (removeError) {
                             if (tab && tab.isConnected) {
                               tab.classList.remove('tab-closing');
                            }
                        }
                    }
                }, 500);
            });
        } catch (error) {
            console.log(error);
        }
    };

    function ensureButtonsExist(container) {
        if (!container || !container.isConnected) return;
        if (!container.querySelector('#clear-button')) {
            try {
                const buttonFragment = window.MozXULElement.parseXULToFragment(
                    `<toolbarbutton id="clear-button" command="cmd_zenClearTabs" label="↓ Clear" tooltiptext="Close ungrouped, non-pinned tabs"/>`
                );
                if (container.isConnected) {
                    container.appendChild(buttonFragment.firstChild.cloneNode(true));
                }
            } catch (e) { console.log(e); }
        }
    }

    function addButtonsToAllSeparators() {
        const separators = document.querySelectorAll(".vertical-pinned-tabs-container-separator");
        if (separators.length > 0) {
            separators.forEach(ensureButtonsExist);
        } else {
            const periphery = document.querySelector('#tabbrowser-arrowscrollbox-periphery');
            if (periphery && !periphery.querySelector('#clear-button')) {
                ensureButtonsExist(periphery);
            }
        }
    }

    function setupCommandsAndListener() {
        const zenCommands = document.querySelector("commandset#zenCommandSet");
        if (!zenCommands) return;
        if (!zenCommands.querySelector("#cmd_zenClearTabs")) {
            try {
                const cmd = window.MozXULElement.parseXULToFragment(`<command id="cmd_zenClearTabs"/>`).firstChild;
                zenCommands.appendChild(cmd);
            } catch (e) { console.log(e); }
        }
        if (!commandListenerAdded) {
            try {
                zenCommands.addEventListener('command', (event) => {
                    if (event.target.id === "cmd_zenClearTabs") {
                        clearTabs();
                    }
                });
                commandListenerAdded = true;
            } catch (e) { console.log(e); }
        }
    }

    function setupZenWorkspaceHooks() {
        if (typeof ZenWorkspaces === 'undefined' || typeof ZenWorkspaces.clearButtonHooksApplied !== 'undefined') {
             return;
        }
        ZenWorkspaces.originalClearButtonHooks = {
            onTabBrowserInserted: ZenWorkspaces.onTabBrowserInserted,
            updateTabsContainers: ZenWorkspaces.updateTabsContainers,
        };
        ZenWorkspaces.clearButtonHooksApplied = true;

        ZenWorkspaces.onTabBrowserInserted = function(event) {
            if (typeof ZenWorkspaces.originalClearButtonHooks.onTabBrowserInserted === 'function') {
                try { ZenWorkspaces.originalClearButtonHooks.onTabBrowserInserted.call(ZenWorkspaces, event); } catch (e) { /* Error handling removed */ }
            }
            setTimeout(addButtonsToAllSeparators, 150);
        };

        ZenWorkspaces.updateTabsContainers = function(...args) {
            if (typeof ZenWorkspaces.originalClearButtonHooks.updateTabsContainers === 'function') {
                try { ZenWorkspaces.originalClearButtonHooks.updateTabsContainers.apply(ZenWorkspaces, args); } catch (e) { /* Error handling removed */ }
            }
            setTimeout(addButtonsToAllSeparators, 150);
        };
    }

    function initializeScript() {
        let checkCount = 0;
        const maxChecks = 30;
        const checkInterval = 1000;

        const initCheckInterval = setInterval(() => {
            checkCount++;
            const separatorExists = !!document.querySelector(".vertical-pinned-tabs-container-separator");
            const peripheryExists = !!document.querySelector('#tabbrowser-arrowscrollbox-periphery');
            const commandSetExists = !!document.querySelector("commandset#zenCommandSet");
            const gBrowserReady = typeof gBrowser !== 'undefined' && gBrowser.tabContainer;
            const zenWorkspacesReady = typeof ZenWorkspaces !== 'undefined' && typeof ZenWorkspaces.activeWorkspace !== 'undefined';
            const ready = gBrowserReady && commandSetExists && (separatorExists || peripheryExists) && zenWorkspacesReady;

            if (ready) {
                clearInterval(initCheckInterval);
                const finalSetup = () => {
                    try {
                        injectStyles();
                        setupCommandsAndListener();
                        addButtonsToAllSeparators();
                        setupZenWorkspaceHooks();
                    } catch (e) { console.log(e); }
                };
                 if ('requestIdleCallback' in window) {
                     requestIdleCallback(finalSetup, { timeout: 2000 });
                 } else {
                     setTimeout(finalSetup, 500);
                 }
            } else if (checkCount > maxChecks) {
                clearInterval(initCheckInterval);
            }
        }, checkInterval);
    }

    if (document.readyState === "complete" || document.readyState === "interactive") {
        initializeScript();
    } else {
        window.addEventListener("load", initializeScript, { once: true });
    }

})();