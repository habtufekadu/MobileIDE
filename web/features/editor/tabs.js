export let openTabs = [];
export let activeTabId = null;
export let tabContents = {};
export let isDirty = false;

const tabBar = document.getElementById('tab-bar');
if (tabBar) {
  tabBar.style.display = 'flex';
  tabBar.style.flexWrap = 'nowrap';
  tabBar.style.overflowX = 'auto';
  tabBar.style.overflowY = 'hidden';
  tabBar.style.whiteSpace = 'nowrap';
  tabBar.style.scrollbarWidth = 'none';
  tabBar.style['-ms-overflow-style'] = 'none';
  tabBar.style.height = '26px';
  
  tabBar.addEventListener('click', function(e) {
    if (e.target.classList.contains('tab-close')) {
      e.stopPropagation();
      const tabId = parseFloat(e.target.dataset.tabId);
      closeTab(tabId);
    }
  });
}

export function setDirty(state) {
  isDirty = state;
  const activeTab = document.querySelector('.tab-item.active');
  if (activeTab) {
    const fileName = activeTab.dataset.file.split('/').pop();
    const tabId = activeTab.dataset.tabId;
    activeTab.innerHTML = `${fileName} ${state ? '●' : ''}<span class="tab-close" data-tab-id="${tabId}" style="margin-left:4px; opacity:0.6;">✕</span>`;
  }
}

export function createTab(fileName, content = '', saveFunction) {
  const existingTab = document.querySelector(`.tab-item[data-file="${fileName}"]`);
  if (existingTab) {
    const tId = parseFloat(existingTab.dataset.tabId);
    switchTab(tId);
    
    // Update content and Monaco model if file is re-created/overwritten in the same folder
    if (content !== undefined) {
      tabContents[tId] = content;
      if (window.editorModels && window.editorModels[fileName]) {
        window.editorModels[fileName].setValue(content);
      }
    }
    return tId;
  }

  const tabBar = document.getElementById('tab-bar');
  const newTab = document.createElement('button');
  const tabId = Date.now() + Math.random() * 1000;
  
  newTab.className = 'tab-item';
  newTab.dataset.tabId = tabId;
  newTab.dataset.file = fileName;
  
  newTab.style.display = 'inline-flex';
  newTab.style.alignItems = 'center';
  newTab.style.padding = '0 8px';
  newTab.style.fontSize = '11px';
  newTab.style.height = '26px';
  newTab.style.background = 'transparent';
  newTab.style.cursor = 'pointer';
  newTab.style.flexShrink = '0';
  newTab.style.whiteSpace = 'nowrap';
  newTab.style.maxWidth = '110px';
  newTab.style.overflow = 'hidden';
  newTab.style.textOverflow = 'ellipsis';
  newTab.style.color = 'inherit';
  
  newTab.style.borderTop = 'none';
  newTab.style.borderLeft = 'none';
  newTab.style.borderRight = '1px solid rgba(128, 128, 128, 0.4)'; 
  newTab.style.borderBottom = '2px solid transparent';
  
  const shortName = fileName.split('/').pop();
  newTab.innerHTML = `${shortName}<span class="tab-close" data-tab-id="${tabId}" style="margin-left:5px; font-size:10px; opacity:0.6;">✕</span>`;

  if (tabBar) tabBar.appendChild(newTab);
  tabContents[tabId] = content || '';
  isDirty = false;

  newTab.addEventListener('click', function(e) {
    if (e.target.classList.contains('tab-close')) return;
    switchTab(tabId);
  });

  openTabs.push(tabId);
  switchTab(tabId);
  return tabId;
}

export function switchTab(tabId) {
  const allTabs = document.querySelectorAll('.tab-item');
  allTabs.forEach(t => {
      t.classList.remove('active');
      t.style.borderBottom = '2px solid transparent';
      t.style.opacity = '0.6';
      t.style.background = 'transparent';
  });
  
  const selected = document.querySelector(`.tab-item[data-tab-id="${tabId}"]`);
  if (selected) {
    selected.classList.add('active');
    selected.style.borderBottom = '2px solid #007acc';
    selected.style.opacity = '1';
    selected.style.background = 'rgba(128, 128, 128, 0.1)';
    activeTabId = tabId;
    
    const tabInfo = { fileName: selected.dataset.file, tabId: tabId };
    if (window.onTabChanged) window.onTabChanged(tabInfo);
    
    selected.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    
    return tabInfo;
  }
  return null;
}

export function closeTab(tabId) {
  const tab = document.querySelector(`.tab-item[data-tab-id="${tabId}"]`);
  if (tab) {
    const filePath = tab.dataset.file;
    tab.remove();
    const index = openTabs.indexOf(tabId);
    if (index > -1) openTabs.splice(index, 1);
    delete tabContents[tabId];
    
    if (window.editorModels && window.editorModels[filePath]) {
       window.editorModels[filePath].dispose();
       delete window.editorModels[filePath];
    }
    
    if (window.closeTabById) window.closeTabById(tabId);

    if (activeTabId === tabId) {
      activeTabId = null;
      if (openTabs.length > 0) {
        switchTab(openTabs[openTabs.length - 1]);
      } else {
        if (window.clearEditor) window.clearEditor();
      }
    }
  }
}

export function getActiveTabInfo() {
  const selected = document.querySelector('.tab-item.active');
  if (selected) {
    return { fileName: selected.dataset.file, tabId: parseFloat(selected.dataset.tabId) };
  }
  return null;
}
