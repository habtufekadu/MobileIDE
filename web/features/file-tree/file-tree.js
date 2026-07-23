export let fileTreeInstance = null;
let treeData = [];
let expandedPaths = new Set();
let selectedFilePath = '';
let currentSortMode = 'alphabetical';
let showHiddenFiles = false;

export function initFileTree(EventBus) {
  console.log('📂 Flat File Tree initialized with Seamless Refresh');
  injectStyles();
  ensureHeaderExists();
  loadTree();
  EventBus.subscribe('file-tree:refresh', () => {
    loadTree();
  });
}

export function toggleFileTree() {
  const leftDrawer = document.getElementById('left-drawer');
  const leftOverlay = document.getElementById('left-overlay');
  if (leftDrawer) leftDrawer.classList.toggle('active');
  if (leftOverlay) leftOverlay.classList.toggle('active');
  if (leftDrawer && leftDrawer.classList.contains('active')) {
    loadTree();
  }
}

export function openFileTree() {
  const leftDrawer = document.getElementById('left-drawer');
  const leftOverlay = document.getElementById('left-overlay');
  if (leftDrawer) leftDrawer.classList.add('active');
  if (leftOverlay) leftOverlay.classList.add('active');
  loadTree();
}

export function closeFileTree() {
  const leftDrawer = document.getElementById('left-drawer');
  const leftOverlay = document.getElementById('left-overlay');
  if (leftDrawer) leftDrawer.classList.remove('active');
  if (leftOverlay) leftOverlay.classList.remove('active');
}

