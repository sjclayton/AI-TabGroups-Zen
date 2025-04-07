// FINAL VERSION 4.7 (Restructured Code + AI Mismatch First Line Fix + Title>Host)
(() => {
    // --- Configuration ---
    const CONFIG = {
        apiConfig: {
            ollama: {
                endpoint: 'http://localhost:11434/api/generate',
                enabled: true,
                model: 'llama3.1:latest', // <<<--- MAKE SURE this model exists in `ollama list`
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
                /* ... */
            }
        },
        groupColors: [
            "var(--tab-group-color-blue)", "var(--tab-group-color-red)", "var(--tab-group-color-yellow)",
            "var(--tab-group-color-green)", "var(--tab-group-color-pink)", "var(--tab-group-color-purple)",
            "var(--tab-group-color-orange)", "var(--tab-group-color-cyan)", "var(--tab-group-color-gray)"
        ],
        groupColorNames: [
            "blue", "red", "yellow", "green", "pink", "purple", "orange", "cyan", "gray"
        ],
        preGroupingThreshold: 2, // Min tabs for hostname or title keyword group
        titleKeywordStopWords: new Set([
            'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'of',
            'is', 'am', 'are', 'was', 'were', 'be', 'being', 'been', 'has', 'have', 'had', 'do', 'does', 'did',
            'how', 'what', 'when', 'where', 'why', 'which', 'who', 'whom', 'whose',
            'new', 'tab', 'untitled', 'page', 'home', 'com', 'org', 'net', 'io', 'dev', 'app',
            'get', 'set', 'list', 'view', 'edit', 'create', 'update', 'delete',
            'my', 'your', 'his', 'her', 'its', 'our', 'their', 'me', 'you', 'him', 'her', 'it', 'us', 'them',
            'about', 'search', 'results', 'posts', 'index', 'dashboard', 'profile', 'settings',
            'official', 'documentation', 'docs', 'wiki', 'help', 'support', 'faq', 'guide',
            'error', 'login', 'signin', 'sign', 'up', 'out', 'welcome', 'loading',
            // Add more common/noisy words specific to your browsing habits if needed
        ]),
        minKeywordLength: 3, // Minimum length for a word to be considered a keyword
        styles: `
            #sort-button {
                opacity: 0;
                transition: opacity 0.1s ease-in-out;
                position: absolute;
                right: 65px;
                font-size: 12px;
                width: 60px;
                pointer-events: auto;
                align-self: end;
                appearance: none;
                margin-top: -8px;
                padding: 1px;
                color: gray;
            }
            #sort-button label {
                display: block;
            }
            #sort-button:hover {
                opacity: 1;
                color: white;
                border-radius: 4px;
            }
            .vertical-pinned-tabs-container-separator:has(#clear-button):has(#sort-button):hover {
                 width: calc(100% - 125px);
                 margin-right: auto;
            }
            .vertical-pinned-tabs-container-separator:not(:has(#clear-button)):has(#sort-button):hover {
                 width: calc(100% - 65px);
                 margin-right: auto;
            }
            .vertical-pinned-tabs-container-separator:not(:has(#sort-button)):hover {
                  width: calc(100% - 65px);
                  margin-right: auto;
            }
            .vertical-pinned-tabs-container-separator {
                 display: flex;
                 flex-direction: column;
                 margin-left: 0;
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
    let sortButtonListenerAdded = false;

    // --- Helper Functions ---

    const injectStyles = () => {
        if (document.getElementById('tab-sort-styles')) {
            return;
        }
        const style = Object.assign(document.createElement('style'), {
            id: 'tab-sort-styles',
            textContent: CONFIG.styles
        });
        document.head.appendChild(style);
        console.log("SORT BTN: Styles injected.");
    };

    const getTabData = (tab) => {
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
                    // console.warn(`Error parsing URL for tab: ${originalTitle}`, e); // Keep this potentially noisy log commented unless debugging URL issues
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
                    } catch { /* ignore */ }
                }
            } else { title = originalTitle.trim(); }
            title = title || 'Untitled Page';
            try {
                if (browser && browser.contentDocument) {
                    const metaDescElement = browser.contentDocument.querySelector('meta[name="description"]');
                    if (metaDescElement) {
                        description = metaDescElement.getAttribute('content')?.trim() || '';
                        description = description.substring(0, 200);
                    }
                }
            } catch (contentError) { /* ignore permission errors */ }
        } catch (e) {
            console.error('Error getting tab data for tab:', tab, e);
            title = 'Error Processing Tab';
        }
        return { title: title, url: fullUrl, hostname: hostname || 'N/A', description: description || 'N/A' };
    };

    const toTitleCase = (str) => {
        return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const processTopic = (text) => {
        if (!text) return "Uncategorized";
        const originalTextTrimmedLower = text.trim().toLowerCase();
        // Normalization map helps create consistent group names for common sites/topics
        const normalizationMap = {
            'github.com': 'GitHub', 'github': 'GitHub', 'stackoverflow.com': 'Stack Overflow',
            'stack overflow': 'Stack Overflow', 'stackoverflow': 'Stack Overflow',
            'google docs': 'Google Docs', 'docs.google.com': 'Google Docs',
            'google drive': 'Google Drive', 'drive.google.com': 'Google Drive',
            'youtube.com': 'YouTube', 'youtube': 'YouTube', 'reddit.com': 'Reddit', 'reddit': 'Reddit',
            'chatgpt': 'ChatGPT', 'openai.com': 'OpenAI', 'gmail': 'Gmail', 'mail.google.com': 'Gmail',
            'aws': 'AWS', 'amazon web services': 'AWS', 'pinterest.com': 'Pinterest', 'pinterest': 'Pinterest',
            // Add more hostnames and common phrases you want normalized
        };
        if (normalizationMap[originalTextTrimmedLower]) {
            return normalizationMap[originalTextTrimmedLower];
        }
        // Basic cleanup and extraction if no direct normalization match
        let processedText = text.replace(/^(Category is|The category is|Topic:)\s*"?/i, '');
        processedText = processedText.replace(/^\s*[\d.\-*]+\s*/, '');
        let words = processedText.trim().split(/\s+/);
        let category = words.slice(0, 2).join(' ');
        category = category.replace(/["'*().:;]/g, ''); // Remove more punctuation
        return toTitleCase(category).substring(0, 40) || "Uncategorized"; // Ensure Title Case and limit length
    };

    const extractTitleKeywords = (title) => {
        if (!title || typeof title !== 'string') {
            return new Set();
        }
        const cleanedTitle = title.toLowerCase()
            .replace(/[-_]/g, ' ') // Treat dash/underscore as space
            .replace(/[^\w\s]/g, '') // Remove punctuation
            .replace(/\s+/g, ' ').trim(); // Normalize spaces
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
        const colorName = CONFIG.groupColorNames[groupColorIndex % CONFIG.groupColorNames.length];
        groupColorIndex++;
        return colorName;
    };

    const findGroupElement = (topicName, workspaceId) => {
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

    // --- AI Interaction ---
    const askAIForMultipleTopics = async (tabs) => {
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
            const formattedTabDataList = tabDataArray.map((data, index) => {
                return `${index + 1}.\nTitle: "${data.title}"\nURL: "${data.url}"\nDescription: "${data.description}"`;
            }).join('\n\n');

            const prompt = CONFIG.apiConfig.ollama.promptTemplateBatch.replace("{TAB_DATA_LIST}", formattedTabDataList);
            const requestBody = {
                model: ollama.model,
                prompt: prompt,
                stream: false,
                options: {
                    temperature: 0.2,
                    num_predict: validTabs.length * 15 // Max tokens buffer
                }
            };

            // console.log(`Batch AI: Sending request (model: ${requestBody.model})...`); // Less verbose log

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unknown API error reason');
                throw new Error(`API Error ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            let aiText = data.response?.trim();
            // console.log(`Batch AI: Raw Response (first 100 chars): "${aiText?.substring(0, 100)}..."`); // Reduced verbosity

            if (!aiText) {
                throw new Error("Empty API response");
            }

            const lines = aiText.split('\n').map(line => line.trim()).filter(Boolean);

            // Handle potential mismatch between requested tabs and received category lines
            if (lines.length !== validTabs.length) {
                console.warn(`Batch AI: Mismatch! Expected ${validTabs.length} topics, received ${lines.length}.`);
                if (validTabs.length === 1 && lines.length > 0) {
                    // Special case: Sent 1 tab, got >1 lines. Trust the first line.
                    const firstLineTopic = processTopic(lines[0]);
                    console.warn(` -> Mismatch Correction: Using first line "${lines[0]}" -> Processed Topic: "${firstLineTopic}" for the single tab.`);
                    result = [{ tab: validTabs[0], topic: firstLineTopic }];
                } else {
                    // Fallback to "Uncategorized" for all tabs in other mismatch cases
                    console.warn(` -> Fallback: Assigning "Uncategorized" to all ${validTabs.length} tabs.`);
                    result = validTabs.map(tab => ({ tab: tab, topic: "Uncategorized" }));
                }
            } else {
                // Normal processing (No Mismatch)
                const processedTopics = lines.map(processTopic);
                console.log("Batch AI: Processed & Normalized Topics:", processedTopics);
                result = validTabs.map((tab, index) => ({
                    tab: tab,
                    topic: processedTopics[index] // processTopic handles Uncategorized fallback
                }));
            }

            return result;

        } catch (error) {
            console.error(`Batch AI: Error getting topics:`, error);
            // Return "Uncategorized" for all tabs in case of any error
            return validTabs.map(tab => ({ tab, topic: "Uncategorized" }));
        } finally {
            // Remove loading visual after a short delay
            setTimeout(() => {
                validTabs.forEach(tab => tab.classList.remove('tab-is-sorting'));
            }, 200);
        }
    };


    // --- Main Sorting Function ---
    const sortTabsByTopic = async () => {
        if (isSorting) {
            console.log("Sorting already in progress.");
            return;
        }
        isSorting = true;
        console.log("Starting tab sort (v4.7)...");

        try {
            const currentWorkspaceId = window.ZenWorkspaces?.activeWorkspace;
            if (!currentWorkspaceId) {
                console.error("Cannot get current workspace ID.");
                isSorting = false; return;
            }
            // console.log(`Sorting tabs for Workspace ID: ${currentWorkspaceId}`);

            const initialTabsToSort = Array.from(gBrowser.tabs).filter(tab =>
                tab.getAttribute('zen-workspace-id') === currentWorkspaceId &&
                !tab.pinned && !tab.hasAttribute('zen-empty-tab') && !tab.closest('tab-group') && tab.isConnected
            );

            if (initialTabsToSort.length === 0) {
                console.log("No ungrouped, connected tabs to sort.");
                isSorting = false; return;
            }
            console.log(`Found ${initialTabsToSort.length} potentially sortable tabs.`);

            // --- Phase 1: Pre-grouping ---
            // console.log("--- Phase 1: Pre-grouping ---");
            const preGroups = {};
            const handledTabs = new Set();
            const tabDataCache = new Map();
            const tabKeywordsCache = new Map();

            initialTabsToSort.forEach(tab => {
                const data = getTabData(tab);
                tabDataCache.set(tab, data);
                tabKeywordsCache.set(tab, data.title ? extractTitleKeywords(data.title) : new Set());
            });

            // Group by Title Keywords (High Priority)
            // console.log(" -> Strategy 1: Grouping by Title Keywords...");
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
            potentialKeywordGroups.sort((a, b) => b.size - a.size); // Process largest groups first
            // console.log(`   - Found ${potentialKeywordGroups.length} potential keyword groups meeting threshold.`);

            potentialKeywordGroups.forEach(({ keyword, tabs }) => {
                const finalTabsForGroup = new Set();
                tabs.forEach(tab => {
                    if (!handledTabs.has(tab)) { finalTabsForGroup.add(tab); }
                });
                if (finalTabsForGroup.size >= CONFIG.preGroupingThreshold) {
                    const categoryName = processTopic(keyword);
                    console.log(`   - Pre-Grouping by Title Keyword: "${keyword}" (Count: ${finalTabsForGroup.size}) -> Category: "${categoryName}"`);
                    preGroups[categoryName] = Array.from(finalTabsForGroup);
                    finalTabsForGroup.forEach(tab => handledTabs.add(tab));
                }
            });
            // console.log(` -> Title Keyword grouping done. ${handledTabs.size} tabs handled.`);

            // Group by Hostname (Lower Priority, only if name not already used)
            // console.log(" -> Strategy 2: Grouping by Hostname...");
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
                         // console.log(`   - Skipping Hostname group "${categoryName}" (from "${hostname}") as name already used by keyword group.`);
                         continue; // Avoid overwriting a potentially more specific keyword group
                     }
                    const tabsForHostnameGroup = [];
                    initialTabsToSort.forEach(tab => {
                        if (!handledTabs.has(tab)) {
                             const data = tabDataCache.get(tab);
                             if (data?.hostname === hostname) { tabsForHostnameGroup.push(tab); }
                         }
                    });
                    // Double-check threshold after filtering already handled tabs
                    if(tabsForHostnameGroup.length >= CONFIG.preGroupingThreshold) {
                        console.log(`   - Pre-Grouping by Hostname: "${hostname}" (Count: ${tabsForHostnameGroup.length}) -> Category: "${categoryName}"`);
                        preGroups[categoryName] = tabsForHostnameGroup;
                        tabsForHostnameGroup.forEach(tab => handledTabs.add(tab));
                    }
                }
            }
            // console.log(` -> Phase 1 complete. ${handledTabs.size} total tabs pre-grouped. ${Object.keys(preGroups).length} pre-groups identified.`);

            // --- Phase 2: AI Processing for Remaining Tabs ---
            // console.log("--- Phase 2: AI Processing ---");
            const tabsForAI = initialTabsToSort.filter(tab => !handledTabs.has(tab) && tab.isConnected);
            let aiTabTopics = [];
            if (tabsForAI.length > 0) {
                // console.log(` -> Sending ${tabsForAI.length} remaining tabs to AI...`);
                aiTabTopics = await askAIForMultipleTopics(tabsForAI);
                // console.log(` -> AI processing returned ${aiTabTopics.length} results.`);
            } else {
                // console.log(" -> No tabs remaining for AI processing.");
            }

            // --- Phase 3: Final Grouping (Combine & Apply) ---
            // console.log("--- Phase 3: Final Grouping ---");
            const finalGroups = { ...preGroups }; // Start with pre-grouped tabs

            aiTabTopics.forEach(({ tab, topic }) => {
                 // Skip "Uncategorized" or invalid/disconnected tabs
                 if (!topic || topic === "Uncategorized" || !tab || !tab.isConnected) {
                      if (topic === "Uncategorized") {
                           const tabInfo = tabDataCache.get(tab) || getTabData(tab);
                           // console.log(` -> Skipping AI result for tab "${tabInfo.title}" (Topic: Uncategorized)`);
                      }
                      return;
                 }
                 if (!finalGroups[topic]) {
                     finalGroups[topic] = [];
                 }
                  // console.log(` -> Adding AI result: Tab "${(tabDataCache.get(tab) || getTabData(tab)).title}" to group "${topic}".`);
                 finalGroups[topic].push(tab);
             });

            console.log(" -> Final groups identified:", Object.keys(finalGroups));
            if (Object.keys(finalGroups).length === 0) {
                console.log("No valid groups identified. Sorting finished.");
                isSorting = false; return;
            }

            // Cache existing groups for faster lookup
            const existingGroupElementsMap = new Map();
            document.querySelectorAll(`tab-group[zen-workspace-id="${currentWorkspaceId}"]`).forEach(groupEl => {
                const label = groupEl.getAttribute('label');
                if (label) existingGroupElementsMap.set(label, groupEl);
            });
            // console.log(` -> Found ${existingGroupElementsMap.size} existing groups in workspace.`);

            // Process final groups: Move to existing or create new
            for (const topic in finalGroups) {
                const tabsForThisTopic = finalGroups[topic].filter(t => t && t.isConnected); // Final connectivity check
                if (tabsForThisTopic.length === 0) {
                    // console.log(` -> Skipping group "${topic}" as tabs disconnected.`);
                    continue;
                }

                const existingGroupElement = existingGroupElementsMap.get(topic);
                if (existingGroupElement) {
                    // Move tabs to existing group
                    console.log(` -> Moving ${tabsForThisTopic.length} tabs to existing group "${topic}".`);
                    try {
                        // Ensure group is expanded visually
                        if (existingGroupElement.getAttribute("collapsed") === "true") existingGroupElement.setAttribute("collapsed", "false");
                        const groupLabelElement = existingGroupElement.querySelector('.tab-group-label');
                        if (groupLabelElement) groupLabelElement.setAttribute('aria-expanded', 'true');

                        for (const tab of tabsForThisTopic) {
                            if (!tab || !tab.isConnected) continue;
                            // const tabInfo = tabDataCache.get(tab) || getTabData(tab); // Removed verbose inner loop log
                            // console.log(`   -> Moving tab: "${tabInfo.title}"`);
                            gBrowser.moveTabToGroup(tab, existingGroupElement);
                        }
                        // console.log(` -> Finished moving tabs to existing group "${topic}".`);
                    } catch (e) { console.error(`Error moving tabs to existing group "${topic}":`, e); }
                } else {
                    // Create a new group
                    console.log(` -> Creating new group "${topic}" with ${tabsForThisTopic.length} tabs.`);
                    const firstValidTabForGroup = tabsForThisTopic[0];
                    const groupOptions = { label: topic, color: getNextGroupColorName(), insertBefore: firstValidTabForGroup };
                    try {
                        const insertBeforeTabInfo = tabDataCache.get(groupOptions.insertBefore) || getTabData(groupOptions.insertBefore);
                        // console.log(` -> Calling gBrowser.addTabGroup (Label: "${groupOptions.label}", Color: ${groupOptions.color}, Before: "${insertBeforeTabInfo.title}")`);
                        gBrowser.addTabGroup(tabsForThisTopic, groupOptions);
                        // console.log(` -> Call to addTabGroup for "${topic}" completed.`);
                    } catch (e) {
                        console.error(`Error calling gBrowser.addTabGroup for topic "${topic}":`, e);
                        // Attempt recovery: Check if group exists despite error, then move individually
                        const groupAfterError = findGroupElement(topic, currentWorkspaceId);
                        if (groupAfterError) {
                            console.warn(` -> Group "${topic}" might exist despite error. Attempting recovery move.`);
                            try {
                                for (const tab of tabsForThisTopic) if (tab && tab.isConnected) gBrowser.moveTabToGroup(tab, groupAfterError);
                            } catch (moveError) { console.error(` -> Failed recovery move for "${topic}":`, moveError); }
                        }
                    }
                }
            }
            console.log("--- Tab sorting process complete ---");

        } catch (error) {
            console.error("Error during overall sorting process:", error);
        } finally {
            isSorting = false;
            // Clean up any remaining loading indicators just in case
            setTimeout(() => {
                Array.from(gBrowser.tabs).forEach(tab => tab.classList.remove('tab-is-sorting'));
                // console.log("Cleaned up loading indicators.");
            }, 500);
        }
    };

    // --- Button Initialization & Workspace Handling ---

    function ensureSortButtonExists(separator) {
        if (!separator || separator.querySelector('#sort-button')) {
            return; // Already exists or invalid separator
        }
        // console.log("SORT BTN: Creating and appending button..."); // Less verbose
        try {
            const buttonFragment = window.MozXULElement.parseXULToFragment(`
                <toolbarbutton
                    id="sort-button"
                    command="cmd_zenSortTabs"
                    label="⇄ Sort"
                    tooltiptext="Sort Tabs into Groups by Topic (AI)">
                </toolbarbutton>
            `);
            separator.appendChild(buttonFragment.firstChild.cloneNode(true));
            // console.log("SORT BTN: Button successfully appended."); // Less verbose
        } catch (e) {
            console.error("SORT BTN: Error creating/appending button:", e);
        }
    }

    function addSortButtonToAllSeparators() {
        const separators = document.querySelectorAll(".vertical-pinned-tabs-container-separator");
        if (separators.length > 0) {
            separators.forEach(ensureSortButtonExists);
        } else {
            // Fallback only if no separators found
            const periphery = document.querySelector('#tabbrowser-arrowscrollbox-periphery');
            if (periphery && !periphery.querySelector('#sort-button')) {
                console.warn("SORT BTN: No separators found, attempting fallback append to periphery.");
                ensureSortButtonExists(periphery);
            } else if (!periphery) {
                console.error("SORT BTN: No separators or fallback periphery container found.");
            }
        }
    }

    function setupSortCommandAndListener() {
        const zenCommands = document.querySelector("commandset#zenCommandSet");
        if (!zenCommands) {
            console.error("SORT BTN INIT: Could not find 'commandset#zenCommandSet'.");
            return;
        }

        // Add Command definition if missing
        if (!zenCommands.querySelector("#cmd_zenSortTabs")) {
            try {
                const command = window.MozXULElement.parseXULToFragment(`<command id="cmd_zenSortTabs"/>`).firstChild;
                zenCommands.appendChild(command);
                console.log("SORT BTN INIT: Command 'cmd_zenSortTabs' added.");
            } catch (e) {
                console.error("SORT BTN INIT: Error adding command 'cmd_zenSortTabs':", e);
            }
        }

        // Add the event listener only once
        if (!sortButtonListenerAdded) {
            try {
                zenCommands.addEventListener('command', (event) => {
                    if (event.target.id === "cmd_zenSortTabs") {
                        // console.log("EVENT: 'cmd_zenSortTabs' command triggered."); // Less verbose
                        sortTabsByTopic();
                    }
                });
                sortButtonListenerAdded = true;
                console.log("SORT BTN INIT: Command listener added.");
            } catch (e) {
                console.error("SORT BTN INIT: Error adding command listener:", e);
            }
        }
    }

    // --- ZenWorkspaces Hooks ---
    function setupZenWorkspaceHooks() {
        if (typeof ZenWorkspaces === 'undefined') {
             console.warn("SORT BTN: ZenWorkspaces object not found. Hooks not applied.");
             return;
        }

        // console.log("SORT BTN: Hooking into ZenWorkspaces events."); // Less verbose

        const originalOnTabBrowserInserted = ZenWorkspaces.onTabBrowserInserted;
        const originalUpdateTabsContainers = ZenWorkspaces.updateTabsContainers;

        ZenWorkspaces.onTabBrowserInserted = function(event) {
            if (typeof originalOnTabBrowserInserted === 'function') {
                try {
                    originalOnTabBrowserInserted.call(ZenWorkspaces, event);
                } catch (e) {
                     console.error("SORT BTN HOOK: Error in original onTabBrowserInserted:", e);
                }
            }
            addSortButtonToAllSeparators(); // Ensure button exists after potential UI changes
        };

        ZenWorkspaces.updateTabsContainers = function(...args) {
            if (typeof originalUpdateTabsContainers === 'function') {
                 try {
                    originalUpdateTabsContainers.apply(ZenWorkspaces, args);
                 } catch (e) {
                      console.error("SORT BTN HOOK: Error in original updateTabsContainers:", e);
                 }
            }
            addSortButtonToAllSeparators(); // Ensure button exists after potential UI changes
        };
    }


    // --- Initial Setup Trigger ---
    function initializeScript() {
        console.log("INIT: Sort Tabs Script (v4.7) loading...");
        let checkCount = 0;
        const maxChecks = 30;
        const checkInterval = 1000;

        const initCheckInterval = setInterval(() => {
            checkCount++;

            const separatorExists = !!document.querySelector(".vertical-pinned-tabs-container-separator");
            const commandSetExists = !!document.querySelector("commandset#zenCommandSet");
            const gBrowserReady = typeof gBrowser !== 'undefined' && gBrowser.tabContainer;
            const zenWorkspacesReady = typeof ZenWorkspaces !== 'undefined';

            const ready = gBrowserReady && commandSetExists && separatorExists && zenWorkspacesReady;

            if (ready) {
                console.log(`INIT: Required elements found after ${checkCount} checks. Initializing...`);
                clearInterval(initCheckInterval);

                // Defer slightly to ensure UI is fully settled
                setTimeout(() => {
                    try {
                        injectStyles();
                        setupSortCommandAndListener();
                        addSortButtonToAllSeparators(); // Initial button placement
                        setupZenWorkspaceHooks();       // Set up hooks for dynamic updates
                        console.log("INIT: Sort Button setup and hooks complete.");
                    } catch (e) {
                        console.error("INIT: Error during deferred initial setup:", e);
                    }
                }, 500);

            } else if (checkCount > maxChecks) {
                clearInterval(initCheckInterval);
                console.error(`INIT: Failed to find required elements after ${maxChecks} checks. Sort button/hooks may not initialize correctly. Status:`, {
                    gBrowserReady, commandSetExists, separatorExists, zenWorkspacesReady
                });
            }
        }, checkInterval);
    }

    // --- Start Initialization ---
    if (document.readyState === "complete") {
        initializeScript();
    } else {
        window.addEventListener("load", initializeScript, { once: true });
    }

})();