# ✨ Ai Tab Groups for Zen Browser ✨
‼️This is still Work-in-Progress ‼️

https://github.com/user-attachments/assets/fc792843-b1da-448e-ba00-63322a3d9c99


## Pre-requisites
- Enable userChrome Customizations:
    In `about:config` go to `toolkit.legacyUserProfileCustomizations.stylesheets` and set it to True.
- Install and Setup the userChrome.js Loader from [Autoconfig](https://github.com/MrOtherGuy/fx-autoconfig/tree/master)
- Install the Tab groups config from [Advanced Tab Groups](https://github.com/Anoms12/Advanced-Tab-Groups)
    If you already have a TabGroup Config you can skip this
  
## Setup and Install
- Copy and paste the `tab_sort.uc.js` file to your `chrome/JS` folder.
### AI Setup
1. For Gemini (RECOMMENDED)
    - Set `gemini { enabled:true }` in `apiConfig` and `ollama { enabled:false }` in `apiConfig`
    - Get an API Key from [Ai Studios](https://aistudio.google.com)
    - Replace `YOUR_GEMINI_API_KEY` with the copied API key
    - Dont change the gemini model since 2.0 has very low rate limits (unless you are rich ig)
2. For Ollama
    - Download and install [Ollama](https://ollama.com/)
    - Install your prefered model. The script uses  `llama3.1` by default
    - Set  `ollama { enabled:true }` in `apiConfig` and  `gemini { enabled:false }` in `apiConfig`
    - Set the model you downloaded in ollama.model: in the config (you can see the models by doing `ollama list` in terminal)
- Make sure `browser.tabs.groups.smart.enabled` is set to `False` in `about:config`
- Open Zen browser, go to `about:support` and clear start up cache.
- Done. Enjoy ^^

## How it works?
- The script has two phases, first it manually sorts tabs that have common words in their title and url, second it uses the ai to sort rest of the tab and see if they fit in the existing groups (that were manually created) or should it create a new group.
- The script only fetches the tabs full url and title, thus it prioritizes the title first for main context and url for sub context.
- The sort function only works when the cateogry has 2 or more tabs to sort into a group
- You are free to change the ai prompt to your suitable workflow. The prompt is at the top in `apiConfig`.
- The Clear button only clears un-grouped nonpinned tabs.

**Peace <3**