function showToast(message, isError = false) {
  const existingToast = document.getElementById('file-tree-toast');
  if (existingToast) existingToast.remove();

  const toast = document.createElement('div');
  toast.id = 'file-tree-toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #252526;
    color: ${isError ? '#f14c4c' : '#cccccc'};
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 12px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    border: 1px solid #454545;
    pointer-events: none;
    transition: opacity 0.3s ease;
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

function injectStyles() {
  if (document.getElementById('file-tree-styles')) return;
  const style = document.createElement('style');
  style.id = 'file-tree-styles';
  style.textContent = `
    #file-tree-content {
      overflow-x: auto !important;
      overflow-y: auto;
      flex: 1;
      height: 100%;
      scrollbar-width: thin;
      direction: ltr;
      padding: 4px 0;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      background: #1e1e1e;
      -webkit-tap-highlight-color: transparent !important;
      -webkit-touch-callout: none !important;
      -webkit-user-select: none !important;
      user-select: none !important;
    }
    #file-tree-content::-webkit-scrollbar {
      height: 3px;
      width: 3px;
      background: transparent;
    }
    #file-tree-content::-webkit-scrollbar-thumb {
      background: #424242;
      border-radius: 2px;
    }
    .tree-flat-container {
      display: flex;
      flex-direction: column;
      padding: 0;
      margin: 0;
      width: 100%;
    }
    .tree-row {
      display: flex;
      align-items: center;
      padding: 0 4px;
      cursor: pointer;
      transition: background 0.1s;
      min-height: 24px;
      height: 24px;
      white-space: nowrap;
      width: max-content;
      min-width: 100%;
      box-sizing: border-box;
      overflow: hidden !important;
      position: relative;
      -webkit-user-select: none !important;
      user-select: none !important;
      -webkit-tap-highlight-color: transparent !important;
      outline: none !important;
    }
    .tree-row:hover { background: #2a2a2a; }
    .tree-row.selected { background: #37373d !important; }
    .indent-guide-box {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 24px;
      flex-shrink: 0;
      box-sizing: border-box;
      position: relative;
    }
    .line-active::before {
      content: "";
      position: absolute;
      left: 7px;
      top: 0;
      bottom: 0;
      width: 1px;
      background-color: #3d444d;
    }
    .line-last-child::before { bottom: 50% !important; }
    .line-horizontal-tick::after {
      content: "";
      position: absolute;
      left: 7px;
      top: 50%;
      width: 9px;
      height: 1px;
      background-color: #3d444d;
    }
    .folder-arrow {
      font-size: 8px;
      width: 12px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #858585;
      flex-shrink: 0;
      transition: transform 0.1s ease;
      line-height: 24px;
    }
    .folder-arrow.expanded { transform: rotate(90deg); }
    .folder-icon, .file-icon {
      font-size: 14px;
      width: 16px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 4px;
      flex-shrink: 0;
      line-height: 24px;
    }
    .item-name {
      color: #cccccc;
      font-size: 13px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 24px;
      display: inline-block;
    }
    .tree-empty { color: #888; padding: 12px 8px; font-size: 13px; }
    .tree-header-wrapper {
      display: flex;
      flex-direction: column;
      border-bottom: 1px solid #2d2d2d;
      background: #1e1e1e;
      padding-bottom: 4px;
      flex-shrink: 0;
    }
    .tree-header {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      padding: 6px 10px;
      min-height: 32px;
    }
    .tree-header-actions { display: flex; align-items: center; gap: 6px; }
    .tree-action-btn {
      background: none; border: none; color: #aaa; font-size: 11px; cursor: pointer;
      padding: 3px 6px; border-radius: 4px; text-transform: uppercase; font-weight: 600;
    }
    .tree-action-btn:hover { background: #2d2d2d; color: #fff; }
    .tree-icon-btn {
      background: none; border: none; color: #aaa; font-size: 15px; cursor: pointer;
      padding: 2px 4px; line-height: 1; border-radius: 4px;
    }
    .tree-icon-btn:hover { background: #2d2d2d; color: #fff; }
    .tree-search-container { padding: 0 8px 4px 8px; box-sizing: border-box; width: 100%; }
    .tree-search-input {
      width: 100%; background: #252526; border: 1px solid #3c3c3c; color: #cccccc;
      border-radius: 3px; padding: 4px 6px; font-size: 12px; outline: none; box-sizing: border-box;
    }
    .tree-search-input:focus { border-color: #007acc; }
    .tree-dropdown {
      display: none; position: absolute; top: 100%; right: 0; background: #252526;
      border: 1px solid #454545; border-radius: 4px; padding: 4px 0; min-width: 150px;
      z-index: 100; box-shadow: 0 4px 8px rgba(0,0,0,0.4);
    }
    .tree-dropdown button {
      display: block; width: 100%; background: none; border: none; color: #cccccc;
      padding: 6px 12px; text-align: left; font-size: 13px; cursor: pointer;
    }
    .tree-dropdown button:hover { background: #37373d; color: #fff; }
    .tree-dropdown button.active-opt { color: #007acc; font-weight: bold; }
    .tree-dropdown.show { display: block; }
    #left-drawer { display: flex; flex-direction: column; overflow: hidden; background: #1e1e1e; }
  `;
  document.head.appendChild(style);
}

function getSelectedFilePath() {
  const activeTab = document.querySelector('.tab-item.active');
  return activeTab ? activeTab.dataset.file || '' : '';
}

function checkPathExists(nodes, targetPath, currentPath = '') {
  if (!nodes) return false;
  for (const node of nodes) {
    const nodePath = currentPath ? `${currentPath}/${node.name}` : node.name;
    if (nodePath === targetPath) return true;
    if (node.type === 'folder' && node.children) {
      if (checkPathExists(node.children, targetPath, nodePath)) return true;
    }
  }
  return false;
}

function sortNodes(nodes) {
  if (!nodes || nodes.length === 0) return [];
  let nodesCopy = [...nodes];
  if (!showHiddenFiles) {
    nodesCopy = nodesCopy.filter(node => !node.name.startsWith('.'));
  }
  nodesCopy.sort((a, b) => {
    if (currentSortMode === 'files-first') {
      if (a.type !== 'folder' && b.type === 'folder') return -1;
      if (a.type === 'folder' && b.type !== 'folder') return 1;
    } else {
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;
    }
    if (currentSortMode === 'extension' && a.type !== 'folder' && b.type !== 'folder') {
      const extA = a.name.split('.').pop().toLowerCase();
      const extB = b.name.split('.').pop().toLowerCase();
      const extCompare = extA.localeCompare(extB);
      if (extCompare !== 0) return extCompare;
    }
    return a.name.localeCompare(b.name);
  });
  nodesCopy.forEach(node => {
    if (node.children) node.children = sortNodes(node.children);
  });
  return nodesCopy;
}

function loadTree() {
  const container = document.getElementById('file-tree-content');
  if (!container) return;
  selectedFilePath = getSelectedFilePath();
  
  // Only show loading placeholder if container is completely empty and has no loaded tree yet
  const existingFlatDiv = container.querySelector('.tree-flat-container');
  if ((!treeData || treeData.length === 0) && !existingFlatDiv) {
    container.innerHTML = '<p class="tree-empty">⏳ Loading...</p>';
  }

  fetch('http://localhost:3000/list-tree')
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        showToast(`❌ ${data.error}`, true);
        return;
      }
      treeData = data.tree || [];
      
      let flatDiv = container.querySelector('.tree-flat-container');
      if (!flatDiv) {
        container.innerHTML = '';
        flatDiv = document.createElement('div');
        flatDiv.className = 'tree-flat-container';
        container.appendChild(flatDiv);
      } else {
        flatDiv.innerHTML = '';
      }

      const processedTree = sortNodes(treeData);
      buildFlatTree(flatDiv, processedTree, '', [], true);
      
      const searchInput = document.getElementById('file-tree-search');
      if (searchInput && searchInput.value) {
        filterTreeDOM(searchInput.value);
      }
    })
    .catch(() => {
      if (!treeData || treeData.length === 0 && !container.querySelector('.tree-flat-container')) {
        container.innerHTML = '<p class="tree-empty">📂 No files saved yet</p>';
      }
    });
}

