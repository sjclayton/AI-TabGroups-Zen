(() => {
    // --- Configuration ---
    const CONFIG = {
        apiConfig: {
            /* ... Ollama/API config remains the same ... */
            ollama: {
                endpoint: 'http://localhost:11434/api/generate',
                enabled: true,
                model: 'llama3.1:latest',
                promptTemplateBatch: `Analyze the following numbered list of tab data (Title, URL, Description) and assign a concise category (1-2 words, Title Case) for EACH tab.
                    Some tabs might logically belong to groups already present based on common domains or topics identified by keywords.
                    PRIORITIZE THE URL/Domain for primary context (e.g., 'GitHub', 'YouTube', 'StackOverflow').
                    Use Title and Description for specifics, disambiguation, or when the domain is generic.
                    BE CONSISTENT: Use the EXACT SAME category name for tabs belonging to the same logical group.

                    Input Tab Data:
                    {TAB_DATA_LIST}

                    ---
                    Instructions for Output:
                    1. Output ONLY the category names.
                    2. Provide EXACTLY ONE category name per line.
                    3. The number of lines in your output MUST EXACTLY MATCH the number of tabs in the Input Tab Data list above.
                    4. DO NOT include numbering, explanations, apologies, or any markdown formatting in the output.
                    5. Just the list of categories, separated by newlines.
                    ---

                    Output:`
            },
            customApi: {
                enabled: false,
            }
        },
        groupColors: [ /* ... Colors remain the same ... */
            "var(--tab-group-color-blue)", "var(--tab-group-color-red)", "var(--tab-group-color-yellow)",
            "var(--tab-group-color-green)", "var(--tab-group-color-pink)", "var(--tab-group-color-purple)",
            "var(--tab-group-color-orange)", "var(--tab-group-color-cyan)", "var(--tab-group-color-gray)"
        ],
        groupColorNames: [ /* ... Color names remain the same ... */
            "blue", "red", "yellow", "green", "pink", "purple", "orange", "cyan", "gray"
        ],
        preGroupingThreshold: 2,
        titleKeywordStopWords: new Set([ /* ... Stop words remain the same ... */
            'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'of',
            'is', 'am', 'are', 'was', 'were', 'be', 'being', 'been', 'has', 'have', 'had', 'do', 'does', 'did',
            'how', 'what', 'when', 'where', 'why', 'which', 'who', 'whom', 'whose',
            'new', 'tab', 'untitled', 'page', 'home', 'com', 'org', 'net', 'io', 'dev', 'app',
            'get', 'set', 'list', 'view', 'edit', 'create', 'update', 'delete',
            'my', 'your', 'his', 'her', 'its', 'our', 'their', 'me', 'you', 'him', 'her', 'it', 'us', 'them',
            'about', 'search', 'results', 'posts', 'index', 'dashboard', 'profile', 'settings',
            'official', 'documentation', 'docs', 'wiki', 'help', 'support', 'faq', 'guide',
            'error', 'login', 'signin', 'sign', 'up', 'out', 'welcome', 'loading',
        ]),
        minKeywordLength: 3,
        // --- Styles (v4.8.1 - Simplified hover rules, removed dependency on [hidden]) ---
        styles: `
        #sort-button {
            opacity: 0;
            transition: opacity 0.1s ease-in-out;
            position: absolute;
            right: 55px; /* Positioned to the left of the clear button */
            font-size: 12px;
            width: 60px;
            pointer-events: auto;
            align-self: end;
            appearance: none;
            margin-top: -8px;
            padding: 1px;
            color: gray;
            label { display: block; }
        }
        #sort-button:hover {
            /* Keep individual hover for color change */
            opacity: 1;
            color: white;
            border-radius: 4px;
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
             /* Keep individual hover for color change */
            opacity: 1;
            color: white;
            border-radius: 4px;
        }

        /* Separator Hover Logic */
        .vertical-pinned-tabs-container-separator {
             display: flex;
             flex-direction: column;
             margin-left: 0;
             transition: width 0.1s ease-in-out, margin-right 0.1s ease-in-out;
        }

        /* Hover when BOTH buttons are potentially visible */
        .vertical-pinned-tabs-container-separator:has(#sort-button):has(#clear-button):hover {
             width: calc(100% - 115px); /* 60px (clear) + 65px (sort) */
             margin-right: auto;
        }
         /* Hover when ONLY SORT is present */
        .vertical-pinned-tabs-container-separator:has(#sort-button):not(:has(#clear-button)):hover {
             width: calc(100% - 65px); /* Only space for sort */
             margin-right: auto;
        }
         /* Hover when ONLY CLEAR is present */
        .vertical-pinned-tabs-container-separator:not(:has(#sort-button)):has(#clear-button):hover {
             width: calc(100% - 60px); /* Only space for clear */
             margin-right: auto;
        }

        /* Show BOTH buttons on separator hover */
        .vertical-pinned-tabs-container-separator:hover #sort-button,
        .vertical-pinned-tabs-container-separator:hover #clear-button {
            opacity: 1;
        }

        /* Tab Animations (remain the same) */
        .tab-closing {
            animation: fadeUp 0.5s forwards;
        }
        @keyframes fadeUp {
            0% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-20px); }
        }
        @keyframes loading-pulse-tab {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
        }
        .tab-is-sorting .tab-icon-image,
        .tab-is-sorting .tab-label {
            animation: loading-pulse-tab 1.5s ease-in-out infinite;
            will-change: opacity;
        }
        .tabbrowser-tab {
            transition: transform 0.3s ease-out, opacity 0.3s ease-out;
        }
        tab-group {
            transition: background-color 0.3s ease;
        }
    `
    };

    // --- Globals & State ---
    let groupColorIndex = 0;
    let isSorting = false;
    let commandListenerAdded = false;

    // --- Helper Functions ---

    const injectStyles = () => {
        let styleElement = document.getElementById('tab-sort-clear-styles');
        if (styleElement) {
            if (styleElement.textContent !== CONFIG.styles) {
                styleElement.textContent = CONFIG.styles;
                console.log("BUTTONS: Styles updated.");
            }
            return;
        }
        styleElement = Object.assign(document.createElement('style'), {
            id: 'tab-sort-clear-styles',
            textContent: CONFIG.styles
        });
        document.head.appendChild(styleElement);
        console.log("BUTTONS: Styles injected.");
    };

    // --- getTabData, toTitleCase, processTopic, extractTitleKeywords, getNextGroupColorName, findGroupElement (Keep these unchanged) ---
    const getTabData = (tab) => {
        /* ... Function remains the same ... */
        if (!tab || !tab.isConnected) {
            return { title: 'Invalid Tab', url: '', hostname: '', description: '' };
        }
        let title = 'Untitled Page';
        let fullUrl = '';
        let hostname = '';
        let description = '';
        try {
            const originalTitle = tab.getAttribute('label') || tab.querySelector('.tab-label, .tab-text')?.textContent || '';
            const browser = tab.linkedBrowser || tab._linkedBrowser || gBrowser?.getBrowserForTab?.(tab);
            if (browser?.currentURI?.spec && !browser.currentURI.spec.startsWith('about:')) {
                try {
                    const currentURL = new URL(browser.currentURI.spec);
                    fullUrl = currentURL.href;
                    hostname = currentURL.hostname.replace(/^www\./, '');
                } catch (e) {
                    hostname = 'Invalid URL';
                    fullUrl = browser?.currentURI?.spec || 'Invalid URL';
                }
            } else if (browser?.currentURI?.spec) {
                fullUrl = browser.currentURI.spec;
                hostname = 'Internal Page';
            }
            if (!originalTitle || originalTitle === 'New Tab' || originalTitle === 'about:blank' || originalTitle === 'Loading...' || originalTitle.startsWith('http:') || originalTitle.startsWith('https:')) {
                if (hostname && hostname !== 'Invalid URL' && hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname !== 'Internal Page') {
                    title = hostname;
                } else {
                    try {
                        const pathSegment = new URL(fullUrl).pathname.split('/')[1];
                        if (pathSegment) title = pathSegment;
                    } catch {
                        /* ignore */ }
                }
            } else {
                title = originalTitle.trim();
            }
            title = title || 'Untitled Page';
            try {
                if (browser && browser.contentDocument) {
                    const metaDescElement = browser.contentDocument.querySelector('meta[name="description"]');
                    if (metaDescElement) {
                        description = metaDescElement.getAttribute('content')?.trim() || '';
                        description = description.substring(0, 200);
                    }
                }
            } catch (contentError) {
                /* ignore permission errors */ }
        } catch (e) {
            console.error('Error getting tab data for tab:', tab, e);
            title = 'Error Processing Tab';
        }
        return { title: title, url: fullUrl, hostname: hostname || 'N/A', description: description || 'N/A' };
    };

    const toTitleCase = (str) => {
        /* ... Function remains the same ... */
        return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const processTopic = (text) => {
        /* ... Function remains the same ... */
        if (!text) return "Uncategorized";
        const originalTextTrimmedLower = text.trim().toLowerCase();
        const normalizationMap = { 'github.com': 'GitHub', 'github': 'GitHub', 'stackoverflow.com': 'Stack Overflow', 'stack overflow': 'Stack Overflow', 'stackoverflow': 'Stack Overflow', 'google docs': 'Google Docs', 'docs.google.com': 'Google Docs', 'google drive': 'Google Drive', 'drive.google.com': 'Google Drive', 'youtube.com': 'YouTube', 'youtube': 'YouTube', 'reddit.com': 'Reddit', 'reddit': 'Reddit', 'chatgpt': 'ChatGPT', 'openai.com': 'OpenAI', 'gmail': 'Gmail', 'mail.google.com': 'Gmail', 'aws': 'AWS', 'amazon web services': 'AWS', 'pinterest.com': 'Pinterest', 'pinterest': 'Pinterest', };
        if (normalizationMap[originalTextTrimmedLower]) {
            return normalizationMap[originalTextTrimmedLower];
        }
        let processedText = text.replace(/^(Category is|The category is|Topic:)\s*"?/i, '');
        processedText = processedText.replace(/^\s*[\d.\-*]+\s*/, '');
        let words = processedText.trim().split(/\s+/);
        let category = words.slice(0, 2).join(' ');
        category = category.replace(/["'*().:;]/g, '');
        return toTitleCase(category).substring(0, 40) || "Uncategorized";
    };

    const extractTitleKeywords = (title) => {
        /* ... Function remains the same ... */
        if (!title || typeof title !== 'string') {
            return new Set();
        }
        const cleanedTitle = title.toLowerCase().replace(/[-_]/g, ' ').replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
        const words = cleanedTitle.split(' ');
        const keywords = new Set();
        for (const word of words) {
            if (word.length >= CONFIG.minKeywordLength && !CONFIG.titleKeywordStopWords.has(word) && !/^\d+$/.test(word)) {
                keywords.add(word);
            }
        }
        return keywords;
    };

    const getNextGroupColorName = () => {
        /* ... Function remains the same ... */
        const colorName = CONFIG.groupColorNames[groupColorIndex % CONFIG.groupColorNames.length];
        groupColorIndex++;
        return colorName;
    };

    const findGroupElement = (topicName, workspaceId) => {
        /* ... Function remains the same ... */
        const sanitizedTopicName = topicName.trim();
        if (!sanitizedTopicName) return null;
        const safeSelectorTopicName = sanitizedTopicName.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        try {
            return document.querySelector(`tab-group[label="${safeSelectorTopicName}"][zen-workspace-id="${workspaceId}"]`);
        } catch (e) {
            console.error(`Error finding group selector: tab-group[label="${safeSelectorTopicName}"]...`, e);
            return null;
        }
    };
    // --- End Unchanged Helper Functions ---


    // --- AI Interaction --- (Keep unchanged) ---
    const askAIForMultipleTopics = async (tabs) => {
        /* ... Function remains the same ... */
        const validTabs = tabs.filter(tab => tab && tab.isConnected);
        if (!validTabs || validTabs.length === 0) {
            return [];
        }
        console.log(`Batch AI: Requesting categories for ${validTabs.length} tabs...`);
        validTabs.forEach(tab => tab.classList.add('tab-is-sorting'));
        const { ollama } = CONFIG.apiConfig;
        let apiUrl = ollama.endpoint;
        let headers = { 'Content-Type': 'application/json' };
        let result = [];
        try {
            if (!ollama.enabled) {
                throw new Error("Ollama API is not enabled in config.");
            }
            const tabDataArray = validTabs.map(getTabData);
            const formattedTabDataList = tabDataArray.map((data, index) => `${index + 1}.\nTitle: "${data.title}"\nURL: "${data.url}"\nDescription: "${data.description}"`).join('\n\n');
            const prompt = CONFIG.apiConfig.ollama.promptTemplateBatch.replace("{TAB_DATA_LIST}", formattedTabDataList);
            const requestBody = { model: ollama.model, prompt: prompt, stream: false, options: { temperature: 0.2, num_predict: validTabs.length * 15 } };
            const response = await fetch(apiUrl, { method: 'POST', headers: headers, body: JSON.stringify(requestBody) });
            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unknown API error reason');
                throw new Error(`API Error ${response.status}: ${errorText}`);
            }
            const data = await response.json();
            let aiText = data.response?.trim();
            if (!aiText) {
                throw new Error("Empty API response");
            }
            const lines = aiText.split('\n').map(line => line.trim()).filter(Boolean);
            if (lines.length !== validTabs.length) {
                console.warn(`Batch AI: Mismatch! Expected ${validTabs.length} topics, received ${lines.length}.`);
                if (validTabs.length === 1 && lines.length > 0) {
                    const firstLineTopic = processTopic(lines[0]);
                    console.warn(` -> Mismatch Correction: Using first line "${lines[0]}" -> Topic: "${firstLineTopic}"`);
                    result = [{ tab: validTabs[0], topic: firstLineTopic }];
                } else {
                    console.warn(` -> Fallback: Assigning "Uncategorized" to all ${validTabs.length} tabs.`);
                    result = validTabs.map(tab => ({ tab: tab, topic: "Uncategorized" }));
                }
            } else {
                const processedTopics = lines.map(processTopic);
                console.log("Batch AI: Processed Topics:", processedTopics);
                result = validTabs.map((tab, index) => ({ tab: tab, topic: processedTopics[index] }));
            }
            return result;
        } catch (error) {
            console.error(`Batch AI: Error getting topics:`, error);
            return validTabs.map(tab => ({ tab, topic: "Uncategorized" }));
        } finally {
            setTimeout(() => {
                validTabs.forEach(tab => tab.classList.remove('tab-is-sorting'));
            }, 200);
        }
    };
    // --- End AI Interaction ---


    // --- Main Sorting Function --- (Removed checkTabsVisibility call) ---
    const sortTabsByTopic = async () => {
        if (isSorting) {
            console.log("Sorting already in progress.");
            return;
        }
        isSorting = true;
        console.log("Starting tab sort (v4.8.1)...");

        try { /* ... All sorting logic remains exactly the same ... */
            const currentWorkspaceId = window.ZenWorkspaces?.activeWorkspace;
            if (!currentWorkspaceId) {
                console.error("Cannot get current workspace ID.");
                isSorting = false;
                return;
            }
            const initialTabsToSort = Array.from(gBrowser.tabs).filter(tab => tab.getAttribute('zen-workspace-id') === currentWorkspaceId && !tab.pinned && !tab.hasAttribute('zen-empty-tab') && !tab.closest('tab-group') && tab.isConnected);
            if (initialTabsToSort.length === 0) {
                console.log("No ungrouped, connected tabs to sort.");
                isSorting = false;
                return;
            }
            console.log(`Found ${initialTabsToSort.length} potentially sortable tabs.`);
            const preGroups = {};
            const handledTabs = new Set();
            const tabDataCache = new Map();
            const tabKeywordsCache = new Map();
            initialTabsToSort.forEach(tab => {
                const data = getTabData(tab);
                tabDataCache.set(tab, data);
                tabKeywordsCache.set(tab, data.title ? extractTitleKeywords(data.title) : new Set());
            });
            const keywordToTabsMap = new Map();
            initialTabsToSort.forEach(tab => {
                const keywords = tabKeywordsCache.get(tab);
                if (keywords) {
                    keywords.forEach(keyword => {
                        if (!keywordToTabsMap.has(keyword)) {
                            keywordToTabsMap.set(keyword, new Set());
                        }
                        keywordToTabsMap.get(keyword).add(tab);
                    });
                }
            });
            const potentialKeywordGroups = [];
            keywordToTabsMap.forEach((tabsSet, keyword) => {
                if (tabsSet.size >= CONFIG.preGroupingThreshold) {
                    potentialKeywordGroups.push({ keyword: keyword, tabs: tabsSet, size: tabsSet.size });
                }
            });
            potentialKeywordGroups.sort((a, b) => b.size - a.size);
            potentialKeywordGroups.forEach(({ keyword, tabs }) => {
                const finalTabsForGroup = new Set();
                tabs.forEach(tab => {
                    if (!handledTabs.has(tab)) {
                        finalTabsForGroup.add(tab);
                    }
                });
                if (finalTabsForGroup.size >= CONFIG.preGroupingThreshold) {
                    const categoryName = processTopic(keyword);
                    console.log(`   - Pre-Grouping by Title Keyword: "${keyword}" (Count: ${finalTabsForGroup.size}) -> Category: "${categoryName}"`);
                    preGroups[categoryName] = Array.from(finalTabsForGroup);
                    finalTabsForGroup.forEach(tab => handledTabs.add(tab));
                }
            });
            const hostnameCounts = {};
            initialTabsToSort.forEach(tab => {
                if (!handledTabs.has(tab)) {
                    const data = tabDataCache.get(tab);
                    if (data?.hostname && data.hostname !== 'N/A' && data.hostname !== 'Invalid URL' && data.hostname !== 'Internal Page') {
                        hostnameCounts[data.hostname] = (hostnameCounts[data.hostname] || 0) + 1;
                    }
                }
            });
            const sortedHostnames = Object.keys(hostnameCounts).sort((a, b) => hostnameCounts[b] - hostnameCounts[a]);
            for (const hostname of sortedHostnames) {
                if (hostnameCounts[hostname] >= CONFIG.preGroupingThreshold) {
                    const categoryName = processTopic(hostname);
                    if (preGroups[categoryName]) {
                        continue;
                    }
                    const tabsForHostnameGroup = [];
                    initialTabsToSort.forEach(tab => {
                        if (!handledTabs.has(tab)) {
                            const data = tabDataCache.get(tab);
                            if (data?.hostname === hostname) {
                                tabsForHostnameGroup.push(tab);
                            }
                        }
                    });
                    if (tabsForHostnameGroup.length >= CONFIG.preGroupingThreshold) {
                        console.log(`   - Pre-Grouping by Hostname: "${hostname}" (Count: ${tabsForHostnameGroup.length}) -> Category: "${categoryName}"`);
                        preGroups[categoryName] = tabsForHostnameGroup;
                        tabsForHostnameGroup.forEach(tab => handledTabs.add(tab));
                    }
                }
            }
            const tabsForAI = initialTabsToSort.filter(tab => !handledTabs.has(tab) && tab.isConnected);
            let aiTabTopics = [];
            if (tabsForAI.length > 0) {
                aiTabTopics = await askAIForMultipleTopics(tabsForAI);
            }
            const finalGroups = { ...preGroups };
            aiTabTopics.forEach(({ tab, topic }) => {
                if (!topic || topic === "Uncategorized" || !tab || !tab.isConnected) {
                    return;
                }
                if (!finalGroups[topic]) {
                    finalGroups[topic] = [];
                }
                finalGroups[topic].push(tab);
            });
            console.log(" -> Final groups identified:", Object.keys(finalGroups));
            if (Object.keys(finalGroups).length === 0) {
                console.log("No valid groups identified. Sorting finished.");
                isSorting = false;
                return;
            }
            const existingGroupElementsMap = new Map();
            document.querySelectorAll(`tab-group[zen-workspace-id="${currentWorkspaceId}"]`).forEach(groupEl => {
                const label = groupEl.getAttribute('label');
                if (label) existingGroupElementsMap.set(label, groupEl);
            });
            for (const topic in finalGroups) {
                const tabsForThisTopic = finalGroups[topic].filter(t => t && t.isConnected);
                if (tabsForThisTopic.length === 0) {
                    continue;
                }
                const existingGroupElement = existingGroupElementsMap.get(topic);
                if (existingGroupElement) {
                    console.log(` -> Moving ${tabsForThisTopic.length} tabs to existing group "${topic}".`);
                    try {
                        if (existingGroupElement.getAttribute("collapsed") === "true") existingGroupElement.setAttribute("collapsed", "false");
                        const groupLabelElement = existingGroupElement.querySelector('.tab-group-label');
                        if (groupLabelElement) groupLabelElement.setAttribute('aria-expanded', 'true');
                        for (const tab of tabsForThisTopic) {
                            if (!tab || !tab.isConnected) continue;
                            gBrowser.moveTabToGroup(tab, existingGroupElement);
                        }
                    } catch (e) {
                        console.error(`Error moving tabs to existing group "${topic}":`, e);
                    }
                } else {
                    console.log(` -> Creating new group "${topic}" with ${tabsForThisTopic.length} tabs.`);
                    const firstValidTabForGroup = tabsForThisTopic[0];
                    const groupOptions = { label: topic, color: getNextGroupColorName(), insertBefore: firstValidTabForGroup };
                    try {
                        gBrowser.addTabGroup(tabsForThisTopic, groupOptions);
                    } catch (e) {
                        console.error(`Error calling gBrowser.addTabGroup for topic "${topic}":`, e);
                        const groupAfterError = findGroupElement(topic, currentWorkspaceId);
                        if (groupAfterError) {
                            console.warn(` -> Group "${topic}" might exist despite error. Attempting recovery move.`);
                            try {
                                for (const tab of tabsForThisTopic)
                                    if (tab && tab.isConnected) gBrowser.moveTabToGroup(tab, groupAfterError);
                            } catch (moveError) {
                                console.error(` -> Failed recovery move for "${topic}":`, moveError);
                            }
                        }
                    }
                }
            }
            console.log("--- Tab sorting process complete ---");
        } catch (error) {
            console.error("Error during overall sorting process:", error);
        } finally {
            isSorting = false;
            setTimeout(() => {
                Array.from(gBrowser.tabs).forEach(tab => tab.classList.remove('tab-is-sorting'));
                // REMOVED: setTimeout(checkTabsVisibility, 150);
            }, 500);
        }
    };
    // --- End Sorting Function ---


    // --- Clear Tabs Functionality --- (Keep unchanged) ---
    const clearTabs = () => {
        /* ... Function remains the same ... */
        console.log("Clearing tabs...");
        let closedCount = 0;
        try {
            const currentWorkspaceId = window.ZenWorkspaces?.activeWorkspace;
            if (!currentWorkspaceId) {
                console.error("CLEAR BTN: Cannot get current workspace ID.");
                return;
            }
            const tabsToClose = [];
            for (const tab of gBrowser.tabs) {
                const isSameWorkSpace = tab.getAttribute('zen-workspace-id') === currentWorkspaceId;
                const isInGroup = !!tab.closest('tab-group');
                const isEmptyZenTab = tab.hasAttribute("zen-empty-tab");
                if (isSameWorkSpace && !tab.selected && !tab.pinned && !isInGroup && !isEmptyZenTab && tab.isConnected) {
                    tabsToClose.push(tab);
                }
            }
            if (tabsToClose.length === 0) {
                console.log("CLEAR BTN: No tabs found to clear.");
                return;
            }
            console.log(`CLEAR BTN: Closing ${tabsToClose.length} tabs.`);
            tabsToClose.forEach(tab => {
                tab.classList.add('tab-closing');
                closedCount++;
                setTimeout(() => {
                    if (tab && tab.isConnected) {
                        gBrowser.removeTab(tab, { animate: false, skipSessionStore: false, closeWindowWithLastTab: false, });
                    }
                }, 500);
            });
        } catch (error) {
            console.error("CLEAR BTN: Error during tab clearing:", error);
        } finally {
            console.log(`CLEAR BTN: Initiated closing for ${closedCount} tabs.`);
        }
    };

    // --- REMOVED checkTabsVisibility Function ---
    // const checkTabsVisibility = () => { ... };


    // --- Button Initialization & Workspace Handling --- (Keep ensureButtonsExist, addButtonsToAllSeparators, setupCommandsAndListener unchanged) ---

    function ensureButtonsExist(separator) {
        /* ... Function remains the same ... */
        if (!separator) return;
        if (!separator.querySelector('#sort-button')) {
            try {
                const bf = window.MozXULElement.parseXULToFragment(`<toolbarbutton id="sort-button" command="cmd_zenSortTabs" label="⇄ Sort" tooltiptext="Sort Tabs into Groups by Topic (AI)"/>`);
                separator.appendChild(bf.firstChild.cloneNode(true));
                console.log("BUTTONS: Sort button added to separator.");
            } catch (e) {
                console.error("BUTTONS: Error creating/appending sort button:", e);
            }
        }
        if (!separator.querySelector('#clear-button')) {
            try {
                const bf = window.MozXULElement.parseXULToFragment(`<toolbarbutton id="clear-button" command="cmd_zenClearTabs" label="↓ Clear" tooltiptext="Close ungrouped, non-pinned tabs"/>`);
                separator.appendChild(bf.firstChild.cloneNode(true));
                console.log("BUTTONS: Clear button added to separator.");
            } catch (e) {
                console.error("BUTTONS: Error creating/appending clear button:", e);
            }
        }
    }

    function addButtonsToAllSeparators() {
        /* ... Function remains the same ... */
        const separators = document.querySelectorAll(".vertical-pinned-tabs-container-separator");
        if (separators.length > 0) {
            separators.forEach(ensureButtonsExist);
        } else {
            const periphery = document.querySelector('#tabbrowser-arrowscrollbox-periphery');
            if (periphery && !periphery.querySelector('#sort-button') && !periphery.querySelector('#clear-button')) {
                console.warn("BUTTONS: No separators found, attempting fallback append to periphery.");
                ensureButtonsExist(periphery);
            } else if (!periphery) {
                console.error("BUTTONS: No separators or fallback periphery container found.");
            }
        }
    }

    function setupCommandsAndListener() {
        /* ... Function remains the same ... */
        const zenCommands = document.querySelector("commandset#zenCommandSet");
        if (!zenCommands) {
            console.error("BUTTONS INIT: Could not find 'commandset#zenCommandSet'.");
            return;
        }
        if (!zenCommands.querySelector("#cmd_zenSortTabs")) {
            try {
                const cmd = window.MozXULElement.parseXULToFragment(`<command id="cmd_zenSortTabs"/>`).firstChild;
                zenCommands.appendChild(cmd);
                console.log("BUTTONS INIT: Command 'cmd_zenSortTabs' added.");
            } catch (e) {
                console.error("BUTTONS INIT: Error adding command 'cmd_zenSortTabs':", e);
            }
        }
        if (!zenCommands.querySelector("#cmd_zenClearTabs")) {
            try {
                const cmd = window.MozXULElement.parseXULToFragment(`<command id="cmd_zenClearTabs"/>`).firstChild;
                zenCommands.appendChild(cmd);
                console.log("BUTTONS INIT: Command 'cmd_zenClearTabs' added.");
            } catch (e) {
                console.error("BUTTONS INIT: Error adding command 'cmd_zenClearTabs':", e);
            }
        }
        if (!commandListenerAdded) {
            try {
                zenCommands.addEventListener('command', (event) => {
                    if (event.target.id === "cmd_zenSortTabs") {
                        sortTabsByTopic();
                    } else if (event.target.id === "cmd_zenClearTabs") {
                        clearTabs();
                    }
                });
                commandListenerAdded = true;
                console.log("BUTTONS INIT: Command listener added for Sort and Clear.");
            } catch (e) {
                console.error("BUTTONS INIT: Error adding command listener:", e);
            }
        }
    }

    // --- ZenWorkspaces Hooks --- (Removed checkTabsVisibility calls) ---
    function setupZenWorkspaceHooks() {
        if (typeof ZenWorkspaces === 'undefined' || typeof ZenWorkspaces.originalHooks !== 'undefined') {
            console.warn("BUTTONS: ZenWorkspaces object not found or hooks already applied. Skipping hook setup.");
            return;
        }
        ZenWorkspaces.originalHooks = {
            onTabBrowserInserted: ZenWorkspaces.onTabBrowserInserted,
            updateTabsContainers: ZenWorkspaces.updateTabsContainers,
        };

        ZenWorkspaces.onTabBrowserInserted = function(event) {
            if (typeof ZenWorkspaces.originalHooks.onTabBrowserInserted === 'function') {
                try {
                    ZenWorkspaces.originalHooks.onTabBrowserInserted.call(ZenWorkspaces, event);
                } catch (e) {
                    console.error("BUTTONS HOOK: Error in original onTabBrowserInserted:", e);
                }
            }
            addButtonsToAllSeparators(); // Ensure buttons are present
            // REMOVED: setTimeout(checkTabsVisibility, 150);
        };

        ZenWorkspaces.updateTabsContainers = function(...args) {
            if (typeof ZenWorkspaces.originalHooks.updateTabsContainers === 'function') {
                try {
                    ZenWorkspaces.originalHooks.updateTabsContainers.apply(ZenWorkspaces, args);
                } catch (e) {
                    console.error("BUTTONS HOOK: Error in original updateTabsContainers:", e);
                }
            }
            addButtonsToAllSeparators(); // Ensure buttons are present
            // REMOVED: setTimeout(checkTabsVisibility, 150);
        };

        console.log("BUTTONS HOOK: ZenWorkspaces hooks applied.");
    }


    // --- Initial Setup Trigger --- (Removed checkTabsVisibility call) ---
    function initializeScript() {
        console.log("INIT: Sort & Clear Tabs Script (v4.8.1) loading...");
        let checkCount = 0;
        const maxChecks = 30;
        const checkInterval = 1000;

        const initCheckInterval = setInterval(() => {
            checkCount++;
            const separatorExists = !!document.querySelector(".vertical-pinned-tabs-container-separator");
            const commandSetExists = !!document.querySelector("commandset#zenCommandSet");
            const gBrowserReady = typeof gBrowser !== 'undefined' && gBrowser.tabContainer;
            const zenWorkspacesReady = typeof ZenWorkspaces !== 'undefined' && typeof ZenWorkspaces.activeWorkspace !== 'undefined';
            const ready = gBrowserReady && commandSetExists && separatorExists && zenWorkspacesReady;

            if (ready) {
                console.log(`INIT: Required elements found after ${checkCount} checks. Initializing...`);
                clearInterval(initCheckInterval);
                setTimeout(() => {
                    try {
                        injectStyles();
                        setupCommandsAndListener();
                        addButtonsToAllSeparators();
                        setupZenWorkspaceHooks();
                        // REMOVED: checkTabsVisibility(); // No initial check needed
                        console.log("INIT: Sort & Clear Button setup and hooks complete.");
                    } catch (e) {
                        console.error("INIT: Error during deferred initial setup:", e);
                    }
                }, 500);
            } else if (checkCount > maxChecks) {
                clearInterval(initCheckInterval);
                console.error(`INIT: Failed to find required elements after ${maxChecks} checks. Status:`, { gBrowserReady, commandSetExists, separatorExists, zenWorkspacesReady });
                if (!zenWorkspacesReady) console.error(" -> ZenWorkspaces might not be fully initialized yet (activeWorkspace missing?).");
                if (!separatorExists) console.error(" -> Separator element '.vertical-pinned-tabs-container-separator' not found.");
            }
        }, checkInterval);
    }

    // --- Start Initialization ---
    if (document.readyState === "complete") {
        initializeScript();
    } else {
        window.addEventListener("load", initializeScript, { once: true });
    }

})(); // End script