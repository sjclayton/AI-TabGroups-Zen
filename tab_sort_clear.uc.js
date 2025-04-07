// FINAL VERSION 4.8.2 (Consolidate Similar Categories)
(() => {
    // --- Configuration ---
    const CONFIG = {
        apiConfig: {
            ollama: {
                endpoint: 'http://localhost:11434/api/generate',
                enabled: true,
                model: 'llama3.1:latest', // Or your preferred model
                // v4.8.2 - Strengthened prompt emphasizing exact matches
                promptTemplateBatch: `Analyze the following numbered list of tab data (Title, URL, Description) and assign a concise category (1-2 words, Title Case) for EACH tab.

                    Existing Categories (Use these EXACT names if a tab fits):
                    {EXISTING_CATEGORIES_LIST}

                    ---
                    Instructions for Assignment:
                    1.  **Prioritize Existing:** For each tab below, determine if it clearly belongs to one of the 'Existing Categories'. Base this primarily on the URL/Domain, then Title/Description. If it fits, you MUST use the EXACT category name provided in the 'Existing Categories' list. DO NOT create a minor variation (e.g., if 'Project Docs' exists, use that, don't create 'Project Documentation').
                    2.  **Assign New Category (If Necessary):** Only if a tab DOES NOT fit an existing category, assign the best NEW concise category (1-2 words, Title Case).
                        *   PRIORITIZE the URL/Domain (e.g., 'GitHub', 'YouTube', 'StackOverflow').
                        *   Use Title/Description for specifics or generic domains.
                    3.  **Consistency is CRITICAL:** Use the EXACT SAME category name for all tabs belonging to the same logical group (whether assigned an existing or a new category). If multiple tabs point to 'google.com/search?q=recipes', categorize them consistently (e.g., 'Google Search' or 'Recipes', but use the same one for all).
                    4.  **Format:** 1-2 words, Title Case.

                    ---
                    Input Tab Data:
                    {TAB_DATA_LIST}

                    ---
                    Instructions for Output:
                    1. Output ONLY the category names.
                    2. Provide EXACTLY ONE category name per line.
                    3. The number of lines in your output MUST EXACTLY MATCH the number of tabs in the Input Tab Data list above.
                    4. DO NOT include numbering, explanations, apologies, or any markdown formatting.
                    5. Just the list of categories, separated by newlines.
                    ---

                    Output:`
                // Options are now set dynamically within askAIForMultipleTopics
            },
            customApi: {
                enabled: false,
                // ... (custom API config if needed)
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
        preGroupingThreshold: 2, // Min tabs to form a group based on keyword/hostname
        titleKeywordStopWords: new Set([
            'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'of',
            'is', 'am', 'are', 'was', 'were', 'be', 'being', 'been', 'has', 'have', 'had', 'do', 'does', 'did',
            'how', 'what', 'when', 'where', 'why', 'which', 'who', 'whom', 'whose',
            'new', 'tab', 'untitled', 'page', 'home', 'com', 'org', 'net', 'io', 'dev', 'app',
            'get', 'set', 'list', 'view', 'edit', 'create', 'update', 'delete',
            'my', 'your', 'his', 'her', 'its', 'our', 'their', 'me', 'you', 'him', 'her', 'it', 'us', 'them',
            'about', 'search', 'results', 'posts', 'index', 'dashboard', 'profile', 'settings',
            'official', 'documentation', 'docs', 'wiki', 'help', 'support', 'faq', 'guide',
            'error', 'login', 'signin', 'sign', 'up', 'out', 'welcome', 'loading', 'vs', 'using', 'code',
            'microsoft', 'google', 'apple', 'amazon', 'facebook', 'twitter' // Common generic company names
        ]),
        minKeywordLength: 3,
        consolidationDistanceThreshold: 2, // Max Levenshtein distance to merge categories (e.g., 2 allows "Browser" and "Browsesr")
        // --- Styles (v4.8.1 - Simplified hover rules) ---
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

        /* Tab Animations */
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

    const getTabData = (tab) => {
        if (!tab || !tab.isConnected) { return { title: 'Invalid Tab', url: '', hostname: '', description: '' }; }
        let title = 'Untitled Page'; let fullUrl = ''; let hostname = ''; let description = '';
        try {
            const originalTitle = tab.getAttribute('label') || tab.querySelector('.tab-label, .tab-text')?.textContent || '';
            const browser = tab.linkedBrowser || tab._linkedBrowser || gBrowser?.getBrowserForTab?.(tab);
            if (browser?.currentURI?.spec && !browser.currentURI.spec.startsWith('about:')) {
                try { const currentURL = new URL(browser.currentURI.spec); fullUrl = currentURL.href; hostname = currentURL.hostname.replace(/^www\./, ''); } catch (e) { hostname = 'Invalid URL'; fullUrl = browser?.currentURI?.spec || 'Invalid URL'; }
            } else if (browser?.currentURI?.spec) { fullUrl = browser.currentURI.spec; hostname = 'Internal Page'; }
            if (!originalTitle || originalTitle === 'New Tab' || originalTitle === 'about:blank' || originalTitle === 'Loading...' || originalTitle.startsWith('http:') || originalTitle.startsWith('https:')) {
                if (hostname && hostname !== 'Invalid URL' && hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname !== 'Internal Page') { title = hostname; } else { try { const pathSegment = new URL(fullUrl).pathname.split('/')[1]; if (pathSegment) title = pathSegment; } catch { /* ignore */ } }
            } else { title = originalTitle.trim(); }
            title = title || 'Untitled Page';
            try { if (browser && browser.contentDocument) { const metaDescElement = browser.contentDocument.querySelector('meta[name="description"]'); if (metaDescElement) { description = metaDescElement.getAttribute('content')?.trim() || ''; description = description.substring(0, 200); } } } catch (contentError) { /* ignore permission errors */ }
        } catch (e) { console.error('Error getting tab data for tab:', tab, e); title = 'Error Processing Tab'; }
        return { title: title, url: fullUrl, hostname: hostname || 'N/A', description: description || 'N/A' };
    };

    const toTitleCase = (str) => { return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '); };

    const processTopic = (text) => {
        if (!text) return "Uncategorized"; const originalTextTrimmedLower = text.trim().toLowerCase();
        const normalizationMap = { 'github.com': 'GitHub', 'github': 'GitHub', 'stackoverflow.com': 'Stack Overflow', 'stack overflow': 'Stack Overflow', 'stackoverflow': 'Stack Overflow', 'google docs': 'Google Docs', 'docs.google.com': 'Google Docs', 'google drive': 'Google Drive', 'drive.google.com': 'Google Drive', 'youtube.com': 'YouTube', 'youtube': 'YouTube', 'reddit.com': 'Reddit', 'reddit': 'Reddit', 'chatgpt': 'ChatGPT', 'openai.com': 'OpenAI', 'gmail': 'Gmail', 'mail.google.com': 'Gmail', 'aws': 'AWS', 'amazon web services': 'AWS', 'pinterest.com': 'Pinterest', 'pinterest': 'Pinterest', 'developer.mozilla.org': 'MDN Web Docs', 'mdn': 'MDN Web Docs', 'mozilla': 'Mozilla' };
        if (normalizationMap[originalTextTrimmedLower]) { return normalizationMap[originalTextTrimmedLower]; }
        let processedText = text.replace(/^(Category is|The category is|Topic:)\s*"?/i, ''); processedText = processedText.replace(/^\s*[\d.\-*]+\s*/, ''); let words = processedText.trim().split(/\s+/); let category = words.slice(0, 2).join(' '); category = category.replace(/["'*().:;,]/g, ''); // Remove more punctuation
        return toTitleCase(category).substring(0, 40) || "Uncategorized";
    };

    const extractTitleKeywords = (title) => {
        if (!title || typeof title !== 'string') { return new Set(); }
        const cleanedTitle = title.toLowerCase().replace(/[-_]/g, ' ').replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim(); const words = cleanedTitle.split(' '); const keywords = new Set();
        for (const word of words) { if (word.length >= CONFIG.minKeywordLength && !CONFIG.titleKeywordStopWords.has(word) && !/^\d+$/.test(word)) { keywords.add(word); } }
        return keywords;
    };

    const getNextGroupColorName = () => { const colorName = CONFIG.groupColorNames[groupColorIndex % CONFIG.groupColorNames.length]; groupColorIndex++; return colorName; };

    const findGroupElement = (topicName, workspaceId) => {
        const sanitizedTopicName = topicName.trim(); if (!sanitizedTopicName) return null; const safeSelectorTopicName = sanitizedTopicName.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        try { return document.querySelector(`tab-group[label="${safeSelectorTopicName}"][zen-workspace-id="${workspaceId}"]`); } catch (e) { console.error(`Error finding group selector: tab-group[label="${safeSelectorTopicName}"]...`, e); return null; }
    };

    // ADDED v4.8.2: Levenshtein Distance function for string similarity
    const levenshteinDistance = (a, b) => {
        if (!a || !b) return Math.max(a?.length ?? 0, b?.length ?? 0); // Handle null/undefined
        a = a.toLowerCase(); // Case-insensitive comparison
        b = b.toLowerCase();
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;
        const matrix = [];
        for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
        for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,      // Deletion
                    matrix[i][j - 1] + 1,      // Insertion
                    matrix[i - 1][j - 1] + cost // Substitution
                );
            }
        }
        return matrix[b.length][a.length];
    };
    // --- End Helper Functions ---


    // --- AI Interaction ---
    const askAIForMultipleTopics = async (tabs, existingCategoryNames = []) => {
        const validTabs = tabs.filter(tab => tab && tab.isConnected);
        if (!validTabs || validTabs.length === 0) { return []; }
        console.log(`Batch AI: Requesting categories for ${validTabs.length} tabs, considering ${existingCategoryNames.length} existing categories...`);
        validTabs.forEach(tab => tab.classList.add('tab-is-sorting'));

        const { ollama } = CONFIG.apiConfig;
        let apiUrl = ollama.endpoint;
        let headers = { 'Content-Type': 'application/json' };
        let result = [];

        try {
            if (!ollama.enabled) { throw new Error("Ollama API is not enabled in config."); }
            const tabDataArray = validTabs.map(getTabData);
            const formattedTabDataList = tabDataArray.map((data, index) => `${index + 1}.\nTitle: "${data.title}"\nURL: "${data.url}"\nDescription: "${data.description}"`).join('\n\n');
            const formattedExistingCategories = existingCategoryNames.length > 0 ? existingCategoryNames.map(name => `- ${name}`).join('\n') : "None";
            const prompt = CONFIG.apiConfig.ollama.promptTemplateBatch.replace("{EXISTING_CATEGORIES_LIST}", formattedExistingCategories).replace("{TAB_DATA_LIST}", formattedTabDataList);
            // console.log("Batch AI Prompt:\n", prompt); // DEBUG

            // v4.8.2 - Lowered temperature for consistency
            const requestBody = {
                model: ollama.model,
                prompt: prompt,
                stream: false,
                options: {
                    temperature: 0.1, // Lower temperature
                    num_predict: validTabs.length * 15 // Rough estimate, adjust if needed
                }
            };

            const response = await fetch(apiUrl, { method: 'POST', headers: headers, body: JSON.stringify(requestBody) });
            if (!response.ok) { const errorText = await response.text().catch(() => 'Unknown API error reason'); throw new Error(`API Error ${response.status}: ${errorText}`); }
            const data = await response.json();
            let aiText = data.response?.trim();
            if (!aiText) { throw new Error("Empty API response"); }
            const lines = aiText.split('\n').map(line => line.trim()).filter(Boolean);

            if (lines.length !== validTabs.length) {
                console.warn(`Batch AI: Mismatch! Expected ${validTabs.length} topics, received ${lines.length}. AI Response:\n${aiText}`);
                if (validTabs.length === 1 && lines.length > 0) { const firstLineTopic = processTopic(lines[0]); console.warn(` -> Mismatch Correction (Single Tab): Using first line "${lines[0]}" -> Topic: "${firstLineTopic}"`); result = [{ tab: validTabs[0], topic: firstLineTopic }]; }
                else if (lines.length > validTabs.length) { console.warn(` -> Mismatch Correction (Too Many Lines): Truncating response to ${validTabs.length} lines.`); const processedTopics = lines.slice(0, validTabs.length).map(processTopic); result = validTabs.map((tab, index) => ({ tab: tab, topic: processedTopics[index] })); }
                else { console.warn(` -> Fallback (Too Few Lines): Assigning remaining tabs "Uncategorized".`); const processedTopics = lines.map(processTopic); result = validTabs.map((tab, index) => ({ tab: tab, topic: index < processedTopics.length ? processedTopics[index] : "Uncategorized" })); }
            } else {
                const processedTopics = lines.map(processTopic);
                console.log("Batch AI: Processed Topics:", processedTopics);
                result = validTabs.map((tab, index) => ({ tab: tab, topic: processedTopics[index] }));
            }
            return result;
        } catch (error) { console.error(`Batch AI: Error getting topics:`, error); return validTabs.map(tab => ({ tab, topic: "Uncategorized" })); }
        finally { setTimeout(() => { validTabs.forEach(tab => tab.classList.remove('tab-is-sorting')); }, 200); }
    };
    // --- End AI Interaction ---


    // --- Main Sorting Function ---
    const sortTabsByTopic = async () => {
        if (isSorting) { console.log("Sorting already in progress."); return; }
        isSorting = true;
        console.log("Starting tab sort (v4.8.2 - Consolidate Categories)...");

        try {
            const currentWorkspaceId = window.ZenWorkspaces?.activeWorkspace;
            if (!currentWorkspaceId) { console.error("Cannot get current workspace ID."); isSorting = false; return; }

            const initialTabsToSort = Array.from(gBrowser.tabs).filter(tab =>
                tab.getAttribute('zen-workspace-id') === currentWorkspaceId &&
                !tab.pinned && !tab.hasAttribute('zen-empty-tab') &&
                !tab.closest('tab-group') && tab.isConnected
            );

            if (initialTabsToSort.length === 0) { console.log("No ungrouped, connected tabs to sort."); isSorting = false; return; }
            console.log(`Found ${initialTabsToSort.length} potentially sortable tabs.`);

            // --- Pre-Grouping Logic (Keywords & Hostnames) ---
            const preGroups = {}; const handledTabs = new Set(); const tabDataCache = new Map(); const tabKeywordsCache = new Map();
            initialTabsToSort.forEach(tab => { const data = getTabData(tab); tabDataCache.set(tab, data); tabKeywordsCache.set(tab, data.title ? extractTitleKeywords(data.title) : new Set()); });
            const keywordToTabsMap = new Map(); initialTabsToSort.forEach(tab => { const keywords = tabKeywordsCache.get(tab); if (keywords) { keywords.forEach(keyword => { if (!keywordToTabsMap.has(keyword)) { keywordToTabsMap.set(keyword, new Set()); } keywordToTabsMap.get(keyword).add(tab); }); } });
            const potentialKeywordGroups = []; keywordToTabsMap.forEach((tabsSet, keyword) => { if (tabsSet.size >= CONFIG.preGroupingThreshold) { potentialKeywordGroups.push({ keyword: keyword, tabs: tabsSet, size: tabsSet.size }); } }); potentialKeywordGroups.sort((a, b) => b.size - a.size);
            potentialKeywordGroups.forEach(({ keyword, tabs }) => { const finalTabsForGroup = new Set(); tabs.forEach(tab => { if (!handledTabs.has(tab)) { finalTabsForGroup.add(tab); } }); if (finalTabsForGroup.size >= CONFIG.preGroupingThreshold) { const categoryName = processTopic(keyword); console.log(`   - Pre-Grouping by Title Keyword: "${keyword}" (Count: ${finalTabsForGroup.size}) -> Category: "${categoryName}"`); preGroups[categoryName] = Array.from(finalTabsForGroup); finalTabsForGroup.forEach(tab => handledTabs.add(tab)); } });
            const hostnameCounts = {}; initialTabsToSort.forEach(tab => { if (!handledTabs.has(tab)) { const data = tabDataCache.get(tab); if (data?.hostname && data.hostname !== 'N/A' && data.hostname !== 'Invalid URL' && data.hostname !== 'Internal Page') { hostnameCounts[data.hostname] = (hostnameCounts[data.hostname] || 0) + 1; } } });
            const sortedHostnames = Object.keys(hostnameCounts).sort((a, b) => hostnameCounts[b] - hostnameCounts[a]);
            for (const hostname of sortedHostnames) { if (hostnameCounts[hostname] >= CONFIG.preGroupingThreshold) { const categoryName = processTopic(hostname); if (preGroups[categoryName]) { console.log(`   - Skipping Hostname Group for "${hostname}" -> Category "${categoryName}" (already exists from keywords).`); continue; } const tabsForHostnameGroup = []; initialTabsToSort.forEach(tab => { if (!handledTabs.has(tab)) { const data = tabDataCache.get(tab); if (data?.hostname === hostname) { tabsForHostnameGroup.push(tab); } } }); if (tabsForHostnameGroup.length >= CONFIG.preGroupingThreshold) { console.log(`   - Pre-Grouping by Hostname: "${hostname}" (Count: ${tabsForHostnameGroup.length}) -> Category: "${categoryName}"`); preGroups[categoryName] = tabsForHostnameGroup; tabsForHostnameGroup.forEach(tab => handledTabs.add(tab)); } } }
            // --- End Pre-Grouping Logic ---


            // --- AI Grouping for Remaining Tabs ---
            const tabsForAI = initialTabsToSort.filter(tab => !handledTabs.has(tab) && tab.isConnected);
            let aiTabTopics = [];
            const existingCategoryNames = Object.keys(preGroups);
            if (tabsForAI.length > 0) { console.log(` -> ${tabsForAI.length} tabs remaining for AI analysis.`); aiTabTopics = await askAIForMultipleTopics(tabsForAI, existingCategoryNames); }
            else { console.log(" -> No tabs remaining for AI analysis."); }
            // --- End AI Grouping ---


            // --- Combine Groups ---
            const finalGroups = { ...preGroups };
            aiTabTopics.forEach(({ tab, topic }) => {
                if (!topic || topic === "Uncategorized" || !tab || !tab.isConnected) { return; }
                if (!finalGroups[topic]) { finalGroups[topic] = []; }
                if (!handledTabs.has(tab)) { finalGroups[topic].push(tab); }
                else { console.warn(` -> AI suggested category "${topic}" for tab "${getTabData(tab).title}", but it was already pre-grouped.`); }
            });


            // --- !! NEW v4.8.2: Consolidate Similar Category Names !! ---
            console.log(" -> Consolidating potential duplicate categories...");
            const originalKeys = Object.keys(finalGroups);
            const mergedKeys = new Set(); // Keep track of keys that were merged into others
            const consolidationMap = {}; // Track which key merged into which canonical key (key: merged, value: canonical)

            for (let i = 0; i < originalKeys.length; i++) {
                let keyA = originalKeys[i];
                if (mergedKeys.has(keyA)) continue; // Skip if already merged

                // Resolve keyA in case it was merged in a previous inner loop iteration
                 while (consolidationMap[keyA]) {
                    keyA = consolidationMap[keyA];
                 }
                 if (mergedKeys.has(keyA)) continue; // Check again after resolving

                for (let j = i + 1; j < originalKeys.length; j++) {
                    let keyB = originalKeys[j];
                    if (mergedKeys.has(keyB)) continue; // Skip if already merged

                    // Resolve keyB
                    while (consolidationMap[keyB]) {
                        keyB = consolidationMap[keyB];
                    }
                    if (mergedKeys.has(keyB) || keyA === keyB) continue; // Check again or if they resolved to the same key

                    const distance = levenshteinDistance(keyA, keyB);
                    const threshold = CONFIG.consolidationDistanceThreshold; // Use configured threshold

                    if (distance <= threshold && distance > 0) { // distance > 0 means they are not identical
                        // Decide which key to keep (canonical)
                        let canonicalKey = keyA;
                        let mergedKey = keyB;

                        // Prioritize pre-group names, then shorter names
                        const keyAIsPreGroup = keyA in preGroups;
                        const keyBIsPreGroup = keyB in preGroups;

                        if (keyBIsPreGroup && !keyAIsPreGroup) {
                             canonicalKey = keyB; mergedKey = keyA;
                        } else if (!keyAIsPreGroup && !keyBIsPreGroup && keyA.length > keyB.length) {
                             canonicalKey = keyB; mergedKey = keyA;
                        } else if (keyAIsPreGroup && keyBIsPreGroup && keyA.length > keyB.length) {
                            // If both are pre-groups, prefer the shorter one
                             canonicalKey = keyB; mergedKey = keyA;
                        }
                        // Note: If priorities clash (e.g., both pre-group, same length), the first one encountered (keyA) is kept by default.

                        console.log(`    - Consolidating: Merging "${mergedKey}" into "${canonicalKey}" (Distance: ${distance})`);

                        // Merge tabs from mergedKey into canonicalKey
                        if (finalGroups[mergedKey]) {
                             if (!finalGroups[canonicalKey]) finalGroups[canonicalKey] = []; // Ensure canonical exists
                            // Add tabs from mergedKey, avoiding duplicates
                            const uniqueTabsToAdd = finalGroups[mergedKey].filter(tab => !finalGroups[canonicalKey].includes(tab));
                            finalGroups[canonicalKey].push(...uniqueTabsToAdd);
                        }

                        // Mark mergedKey as merged and remove it
                        mergedKeys.add(mergedKey);
                        consolidationMap[mergedKey] = canonicalKey; // Record the merge
                        delete finalGroups[mergedKey];

                        // If keyA was the one merged, update keyA to canonicalKey for subsequent inner loop checks
                        // and break the inner loop since the original keyB (now mergedKey) is gone.
                        if (mergedKey === keyA) {
                            keyA = canonicalKey; // Update keyA for the outer loop's perspective
                            break; // Break inner loop (j) - keyB (mergedKey) is gone.
                        }
                        // If keyB was merged, the inner loop (j) continues, but the merged keyB will be skipped by the initial checks.
                    }
                }
            }
            console.log(" -> Consolidation complete.");
            // --- End Consolidation ---


            console.log(" -> Final Consolidated groups:", Object.keys(finalGroups).map(k => `${k} (${finalGroups[k].length})`).join(', '));
            if (Object.keys(finalGroups).length === 0) {
                console.log("No valid groups identified after consolidation. Sorting finished.");
                isSorting = false; return;
            }

            // Get existing group elements ONCE
            const existingGroupElementsMap = new Map();
            document.querySelectorAll(`tab-group[zen-workspace-id="${currentWorkspaceId}"]`).forEach(groupEl => {
                const label = groupEl.getAttribute('label');
                if (label) existingGroupElementsMap.set(label, groupEl);
            });

            // Reset color index AFTER consolidation, before creating new groups
            groupColorIndex = 0;

            // --- Process each final, consolidated group ---
            for (const topic in finalGroups) {
                const tabsForThisTopic = finalGroups[topic].filter(t => t && t.isConnected); // Ensure tabs are still valid
                if (tabsForThisTopic.length === 0) { continue; } // Skip empty groups

                const existingGroupElement = existingGroupElementsMap.get(topic);

                if (existingGroupElement) {
                    // Move tabs to EXISTING group
                    console.log(` -> Moving ${tabsForThisTopic.length} tabs to existing group "${topic}".`);
                    try {
                        if (existingGroupElement.getAttribute("collapsed") === "true") { existingGroupElement.setAttribute("collapsed", "false"); }
                        const groupLabelElement = existingGroupElement.querySelector('.tab-group-label');
                        if (groupLabelElement) groupLabelElement.setAttribute('aria-expanded', 'true');
                        for (const tab of tabsForThisTopic) { if (!tab || !tab.isConnected || tab.closest('tab-group') === existingGroupElement) continue; gBrowser.moveTabToGroup(tab, existingGroupElement); }
                    } catch (e) { console.error(`Error moving tabs to existing group "${topic}":`, e); }
                } else {
                    // Create NEW group
                    // Allow creation if >= threshold OR if it came from AI (even if small), as AI implies significance
                    const wasFromAI = aiTabTopics.some(ait => ait.topic === topic && finalGroups[topic].includes(ait.tab)); // Check if AI suggested this topic directly
                    const wasPreGroup = topic in preGroups; // Check if it was a pre-group before potential consolidation

                    if (tabsForThisTopic.length >= CONFIG.preGroupingThreshold || wasFromAI || wasPreGroup) {
                         console.log(` -> Creating new group "${topic}" with ${tabsForThisTopic.length} tabs.`);
                        const firstValidTabForGroup = tabsForThisTopic.find(t => t && t.isConnected); // Find first valid tab
                        if (!firstValidTabForGroup) {
                             console.warn(` -> Skipping group "${topic}" as no valid tabs remain.`);
                             continue;
                        }
                         const groupOptions = { label: topic, color: getNextGroupColorName(), insertBefore: firstValidTabForGroup };
                        try {
                            gBrowser.addTabGroup(tabsForThisTopic, groupOptions);
                            const newGroupEl = findGroupElement(topic, currentWorkspaceId);
                            if (newGroupEl) existingGroupElementsMap.set(topic, newGroupEl); // Update map
                        } catch (e) {
                            console.error(`Error calling gBrowser.addTabGroup for topic "${topic}":`, e);
                            const groupAfterError = findGroupElement(topic, currentWorkspaceId);
                            if (groupAfterError) {
                                console.warn(` -> Group "${topic}" might exist despite error. Attempting recovery move.`);
                                existingGroupElementsMap.set(topic, groupAfterError);
                                try { for (const tab of tabsForThisTopic) if (tab && tab.isConnected && tab.closest('tab-group') !== groupAfterError) gBrowser.moveTabToGroup(tab, groupAfterError); } catch (moveError) { console.error(` -> Failed recovery move for "${topic}":`, moveError); }
                            }
                        }
                    } else {
                         console.log(` -> Skipping creation of small group "${topic}" (${tabsForThisTopic.length} tabs) - wasn't a pre-group or directly from AI.`);
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
            }, 500);
        }
    };
    // --- End Sorting Function ---


    // --- Clear Tabs Functionality ---
    const clearTabs = () => {
        console.log("Clearing tabs..."); let closedCount = 0;
        try {
            const currentWorkspaceId = window.ZenWorkspaces?.activeWorkspace; if (!currentWorkspaceId) { console.error("CLEAR BTN: Cannot get current workspace ID."); return; }
            const tabsToClose = [];
            for (const tab of gBrowser.tabs) { const isSameWorkSpace = tab.getAttribute('zen-workspace-id') === currentWorkspaceId; const isInGroup = !!tab.closest('tab-group'); const isEmptyZenTab = tab.hasAttribute("zen-empty-tab"); if (isSameWorkSpace && !tab.selected && !tab.pinned && !isInGroup && !isEmptyZenTab && tab.isConnected) { tabsToClose.push(tab); } }
            if (tabsToClose.length === 0) { console.log("CLEAR BTN: No tabs found to clear."); return; }
            console.log(`CLEAR BTN: Closing ${tabsToClose.length} tabs.`);
            tabsToClose.forEach(tab => { tab.classList.add('tab-closing'); closedCount++; setTimeout(() => { if (tab && tab.isConnected) { try { gBrowser.removeTab(tab, { animate: false, skipSessionStore: false, closeWindowWithLastTab: false, }); } catch (removeError) { console.warn(`CLEAR BTN: Error removing tab: ${removeError}`, tab); } } }, 500); });
        } catch (error) { console.error("CLEAR BTN: Error during tab clearing:", error); }
        finally { console.log(`CLEAR BTN: Initiated closing for ${closedCount} tabs.`); }
    };


    // --- Button Initialization & Workspace Handling ---

    function ensureButtonsExist(separator) {
        if (!separator) return;
        if (!separator.querySelector('#sort-button')) { try { const bf = window.MozXULElement.parseXULToFragment(`<toolbarbutton id="sort-button" command="cmd_zenSortTabs" label="⇄ Sort" tooltiptext="Sort Tabs into Groups by Topic (AI)"/>`); separator.appendChild(bf.firstChild.cloneNode(true)); console.log("BUTTONS: Sort button added to separator."); } catch (e) { console.error("BUTTONS: Error creating/appending sort button:", e); } }
        if (!separator.querySelector('#clear-button')) { try { const bf = window.MozXULElement.parseXULToFragment(`<toolbarbutton id="clear-button" command="cmd_zenClearTabs" label="↓ Clear" tooltiptext="Close ungrouped, non-pinned tabs"/>`); separator.appendChild(bf.firstChild.cloneNode(true)); console.log("BUTTONS: Clear button added to separator."); } catch (e) { console.error("BUTTONS: Error creating/appending clear button:", e); } }
    }

    function addButtonsToAllSeparators() {
        const separators = document.querySelectorAll(".vertical-pinned-tabs-container-separator");
        if (separators.length > 0) { separators.forEach(ensureButtonsExist); } else { const periphery = document.querySelector('#tabbrowser-arrowscrollbox-periphery'); if (periphery && !periphery.querySelector('#sort-button') && !periphery.querySelector('#clear-button')) { console.warn("BUTTONS: No separators found, attempting fallback append to periphery."); ensureButtonsExist(periphery); } else if (!periphery) { console.error("BUTTONS: No separators or fallback periphery container found."); } }
    }

    function setupCommandsAndListener() {
        const zenCommands = document.querySelector("commandset#zenCommandSet"); if (!zenCommands) { console.error("BUTTONS INIT: Could not find 'commandset#zenCommandSet'."); return; }
        if (!zenCommands.querySelector("#cmd_zenSortTabs")) { try { const cmd = window.MozXULElement.parseXULToFragment(`<command id="cmd_zenSortTabs"/>`).firstChild; zenCommands.appendChild(cmd); console.log("BUTTONS INIT: Command 'cmd_zenSortTabs' added."); } catch (e) { console.error("BUTTONS INIT: Error adding command 'cmd_zenSortTabs':", e); } }
        if (!zenCommands.querySelector("#cmd_zenClearTabs")) { try { const cmd = window.MozXULElement.parseXULToFragment(`<command id="cmd_zenClearTabs"/>`).firstChild; zenCommands.appendChild(cmd); console.log("BUTTONS INIT: Command 'cmd_zenClearTabs' added."); } catch (e) { console.error("BUTTONS INIT: Error adding command 'cmd_zenClearTabs':", e); } }
        if (!commandListenerAdded) { try { zenCommands.addEventListener('command', (event) => { if (event.target.id === "cmd_zenSortTabs") { sortTabsByTopic(); } else if (event.target.id === "cmd_zenClearTabs") { clearTabs(); } }); commandListenerAdded = true; console.log("BUTTONS INIT: Command listener added for Sort and Clear."); } catch (e) { console.error("BUTTONS INIT: Error adding command listener:", e); } }
    }


    // --- ZenWorkspaces Hooks ---
    function setupZenWorkspaceHooks() {
        if (typeof ZenWorkspaces === 'undefined') {
             console.warn("BUTTONS: ZenWorkspaces object not found. Skipping hook setup.");
             return;
        }
        // Prevent double-hooking
        if (typeof ZenWorkspaces.originalHooks !== 'undefined') {
            console.log("BUTTONS HOOK: Hooks already seem to be applied. Skipping re-application.");
            return;
        }

        ZenWorkspaces.originalHooks = {
             onTabBrowserInserted: ZenWorkspaces.onTabBrowserInserted,
             updateTabsContainers: ZenWorkspaces.updateTabsContainers,
        };

        ZenWorkspaces.onTabBrowserInserted = function(event) {
            if (typeof ZenWorkspaces.originalHooks.onTabBrowserInserted === 'function') {
                try { ZenWorkspaces.originalHooks.onTabBrowserInserted.call(ZenWorkspaces, event); }
                catch (e) { console.error("BUTTONS HOOK: Error in original onTabBrowserInserted:", e); }
            }
            setTimeout(addButtonsToAllSeparators, 50); // Add delay to ensure separator exists
        };

        ZenWorkspaces.updateTabsContainers = function(...args) {
            if (typeof ZenWorkspaces.originalHooks.updateTabsContainers === 'function') {
                 try { ZenWorkspaces.originalHooks.updateTabsContainers.apply(ZenWorkspaces, args); }
                 catch (e) { console.error("BUTTONS HOOK: Error in original updateTabsContainers:", e); }
            }
             setTimeout(addButtonsToAllSeparators, 50); // Add delay
        };

        console.log("BUTTONS HOOK: ZenWorkspaces hooks applied.");
    }


    // --- Initial Setup Trigger ---
    function initializeScript() {
        console.log("INIT: Sort & Clear Tabs Script (v4.8.2) loading...");
        let checkCount = 0;
        const maxChecks = 30;
        const checkInterval = 1000;

        const initCheckInterval = setInterval(() => {
            checkCount++;
            const separatorExists = !!document.querySelector(".vertical-pinned-tabs-container-separator");
            const commandSetExists = !!document.querySelector("commandset#zenCommandSet");
            const gBrowserReady = typeof gBrowser !== 'undefined' && gBrowser.tabContainer;
            // Check for ZenWorkspaces object AND its activeWorkspace property
            const zenWorkspacesReady = typeof ZenWorkspaces !== 'undefined' && typeof ZenWorkspaces.activeWorkspace !== 'undefined';
            const ready = gBrowserReady && commandSetExists && (separatorExists || document.querySelector('#tabbrowser-arrowscrollbox-periphery')) && zenWorkspacesReady; // Allow periphery fallback

            if (ready) {
                console.log(`INIT: Required elements found after ${checkCount} checks. Initializing...`);
                clearInterval(initCheckInterval);
                // Defer final setup slightly to ensure everything is stable
                setTimeout(() => {
                    try {
                        injectStyles();
                        setupCommandsAndListener();
                        addButtonsToAllSeparators(); // Initial placement
                        setupZenWorkspaceHooks();    // Hook into ZenWorkspaces changes
                        console.log("INIT: Sort & Clear Button setup and hooks complete.");
                    } catch (e) {
                        console.error("INIT: Error during deferred initial setup:", e);
                    }
                }, 500); // Delay setup slightly
            } else if (checkCount > maxChecks) {
                clearInterval(initCheckInterval);
                console.error(`INIT: Failed to find required elements after ${maxChecks} checks. Status:`, { gBrowserReady, commandSetExists, separatorExists, zenWorkspacesReady });
                 if (!zenWorkspacesReady) console.error(" -> ZenWorkspaces might not be fully initialized yet (activeWorkspace missing?). Ensure Zen Tab Organizer is loaded BEFORE this script.");
                 if (!separatorExists) console.error(" -> Separator element '.vertical-pinned-tabs-container-separator' not found (or fallback periphery).");
                 if (!commandSetExists) console.error(" -> Command set '#zenCommandSet' not found. Ensure Zen Tab Organizer is loaded.");
            }
        }, checkInterval);
    }

    // --- Start Initialization ---
    // Use requestIdleCallback for less intrusive startup if available, otherwise fallback to load
    if ('requestIdleCallback' in window) {
        requestIdleCallback(initializeScript);
    } else if (document.readyState === "complete") {
        initializeScript();
    } else {
        window.addEventListener("load", initializeScript, { once: true });
    }

})(); // End script