function buildFlatTree(containerElement, nodes, parentPath = '', ancestorIsLast = [], isVisible = true) {
  if (!nodes || nodes.length === 0) return;
  const depth = ancestorIsLast.length;

  nodes.forEach((node, index) => {
    const isLastItem = (index === nodes.length - 1);
    const fullPath = parentPath ? `${parentPath}/${node.name}` : node.name;
    const isExpanded = expandedPaths.has(fullPath);

    const row = document.createElement('div');
    row.className = 'tree-row';
    row.dataset.path = fullPath;
    row.dataset.parent = parentPath;
    row.dataset.type = node.type;
    
    if (!isVisible) row.style.display = 'none';

    for (let i = 0; i < depth; i++) {
      const spacer = document.createElement('div');
      spacer.className = 'indent-guide-box';
      if (!ancestorIsLast[i]) spacer.className += ' line-active';
      row.appendChild(spacer);
    }

    if (depth > 0) {
      const immediateSpacer = document.createElement('div');
      immediateSpacer.className = 'indent-guide-box line-active line-horizontal-tick';
      if (isLastItem) immediateSpacer.className += ' line-last-child';
      row.appendChild(immediateSpacer);
    }

    row.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });

    if (node.type === 'folder') {
      const arrow = document.createElement('span');
      arrow.className = 'folder-arrow';
      if (isExpanded) arrow.classList.add('expanded');
      arrow.textContent = '▶';

      const icon = document.createElement('span');
      icon.className = 'folder-icon';
      icon.textContent = '📁';

      const name = document.createElement('span');
      name.className = 'item-name';
      name.textContent = node.name;

      row.appendChild(arrow);
      row.appendChild(icon);
      row.appendChild(name);
      containerElement.appendChild(row);

      row.addEventListener('click', (e) => {
        e.stopPropagation();
        const searchInput = document.getElementById('file-tree-search');
        if (searchInput && searchInput.value.trim() !== '') return;

        if (expandedPaths.has(fullPath)) {
          expandedPaths.delete(fullPath);
          arrow.classList.remove('expanded');
          collapseFlatFolder(fullPath);
        } else {
          expandedPaths.add(fullPath);
          arrow.classList.add('expanded');
          expandFlatFolder(fullPath);
        }
      });

      setupLongPress(row, fullPath, node.type, containerElement);

      if (node.children && node.children.length > 0) {
        buildFlatTree(containerElement, node.children, fullPath, [...ancestorIsLast, isLastItem], isVisible && isExpanded);
      }
    } else {
      const iconMap = {
        'js':'📄','html':'🌐','css':'🎨','json':'📋','md':'📝','txt':'📃',
        'py':'🐍','java':'☕','c':'⚙️','cpp':'⚙️','sh':'⚡','xml':'📰'
      };
      const ext = node.name.split('.').pop().toLowerCase();

      const arrowPlaceholder = document.createElement('div');
      arrowPlaceholder.className = 'folder-arrow';
      row.appendChild(arrowPlaceholder);

      const icon = document.createElement('span');
      icon.className = 'file-icon';
      icon.textContent = iconMap[ext] || '📄';

      const name = document.createElement('span');
      name.className = 'item-name';
      name.textContent = node.name;

      row.appendChild(icon);
      row.appendChild(name);

      if (fullPath === selectedFilePath || node.name === selectedFilePath) {
        row.classList.add('selected');
      }

      containerElement.appendChild(row);

      row.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.tree-row.selected').forEach(el => el.classList.remove('selected'));
        row.classList.add('selected');

        if (window.openFile) {
          window.openFile(fullPath);
        }
      });

      setupLongPress(row, fullPath, node.type, containerElement);
    }
  });
}

