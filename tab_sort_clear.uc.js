(() => {
    // --- Configuration ---
    const CONFIG = {
        apiConfig: {
            ollama: {
                endpoint: 'http://localhost:11434/api/generate',
                enabled: true,
                model: 'llama3.1:latest',
                promptTemplateBatch: `Analyze the following numbered list of tab data (Title, URL, Hostname, Description) and assign a concise category (1-2 words, Title Case) for EACH tab.

                    Rules for Categorization:
                    1.  **Prioritize Domain:** Use the Hostname (e.g., GitHub, YouTube, Google Docs) as the primary category if specific and relevant.
                    2.  **Use Title/Description:** If the Hostname is generic (e.g., google.com, cloudflare.com) or more context is needed, use keywords from the Title and Description to determine a more specific category (e.g., "Search Results", "Cloudflare Settings", "Recipe Blog").
                    3.  **Be Consistent & Reuse:** If multiple tabs belong to the same logical topic or domain, assign the EXACT SAME category name (e.g., use "GitHub" for all github.com tabs, not "Code" or "Git"). Strive to reuse category names where appropriate based on the context provided by the whole list.
                    4.  **Conciseness:** Categories MUST be 1-2 words max. Use Title Case (e.g., "News Article", "Stack Overflow").

                    Input Tab Data:
                    {TAB_DATA_LIST}
                    ---
                    Output Format Instructions:
                    1.  Output ONLY the category name for each tab.
                    2.  Provide EXACTLY ONE category name per line.
                    3.  The number of lines in your output MUST EXACTLY MATCH the number of tabs in the Input Tab Data list above ({TAB_COUNT} lines).
                    4.  DO NOT include numbers, bullet points, explanations, apologies, introductory/closing remarks, or any markdown formatting.
                    5.  Just the list of categories, separated by newlines. Example for 3 tabs:
                        GitHub
                        Stack Overflow
                        News Article
                    ---
                    Output:`
            }
        },
        // Sort Config options
        groupColors: [ "var(--tab-group-color-blue)", "var(--tab-group-color-red)", "var(--tab-group-color-yellow)", "var(--tab-group-color-green)", "var(--tab-group-color-pink)", "var(--tab-group-color-purple)", "var(--tab-group-color-orange)", "var(--tab-group-color-cyan)", "var(--tab-group-color-gray)" ],
        groupColorNames: ["blue", "red", "yellow", "green", "pink", "purple", "orange", "cyan", "gray"],
        preGroupingThreshold: 2,
        titleKeywordStopWords: new Set(['a','an','the','and','or','but','in','on','at','to','for','with','by','of','is','am','are','was','were','be','being','been','has','have','had','do','does','did','how','what','when','where','why','which','who','whom','whose','new','tab','untitled','page','home','com','org','net','io','dev','app','get','set','list','view','edit','create','update','delete','my','your','his','her','its','our','their','me','you','him','her','it','us','them','about','search','results','posts','index','dashboard','profile','settings','official','documentation','docs','wiki','help','support','faq','guide','error','login','signin','sign','up','out','welcome','loading']),
        minKeywordLength: 3,

        // --- UI Config ---
        targetSelector: '.vertical-pinned-tabs-container-separator',
        // Sort Button
        sortButtonId: 'sort-button',
        sortButtonLabel: '🧹',
        sortButtonTooltip: 'Sort Tabs by Topic (AI)',
        sortCommandId: 'cmd_zenSortTabs',
        sortButtonWidth: 55, // px
        // Clear Button
        clearButtonId: 'clear-button',
        clearButtonLabel: '↓ Clear',
        clearButtonTooltip: 'Close non-pinned/grouped tabs',
        clearCommandId: 'cmd_zenClearTabs',
        clearButtonWidth: 90, // px
        // Layout
        buttonSpacing: 50, // px between buttons

        // styles defined below
    };

    // --- Define Styles AFTER CONFIG exists ---
    CONFIG.styles = `
            /* --- Separator Container Styling --- */
            ${CONFIG.targetSelector} { position: relative !important; min-height: 10px !important; overflow: visible !important; background: none !important; border: none !important; margin: 4px 4px 4px 10px !important; display: block !important; height: max-content !important; padding: 5px 0 !important; }
            /* --- Separator Line --- */
            ${CONFIG.targetSelector}::after { content: "" !important; display: block !important; width: 100% !important; height: 1px !important; background-color: var(--toolbox-border-color, hsla(0,0%,50%,.3)) !important; position: absolute !important; top: 50% !important; left: 0 !important; transform: translateY(-50%) !important; transition: width 0.2s ease-in-out !important; z-index: 0 !important; pointer-events: none !important; }

            /* --- Shorten line on hover for BOTH buttons --- */
            ${CONFIG.targetSelector}:hover::after {
                width: calc(100% - 75px) !important;
            }

            /* --- Base Button Style (Common for Sort & Clear) --- */
            #${CONFIG.sortButtonId}, #${CONFIG.clearButtonId} {
                position: absolute !important; top: 50% !important; transform: translateY(-50%) !important; z-index: 1 !important; box-sizing: border-box !important;
                height: 50px !important; line-height: 50px !important; min-height: auto !important;
                border: none !important; background: none !important; background-color: transparent !important; box-shadow: none !important; padding: 0 5px !important; margin: 0 !important; appearance: none !important;
                will-change: opacity; cursor: pointer; text-align: center;
                opacity: 0 !important; visibility: hidden !important; pointer-events: none !important;
                transition: opacity 0.15s ease-out, visibility 0s linear 0.15s !important;
            }
            /* --- Specific Button Positioning --- */
            #${CONFIG.sortButtonId} { left: 0px !important; width: ${CONFIG.sortButtonWidth}px !important; }
            #${CONFIG.clearButtonId} { right: 0px !important; width: ${CONFIG.clearButtonWidth}px !important; }

            /* --- Force Button children transparent --- */
            #${CONFIG.sortButtonId} > *, #${CONFIG.clearButtonId} > * { background: none !important; border: none !important; box-shadow: none !important; padding: 0 !important; margin: 0 !important; }

            /* --- Button Text Styling (Common) --- */
            #${CONFIG.sortButtonId} > .toolbarbutton-text, #${CONFIG.sortButtonId} > .toolbarbutton-label, #${CONFIG.sortButtonId} > label,
            #${CONFIG.clearButtonId} > .toolbarbutton-text, #${CONFIG.clearButtonId} > .toolbarbutton-label, #${CONFIG.clearButtonId} > label {
                 display: inline !important; visibility: inherit !important; opacity: 0.6 !important; vertical-align: middle !important; transform: translateX(5px)  !important;
                 color: var(--toolbarbutton-color, -moz-dialogtext) !important; font-size: 12px !important; font-weight: normal !important;
                 white-space: nowrap !important; overflow: hidden !important; text-overflow: clip !important; transition: none !important;
            }
            
            
            #${CONFIG.sortButtonId} > .toolbarbutton-text, #${CONFIG.sortButtonId} > .toolbarbutton-label, #${CONFIG.sortButtonId} > label{
            transform: translateX(75px)  !important;}
            

            /* --- Show Buttons on Separator Hover --- */
            ${CONFIG.targetSelector}:hover #${CONFIG.sortButtonId},
            ${CONFIG.targetSelector}:hover #${CONFIG.clearButtonId} {
                opacity: 1 !important; visibility: visible !important; pointer-events: auto !important;
                transition: opacity 0.4s ease-out, visibility 0s !important;
            }

            /* --- No BG on Button Hover --- */
            #${CONFIG.sortButtonId}:hover, #${CONFIG.sortButtonId}:active,
            #${CONFIG.clearButtonId}:hover, #${CONFIG.clearButtonId}:active { background: none !important; box-shadow: none !important; border: none !important; transition-property: none !important; }

            /* --- Text Brighter on Button Hover (Common) --- */
            #${CONFIG.sortButtonId}:hover > .toolbarbutton-text, #${CONFIG.sortButtonId}:hover > .toolbarbutton-label, #${CONFIG.sortButtonId}:hover > label,
            #${CONFIG.clearButtonId}:hover > .toolbarbutton-text, #${CONFIG.clearButtonId}:hover > .toolbarbutton-label, #${CONFIG.clearButtonId}:hover > label {
                 opacity: 1 !important; transition: opacity 0.15s ease-out !important;
                
            }

            /* --- Tab sorting animation (loading pulse) --- */
            @keyframes loading-pulse-tab { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
            .tab-is-sorting .tab-icon-image, .tab-is-sorting .tab-label { animation: loading-pulse-tab 1.5s ease-in-out infinite; will-change: opacity; }
            .tabbrowser-tab { transition: transform 0.3s ease-out, opacity 0.3s ease-out; }
            tab-group { transition: background-color 0.3s ease; }

            /* --- Tab closing animation (From Clear Script) --- */
            .tab-closing { animation: fadeUp 0.5s forwards; }
            @keyframes fadeUp { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-20px); } }
        `;

    // --- State ---
    let uiInitialized = false;
    let listenerAdded = false;
    let isSorting = false;
    let groupColorIndex = 0;

    // --- Helper Functions (Required for Sorting) ---
    const getTabData = (tab) => {
        if (!tab || !tab.isConnected) return { title: 'Invalid Tab', url: '', hostname: '', description: '' };
        let title = 'Untitled Page', fullUrl = '', hostname = '', description = '';
        try { const label = tab.getAttribute('label') || tab.querySelector('.tab-label,.tab-text')?.textContent || ''; const browser = tab.linkedBrowser || tab._linkedBrowser || gBrowser?.getBrowserForTab?.(tab);
            if (browser?.currentURI?.spec && !browser.currentURI.spec.startsWith('about:')) { try { const u=new URL(browser.currentURI.spec); fullUrl=u.href; hostname=u.hostname.replace(/^www\./,''); } catch{ hostname='Invalid URL'; fullUrl=browser?.currentURI?.spec||'Invalid URL'; } }
            else if (browser?.currentURI?.spec) { fullUrl=browser.currentURI.spec; hostname='Internal Page'; }
            if (!label || ['New Tab','about:blank','Loading...'].includes(label) || label.startsWith('http:') || label.startsWith('https:')) { if (hostname && !['Invalid URL','localhost','127.0.0.1','Internal Page'].includes(hostname)) title=hostname; else { try{ const p=new URL(fullUrl).pathname.split('/')[1]; if(p) title=p; } catch {} } } else { title = label.trim(); }
            title=title||'Untitled Page'; try { if(browser?.contentDocument && !browser.currentURI.spec.startsWith('about:')) { const m=browser.contentDocument.querySelector('meta[name="description"]'); if(m) description=m.getAttribute('content')?.trim().substring(0,200)||''; } } catch {}
        } catch (e) { console.error('Err getTabData:', e); title = 'Error Processing'; }
        return { title, url: fullUrl, hostname: hostname || 'N/A', description: description || 'N/A' };
    };
    const toTitleCase = (str) => str ? str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '';
    const processTopic = (text) => { 
        if(!text) return "Uncategorized"; const lower=text.trim().toLowerCase(); const map={'github.com':'GitHub','stackoverflow.com':'Stack Overflow','docs.google.com':'Google Docs','drive.google.com':'Google Drive','youtube.com':'YouTube','reddit.com':'Reddit','openai.com':'OpenAI','mail.google.com':'Gmail','aws.amazon.com':'AWS'}; if(map[lower]) return map[lower];
        let p = text.replace(/^(Category is|The category is|Topic:)\s*"?/i, '').replace(/^\s*[\d.\-*]+\s*/, ''); let w = p.trim().split(/\s+/); let c = w.slice(0, 2).join(' ').replace(/["'*().:;]/g, ''); return toTitleCase(c).substring(0,40)||"Uncategorized";
    };
    const extractTitleKeywords = (title) => { 
        if (!title || typeof title !== 'string') return new Set(); const cleaned = title.toLowerCase().replace(/[-_]/g,' ').replace(/[^\w\s]/g,'').replace(/\s+/g,' ').trim(); const words = cleaned.split(' '); const keywords = new Set();
        for (const word of words) { if (word.length >= CONFIG.minKeywordLength && !CONFIG.titleKeywordStopWords.has(word) && !/^\d+$/.test(word)) { keywords.add(word); } } return keywords;
    };
    const getNextGroupColorName = () => CONFIG.groupColorNames[groupColorIndex++ % CONFIG.groupColorNames.length];
    const findGroupElement = (topic, wsId) => { 
        const s = topic.trim().replace(/\\/g,'\\\\').replace(/"/g,'\\"'); if(!s) return null; try { return document.querySelector(`tab-group[label="${s}"][zen-workspace-id="${wsId}"]`); } catch (e) { console.error(`Err findGroup:"${s}"`,e); return null; }
    };

    // --- AI Interaction ---
    const askAIForMultipleTopics = async (tabs) => { 
        const validTabs = tabs.filter(t => t?.isConnected); if (!validTabs?.length) return [];
        console.log(`AI: Getting data for ${validTabs.length} tabs`); validTabs.forEach(t => t.classList.add('tab-is-sorting'));
        const { ollama } = CONFIG.apiConfig; if (!ollama.enabled) { console.error("Ollama disabled"); return validTabs.map(t => ({ tab: t, topic: "Uncategorized" })); }
        let result = [];
        try {
            const tabDataArray = validTabs.map(getTabData);
            const formattedList = tabDataArray.map((d, i) => `${i+1}.\n T: "${d.title}"\n U: "${d.url}"\n H: "${d.hostname}"\n D: "${d.description}"`).join('\n\n');
            let prompt = CONFIG.apiConfig.ollama.promptTemplateBatch.replace("{TAB_DATA_LIST}", formattedList);
            prompt = prompt.replace("{TAB_COUNT}", validTabs.length.toString());
            const body = { model: ollama.model, prompt, stream: false, options: { temperature: 0.2, num_predict: validTabs.length * 15 } };
            console.log(`AI: Sending Request (Model: ${ollama.model})...`);
            const response = await fetch(ollama.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (!response.ok) throw new Error(`API Error ${response.status}: ${await response.text().catch(()=>'Unknown')}`);
            const data = await response.json(); const aiText = data.response?.trim(); if (!aiText) throw new Error("Empty API response");
            console.log(`AI: Raw Response (first 300): "${aiText.substring(0, 300)}"`);
            const lines = aiText.split('\n').map(line => line.trim()).filter(Boolean);
            if (lines.length !== validTabs.length) {
                console.warn(`AI Mismatch! Expected ${validTabs.length}, received ${lines.length}.`);
                if (validTabs.length === 1 && lines.length > 0) { const topic = processTopic(lines[0]); console.warn(` -> Fix: Using first line "${lines[0]}" -> "${topic}"`); result = [{ tab: validTabs[0], topic }]; }
                else { console.warn(` -> Fallback: Uncategorized`); result = validTabs.map(tab => ({ tab, topic: "Uncategorized" })); }
            } else {
                const topics = lines.map(processTopic); console.log("AI: Processed Topics:", topics); result = validTabs.map((tab, index) => ({ tab, topic: topics[index] }));
            }
            return result;
        } catch (error) { console.error(`AI Error:`, error); return validTabs.map(tab => ({ tab, topic: "Uncategorized" })); }
    };

    // --- Main Sort Function ---
    const sortTabsByTopic = async () => {
        if (isSorting) { console.log("SORT: Already in progress."); return; }
        isSorting = true; console.log("SORT: === Starting Sort Process ===");
        try {
            if (typeof gBrowser==='undefined' || typeof ZenWorkspaces==='undefined') throw new Error("gBrowser or ZenWorkspaces missing");
            const workspaceId = window.ZenWorkspaces?.activeWorkspace; if (!workspaceId) throw new Error("No workspace ID");
            console.log(`SORT: Target Workspace ID: ${workspaceId}`);
            const initialTabsToSort = Array.from(gBrowser.tabs).filter(t => t.getAttribute('zen-workspace-id') === workspaceId && !t.pinned && !t.hasAttribute('zen-empty-tab') && !t.closest('tab-group') && t.isConnected);
            if (initialTabsToSort.length === 0) { console.log("SORT: No ungrouped, connected tabs found."); isSorting = false; return; }
            console.log(`SORT: Found ${initialTabsToSort.length} tabs to process.`);
            // Pre-grouping
            console.log("SORT: --- Phase 1: Pre-grouping ---");
            const preGroups = {}, handledTabs = new Set(), tabDataCache = new Map(), tabKeywordsCache = new Map();
            initialTabsToSort.forEach(t => { const d=getTabData(t); tabDataCache.set(t, d); tabKeywordsCache.set(t, d.title ? extractTitleKeywords(d.title) : new Set()); });
            const keywordMap = new Map(); initialTabsToSort.forEach(t=>tabKeywordsCache.get(t)?.forEach(k=>{if(!keywordMap.has(k))keywordMap.set(k,new Set());keywordMap.get(k).add(t);})); const potKwG=[]; keywordMap.forEach((ts,k)=>{if(ts.size>=CONFIG.preGroupingThreshold)potKwG.push({k,ts,size:ts.size});}); potKwG.sort((a,b)=>b.size-a.size); potKwG.forEach(({k,ts})=>{const fTabs=new Set();ts.forEach(t=>{if(!handledTabs.has(t))fTabs.add(t);}); if(fTabs.size>=CONFIG.preGroupingThreshold){const cat=processTopic(k);console.log(` -> Keyword Group:"${k}"(${fTabs.size})->"${cat}"`); preGroups[cat]=Array.from(fTabs); fTabs.forEach(t=>handledTabs.add(t));}});
            const hostCounts = {}; initialTabsToSort.forEach(t=>{if(!handledTabs.has(t)){const d=cache.get(t);if(d?.hostname&&!['N/A','Invalid URL','Internal Page'].includes(d.hostname))hostCounts[d.hostname]=(hostCounts[d.hostname]||0)+1;}}); const sortedHosts=Object.keys(hostCounts).sort((a,b)=>hostCounts[b]-hostCounts[a]); for(const h of sortedHosts){if(hostCounts[h]>=CONFIG.preGroupingThreshold){const cat=processTopic(h);if(preGroups[cat])continue;const hTabs=[]; initialTabsToSort.forEach(t=>{if(!handledTabs.has(t)&&cache.get(t)?.hostname===h)hTabs.push(t);});if(hTabs.length>=CONFIG.preGroupingThreshold){console.log(` -> Host Group:"${h}"(${hTabs.length})->"${cat}"`);preGroups[cat]=hTabs; hTabs.forEach(t=>handledTabs.add(t));}}}
            console.log(`SORT: Pre-grouping complete. ${handledTabs.size} handled. ${Object.keys(preGroups).length} groups.`);
            // AI
            console.log("SORT: --- Phase 2: AI Processing ---");
            const tabsForAI = initialTabsToSort.filter(t => !handledTabs.has(t) && t.isConnected); let aiTabTopics = [];
            if (tabsForAI.length > 0) { console.log(`SORT: Sending ${tabsForAI.length} remaining tabs to AI...`); aiTabTopics = await askAIForMultipleTopics(tabsForAI); console.log(`SORT: AI processing returned ${aiTabTopics.length} results.`); } else { console.log("SORT: No tabs remaining for AI."); }
            // Final Grouping
            console.log("SORT: --- Phase 3: Final Grouping & Applying ---");
            const finalGroups = { ...preGroups }; aiTabTopics.forEach(({ tab, topic }) => { if (!topic || topic === "Uncategorized" || !tab?.isConnected) return; if (!finalGroups[topic]) finalGroups[topic] = []; finalGroups[topic].push(tab); });
            if (Object.keys(finalGroups).length === 0) { console.log("SORT: No valid groups identified."); isSorting = false; return; }
            console.log(`SORT: Final groups (${Object.keys(finalGroups).length}):`, Object.keys(finalGroups));
            // Apply Groups
            const existingGroupElementsMap = new Map(); document.querySelectorAll(`tab-group[zen-workspace-id="${workspaceId}"]`).forEach(el => { const l = el.getAttribute('label'); if (l) existingGroupElementsMap.set(l, el); }); console.log(`SORT: Found ${existingGroupElementsMap.size} existing groups.`);
            for (const topic in finalGroups) {
                const tabsForThisTopic = finalGroups[topic].filter(t => t?.isConnected); if (tabsForThisTopic.length === 0) continue;
                const existingGroupElement = existingGroupElementsMap.get(topic);
                if (existingGroupElement) {
                    console.log(` -> Moving ${tabsForThisTopic.length} to EXISTING "${topic}"...`);
                    try { if (existingGroupElement.getAttribute("collapsed") === "true") existingGroupElement.setAttribute("collapsed", "false"); existingGroupElement.querySelector('.tab-group-label')?.setAttribute('aria-expanded', 'true'); for (const tab of tabsForThisTopic) if (tab?.isConnected) gBrowser.moveTabToGroup(tab, existingGroupElement); } catch (e) { console.error(` -> Err Move:"${topic}"`, e); }
                } else {
                    console.log(` -> Creating NEW "${topic}" (${tabsForThisTopic.length})...`);
                    const firstValidTabForGroup = tabsForThisTopic[0]; const groupOptions = { label: topic, color: getNextGroupColorName(), insertBefore: firstValidTabForGroup };
                    try { gBrowser.addTabGroup(tabsForThisTopic, groupOptions); console.log(` -> Group "${topic}" created.`); } catch (e) { console.error(` -> Err Create:"${topic}"`, e); const groupAfterError = findGroupElement(topic, workspaceId); if (groupAfterError) { console.warn(` -> Recover "${topic}"`); try { for (const tab of tabsForThisTopic) if (tab?.isConnected) gBrowser.moveTabToGroup(tab, groupAfterError); } catch (moveE) { console.error(` -> Recover Fail:`, moveE); }} }
                }
            }
            console.log("SORT: === Sort Process Complete ===");
        } catch (error) { console.error("SORT: Critical error during sorting:", error); }
        finally { isSorting = false; setTimeout(() => { try { if (gBrowser?.tabs) Array.from(gBrowser.tabs).forEach(t => t.classList.remove('tab-is-sorting')); console.log("SORT: Cleaned indicators."); } catch (e) { console.error("SORT: Cleanup error", e); } }, 500); }
    };

    // --- Clear Tabs Function ---
    const clearTabs = () => { 
        console.log("CLEAR: === Starting Clear Process ===");
        try {
            if (typeof gBrowser === 'undefined' || typeof ZenWorkspaces === 'undefined') throw new Error("gBrowser or ZenWorkspaces missing");
            const workspaceId = window.ZenWorkspaces?.activeWorkspace; if (!workspaceId) throw new Error("No active workspace ID");
            console.log(`CLEAR: Target Workspace ID: ${workspaceId}`);

            const tabsToRemove = [];
            for (const tab of gBrowser.tabs) {
                if (tab?.isConnected && !tab.closing) {
                    const isSameWorkSpace = tab.getAttribute('zen-workspace-id') === workspaceId;
                    const isInGroup = !!tab.closest('tab-group');
                    if (isSameWorkSpace && !tab.selected && !tab.pinned && !isInGroup) {
                        tabsToRemove.push(tab);
                    }
                }
            }
            console.log(`CLEAR: Found ${tabsToRemove.length} tabs to close.`);
            if (tabsToRemove.length === 0) return;

            tabsToRemove.forEach(tab => {
                if (tab?.isConnected && !tab.closing) {
                    tab.classList.add('tab-closing');
                    setTimeout(() => {
                        if (tab?.isConnected && tab.parentNode && gBrowser.tabs.includes(tab) && !tab.closing) {
                           try { gBrowser.removeTab(tab, { animate: false, skipSessionStore: false, closeWindowWithLastTab: false }); }
                           catch (removeError) { console.error(`CLEAR: Error removing tab "${tab.label}":`, removeError); tab?.classList?.remove('tab-closing'); }
                        } else { tab?.classList?.remove('tab-closing'); }
                    }, 500);
                }
            });
            console.log("CLEAR: === Clear Process Submitted ===");
        } catch(err) { console.error("CLEAR: Critical error during clear tabs:", err); }
    }

    // --- UI Setup ---
    const injectStyles = () => { 
        const styleId = 'zen-combined-buttons-style-v10'; if (document.getElementById(styleId)) return true;
        try { if (typeof CONFIG.styles !== 'string') throw new Error("Styles not defined"); const style=document.createElement('style'); style.id=styleId; style.textContent=CONFIG.styles; if(document.head) {document.head.appendChild(style); console.log(`${SCRIPT_NAME}: Styles injected.`); return true;} else throw new Error("document.head missing");
        } catch(e) { console.error(`${SCRIPT_NAME}: Style injection error:`, e); return false; }
    };

    // Modified addButtonsToSeparator to handle BOTH buttons
    const addButtonsToSeparator = (separator) => {
        if (!separator) return;
        console.log(`${SCRIPT_NAME}: Ensuring buttons exist in:`, separator);
        try {
            if (typeof window.MozXULElement?.parseXULToFragment !== 'function') throw new Error("MozXULElement API unavailable");

            // Ensure Sort Button (Left)
            if (!separator.querySelector(`#${CONFIG.sortButtonId}`)) {
                const frag = window.MozXULElement.parseXULToFragment(`<toolbarbutton id="${CONFIG.sortButtonId}" class="toolbarbutton-1 subviewbutton" removable="false" label="${CONFIG.sortButtonLabel}" tooltiptext="${CONFIG.sortButtonTooltip}" command="${CONFIG.sortCommandId}"/>`);
                if (frag?.firstChild) separator.appendChild(frag.firstChild.cloneNode(true));
                else console.error(`${SCRIPT_NAME}: Failed Sort fragment!`);
            }
            // Ensure Clear Button (Right)
            if (!separator.querySelector(`#${CONFIG.clearButtonId}`)) {
                 const frag = window.MozXULElement.parseXULToFragment(`<toolbarbutton id="${CONFIG.clearButtonId}" class="toolbarbutton-1 subviewbutton" removable="false" label="${CONFIG.clearButtonLabel}" tooltiptext="${CONFIG.clearButtonTooltip}" command="${CONFIG.clearCommandId}"/>`);
                 if (frag?.firstChild) separator.appendChild(frag.firstChild.cloneNode(true));
                 else console.error(`${SCRIPT_NAME}: Failed Clear fragment!`);
            }
        } catch (e) { console.error(`${SCRIPT_NAME}: Error adding buttons:`, e); }
    };

    // Modified setupCommandAndListener for BOTH commands
    const setupCommandsAndListener = () => {
        if (listenerAdded) return;
        console.log(`${SCRIPT_NAME}: Setting up commands & listener...`);
        try {
            let zenCommands = document.getElementById("zenCommandSet");
            if (!zenCommands) { /* ... create commandset logic ... */
                console.log(`${SCRIPT_NAME}: Creating #zenCommandSet.`); zenCommands = document.createElement("commandset"); zenCommands.id = "zenCommandSet"; const mainCmdSet = document.getElementById('mainCommandSet'); if (mainCmdSet?.parentNode) mainCmdSet.parentNode.insertBefore(zenCommands, mainCmdSet.nextSibling); else if (document.body) document.body.appendChild(zenCommands); else throw new Error("Cannot add commandset");
            }
            if (typeof window.MozXULElement?.parseXULToFragment !== 'function') throw new Error("MozXULElement unavailable");

            // Ensure Sort Command Element
            if (!document.getElementById(CONFIG.sortCommandId)) { const frag=window.MozXULElement.parseXULToFragment(`<command id="${CONFIG.sortCommandId}"/>`); if(frag?.firstChild) zenCommands.appendChild(frag.firstChild); else throw new Error("Failed sort cmd frag"); console.log(`Cmd ${CONFIG.sortCommandId} added.`); }
            // Ensure Clear Command Element
            if (!document.getElementById(CONFIG.clearCommandId)) { const frag=window.MozXULElement.parseXULToFragment(`<command id="${CONFIG.clearCommandId}"/>`); if(frag?.firstChild) zenCommands.appendChild(frag.firstChild); else throw new Error("Failed clear cmd frag"); console.log(`Cmd ${CONFIG.clearCommandId} added.`); }

            // Add ONE listener for both commands
            zenCommands.addEventListener('command', (event) => {
                const commandId = event.target.id;
                console.log(`${SCRIPT_NAME}: Command received: ${commandId}`);
                if (commandId === CONFIG.sortCommandId) {
                    sortTabsByTopic();
                } else if (commandId === CONFIG.clearCommandId) {
                    clearTabs();
                }
            });
            listenerAdded = true;
            console.log(`${SCRIPT_NAME}: Combined command listener attached.`);
        } catch (e) { console.error(`${SCRIPT_NAME}: Error setting up commands/listener:`, e); listenerAdded = false; }
    };

    // Optional Hook (Minimal) - Calls combined addButtons
    const setupZenWorkspaceHooks = () => {
        if (typeof ZenWorkspaces !== 'object' || ZenWorkspaces === null) return;
         console.log(`${SCRIPT_NAME}: Setting up ZenWorkspaces hooks.`);
         try {
            const originalUpdate = ZenWorkspaces.updateTabsContainers;
            ZenWorkspaces.updateTabsContainers = function(...args) {
                 if (typeof originalUpdate === 'function') { try { originalUpdate.apply(this, args); } catch(e){ console.error("Hook error (orig update):", e); } }
                 addButtonsToSeparator(document.querySelector(CONFIG.targetSelector)); // Re-ensure buttons exist in the primary separator after update
            };
             console.log(`${SCRIPT_NAME}: updateTabsContainers hook applied.`);
         } catch (e) { console.error(`${SCRIPT_NAME}: Error setting up hooks:`, e); }
    };

    // --- Initialization Logic ---
    const initializeUI = () => {
        console.log(`${SCRIPT_NAME}: Running initializeUI...`);
        if (uiInitialized) return;
        if (!injectStyles()) { console.error(`${SCRIPT_NAME}: Style injection failed.`); return; }
        setupCommandsAndListener(); // Setup commands/listener first
        if (!listenerAdded) { console.error(`${SCRIPT_NAME}: Listener setup failed. Buttons may not function.`); /* Optionally return */ }

        let checks = 0; const maxChecks = 25;
        const intervalId = setInterval(() => {
            console.log(`${SCRIPT_NAME}: Interval check #${checks + 1}`);
            try {
                const separator = document.querySelector(CONFIG.targetSelector);
                if (separator) {
                    console.log(`${SCRIPT_NAME}: Target separator found.`, separator);
                    clearInterval(intervalId); uiInitialized = true;
                    requestAnimationFrame(() => {
                         console.log(`${SCRIPT_NAME}: Adding buttons via rAF.`);
                         addButtonsToSeparator(separator); // Add BOTH buttons
                         setupZenWorkspaceHooks(); // Add hook after initial setup
                         console.log(`${SCRIPT_NAME}: UI setup potentially complete.`);
                    });
                } else {
                    checks++; if (checks >= maxChecks) { clearInterval(intervalId); uiInitialized = true; console.error(`${SCRIPT_NAME}: Target separator not found after ${maxChecks} checks.`); }
                    else { console.log(`${SCRIPT_NAME}: Target separator not found yet.`); }
                }
            } catch (e) { clearInterval(intervalId); uiInitialized = true; console.error(`${SCRIPT_NAME}: Error during interval check:`, e); }
        }, 1000);
    };

    // --- Run Initialization ---
    const runInit = () => {
         if (window.zenButtonInitStartedV10) return;
         window.zenButtonInitStartedV10 = true;
         console.log(`${SCRIPT_NAME}: DOM ready state detected, running init.`);
         setTimeout(initializeUI, 100); // Defer slightly
    }
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', runInit, { once: true }); }
    else { setTimeout(runInit, 0); }

})();