function expandFlatFolder(parentPath) {
  const rows = document.querySelectorAll('.tree-row');
  rows.forEach(row => {
    if (row.dataset.parent === parentPath) {
      row.style.display = 'flex';
      if (row.dataset.type === 'folder' && expandedPaths.has(row.dataset.path)) {
        expandFlatFolder(row.dataset.path);
      }
    }
  });
}

function collapseFlatFolder(parentPath) {
  const rows = document.querySelectorAll('.tree-row');
  rows.forEach(row => {
    if (row.dataset.path.startsWith(parentPath + '/')) {
      row.style.display = 'none';
    }
  });
}

function filterTreeDOM(queryText) {
  const cleanQuery = queryText.trim().toLowerCase();
  const rows = document.querySelectorAll('.tree-row');

  if (cleanQuery === '') {
    rows.forEach(row => {
      const parent = row.dataset.parent;
      if (!parent) {
        row.style.display = 'flex';
      } else {
        let currentParent = parent;
        let visible = true;
        while (currentParent) {
          if (!expandedPaths.has(currentParent)) {
            visible = false;
            break;
          }
          const parentRow = document.querySelector(`.tree-row[data-path="${currentParent}"]`);
          currentParent = parentRow ? parentRow.dataset.parent : '';
        }
        row.style.display = visible ? 'flex' : 'none';
      }
    });
    return;
  }

  rows.forEach(row => {
    const itemName = row.querySelector('.item-name').textContent.toLowerCase();
    row.style.display = itemName.includes(cleanQuery) ? 'flex' : 'none';
  });
}

function updateSortMenuUI() {
  ['alphabetical', 'extension', 'files-first'].forEach(mode => {
    const btn = document.getElementById(`sort-opt-${mode}`);
    if (btn) {
      if (currentSortMode === mode) btn.classList.add('active-opt');
      else btn.classList.remove('active-opt');
    }
  });
  const hiddenBtn = document.getElementById('sort-opt-hidden');
  if (hiddenBtn) {
    if (showHiddenFiles) hiddenBtn.classList.add('active-opt');
    else hiddenBtn.classList.remove('active-opt');
  }
}

function ensureHeaderExists() {
  const container = document.getElementById('file-tree-content');
  if (!container) return;
  if (document.getElementById('file-tree-header-wrapper')) return;

  const wrapper = document.createElement('div');
  wrapper.id = 'file-tree-header-wrapper';
  wrapper.className = 'tree-header-wrapper';

  const header = document.createElement('div');
  header.className = 'tree-header';

  const actionsContainer = document.createElement('div');
  actionsContainer.className = 'tree-header-actions';

  const collapseBtn = document.createElement('button');
  collapseBtn.className = 'tree-action-btn';
  collapseBtn.textContent = 'Collapse';
  collapseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    expandedPaths.clear();
    document.querySelectorAll('.folder-arrow').forEach(arrow => arrow.classList.remove('expanded'));
    const searchInput = document.getElementById('file-tree-search');
    if (searchInput) searchInput.value = '';
    document.querySelectorAll('.tree-row').forEach(row => {
      row.style.display = row.dataset.parent ? 'none' : 'flex';
    });
  });
  actionsContainer.appendChild(collapseBtn);

  const sortContainer = document.createElement('div');
  sortContainer.style.cssText = 'position:relative;display:inline-block;';

  const sortBtn = document.createElement('button');
  sortBtn.className = 'tree-icon-btn';
  sortBtn.textContent = '⚙️';
  sortBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownPlus.classList.remove('show');
    dropdownSort.classList.toggle('show');
    updateSortMenuUI();
  });
  sortContainer.appendChild(sortBtn);

  const dropdownSort = document.createElement('div');
  dropdownSort.id = 'tree-sort-dropdown';
  dropdownSort.className = 'tree-dropdown';

  const optAlpha = document.createElement('button');
  optAlpha.id = 'sort-opt-alphabetical';
  optAlpha.textContent = '🔤 Alphabetical';
  optAlpha.addEventListener('click', (e) => {
    e.stopPropagation();
    currentSortMode = 'alphabetical';
    dropdownSort.classList.remove('show');
    loadTree();
  });
  dropdownSort.appendChild(optAlpha);

  const optExt = document.createElement('button');
  optExt.id = 'sort-opt-extension';
  optExt.textContent = '🧩 By Extension';
  optExt.addEventListener('click', (e) => {
    e.stopPropagation();
    currentSortMode = 'extension';
    dropdownSort.classList.remove('show');
    loadTree();
  });
  dropdownSort.appendChild(optExt);

  const optFilesFirst = document.createElement('button');
  optFilesFirst.id = 'sort-opt-files-first';
  optFilesFirst.textContent = '📄 Files First';
  optFilesFirst.addEventListener('click', (e) => {
    e.stopPropagation();
    currentSortMode = 'files-first';
    dropdownSort.classList.remove('show');
    loadTree();
  });
  dropdownSort.appendChild(optFilesFirst);

  const divider = document.createElement('div');
  divider.style.cssText = 'border-top: 1px solid #454545; margin: 4px 0;';
  dropdownSort.appendChild(divider);

  const optHidden = document.createElement('button');
  optHidden.id = 'sort-opt-hidden';
  optHidden.textContent = '👁️ Show Hidden';
  optHidden.addEventListener('click', (e) => {
    e.stopPropagation();
    showHiddenFiles = !showHiddenFiles;
    dropdownSort.classList.remove('show');
    loadTree();
  });
  dropdownSort.appendChild(optHidden);

  sortContainer.appendChild(dropdownSort);
  actionsContainer.appendChild(sortContainer);

  const plusContainer = document.createElement('div');
  plusContainer.style.cssText = 'position:relative;display:inline-block;';

  const plusBtn = document.createElement('button');
  plusBtn.className = 'tree-icon-btn';
  plusBtn.style.fontSize = '16px';
  plusBtn.textContent = '+';
  plusBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownSort.classList.remove('show');
    dropdownPlus.classList.toggle('show');
  });
  plusContainer.appendChild(plusBtn);

  const dropdownPlus = document.createElement('div');
  dropdownPlus.id = 'tree-dropdown';
  dropdownPlus.className = 'tree-dropdown';

  const newFileBtn = document.createElement('button');
  newFileBtn.textContent = '📄 New File';
  newFileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownPlus.classList.remove('show');
    createNewFile();
  });
  dropdownPlus.appendChild(newFileBtn);

  const newFolderBtn = document.createElement('button');
  newFolderBtn.textContent = '📁 New Folder';
  newFolderBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownPlus.classList.remove('show');
    createNewFolder();
  });
  dropdownPlus.appendChild(newFolderBtn);

  plusContainer.appendChild(dropdownPlus);
  actionsContainer.appendChild(plusContainer);
  header.appendChild(actionsContainer);
  wrapper.appendChild(header);

  const searchContainer = document.createElement('div');
  searchContainer.className = 'tree-search-container';

  const searchInput = document.createElement('input');
  searchInput.id = 'file-tree-search';
  searchInput.className = 'tree-search-input';
  searchInput.type = 'text';
  searchInput.placeholder = 'Filter files by name...';
  searchInput.autocomplete = 'off';
  searchInput.addEventListener('input', (e) => filterTreeDOM(e.target.value));

  searchContainer.appendChild(searchInput);
  wrapper.appendChild(searchContainer);

  container.parentNode.insertBefore(wrapper, container);

  document.addEventListener('click', function closeDropdowns(e) {
    if (dropdownPlus.classList.contains('show') && !dropdownPlus.contains(e.target) && e.target !== plusBtn) {
      dropdownPlus.classList.remove('show');
    }
    if (dropdownSort.classList.contains('show') && !dropdownSort.contains(e.target) && e.target !== sortBtn) {
      dropdownSort.classList.remove('show');
    }
  });
}

function setupLongPress(element, fullPath, type, container) {
  let longPressTimer = null;
  const startPress = (e) => {
    longPressTimer = setTimeout(() => showContextMenu(e, fullPath, type, container), 500);
  };
  const endPress = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  };
  element.addEventListener('touchstart', startPress, { passive: true });
  element.addEventListener('touchend', endPress, { passive: true });
  element.addEventListener('touchmove', endPress, { passive: true });
  element.addEventListener('mousedown', startPress);
  element.addEventListener('mouseup', endPress);
  element.addEventListener('mouseleave', endPress);
}

function showContextMenu(e, fullPath, type, container) {
  const existing = document.getElementById('file-context-menu');
  if (existing) existing.remove();

  const menu = document.createElement('div');
  menu.id = 'file-context-menu';
  let x = e.touches ? e.touches[0].clientX : (e.clientX || 0);
  let y = e.touches ? e.touches[0].clientY : (e.clientY || 0);
  if (x + 160 > window.innerWidth) x = window.innerWidth - 160;
  if (y + 140 > window.innerHeight) y = window.innerHeight - 140;

  menu.style.cssText = `
    position: fixed; top: ${y}px; left: ${x}px; background: #252526;
    border: 1px solid #454545; border-radius: 4px; padding: 4px 0;
    min-width: 150px; z-index: 9999; box-shadow: 0 4px 16px rgba(0,0,0,0.6);
  `;

  const items = type === 'folder' ? [
    { label: '📄 New File', action: () => { menu.remove(); createNewFile(fullPath); } },
    { label: '📁 New Folder', action: () => { menu.remove(); createNewFolder(fullPath); } },
    { label: '✏️ Rename', action: () => { menu.remove(); renameItem(fullPath, type, container); } },
    { label: '🗑️ Delete', action: () => { menu.remove(); deleteItem(fullPath, type, container); } }
  ] : [
    { label: '✏️ Rename', action: () => { menu.remove(); renameItem(fullPath, type, container); } },
    { label: '🗑️ Delete', action: () => { menu.remove(); deleteItem(fullPath, type, container); } }
  ];

  items.forEach(item => {
    const btn = document.createElement('button');
    btn.textContent = item.label;
    btn.style.cssText = `
      display:block;width:100%;background:none;border:none;color:#ccc;padding:8px 16px;
      text-align:left;font-size:13px;cursor:pointer;font-family:inherit;
    `;
    btn.addEventListener('mouseenter', () => { btn.style.background = '#37373d'; });
    btn.addEventListener('mouseleave', () => { btn.style.background = 'transparent'; });
    btn.addEventListener('click', (e) => { e.stopPropagation(); item.action(); });
    btn.addEventListener('touchstart', (e) => { e.stopPropagation(); item.action(); }, { passive: true });
    menu.appendChild(btn);
  });

  document.body.appendChild(menu);
  setTimeout(() => {
    document.addEventListener('click', function closeMenu() {
      menu.remove();
      document.removeEventListener('click', closeMenu);
    });
  }, 10);
}

function createNewFile(parentPath = '') {
  const name = prompt('Enter file name:', 'newfile.js');
  if (!name) return;
  const filePath = parentPath ? `${parentPath}/${name}` : name;
  
  if (checkPathExists(treeData, filePath)) {
    showToast(`⚠️ File "${name}" already exists.`, true);
    return;
  }

  const emptyContent = `// ${name} created\n`;
  fetch('http://localhost:3000/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filePath, content: emptyContent })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      loadTree();
      showToast(`📄 Created file: ${name}`);
    } else {
      showToast(`❌ Create failed: ${data.error}`, true);
    }
  })
  .catch(() => showToast('❌ Error connecting to backend.', true));
}

function createNewFolder(parentPath = '') {
  const name = prompt('Enter folder name:', 'new-folder');
  if (!name) return;
  const folderPath = parentPath ? `${parentPath}/${name}` : name;
  
  if (checkPathExists(treeData, folderPath)) {
    showToast(`⚠️ Folder "${name}" already exists.`, true);
    return;
  }

  fetch('http://localhost:3000/create-folder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folderPath })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      loadTree();
      expandedPaths.add(parentPath);
      showToast(`📁 Created folder: ${name}`);
    } else {
      showToast(`❌ Create folder failed: ${data.error}`, true);
    }
  })
  .catch(() => showToast('❌ Error connecting to backend.', true));
}

function renameItem(oldPath, type, container) {
  const name = prompt(`Rename ${type}:`, oldPath.split('/').pop());
  if (!name || name === oldPath.split('/').pop()) return;
  const newPath = oldPath.replace(/[^/]+$/, name);
  
  if (checkPathExists(treeData, newPath)) {
    showToast(`⚠️ A ${type} named "${name}" already exists.`, true);
    return;
  }

  fetch('http://localhost:3000/rename', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldPath, newPath })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      loadTree();
      showToast(`✏️ Renamed successfully`);
    } else {
      showToast(`❌ Rename failed: ${data.error}`, true);
    }
  })
  .catch(() => showToast('❌ Error connecting to backend.', true));
}

function deleteItem(targetPath, type, container) {
  if (!confirm(`Delete ${type} "${targetPath}"?`)) return;
  fetch('http://localhost:3000/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: targetPath })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      loadTree();
      showToast(`🗑️ Deleted successfully`);
    } else {
      showToast(`❌ Delete failed: ${data.error}`, true);
    }
  })
  .catch(() => showToast('❌ Error connecting to backend.', true));
}

export function refreshFileTree() {
  loadTree();
}
