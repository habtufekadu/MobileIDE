export function initFileMenu({ 
  getEditor, 
  saveFile, 
  openFile, 
  toggleFileTree, 
  handleSave, 
  handleSaveAs, 
  showRecentFiles 
}) {
  console.log('📂 File Menu initializing...');

  const toolbarRight = document.getElementById('toolbar-right');
  if (!toolbarRight) return;

  const oldMenuBtn = document.getElementById('file-menu-btn');
  if (oldMenuBtn) oldMenuBtn.remove();
  const oldSaveBtn = document.getElementById('save-btn');
  if (oldSaveBtn) oldSaveBtn.remove();
  const oldFilesBtn = document.getElementById('files-btn');
  if (oldFilesBtn) oldFilesBtn.remove();

  const menuBtn = document.createElement('button');
  menuBtn.id = 'file-menu-btn';
  menuBtn.className = 'toolbar-icon';
  menuBtn.textContent = '📂';
  menuBtn.setAttribute('aria-label', 'File Menu');
  
  const settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) {
    toolbarRight.insertBefore(menuBtn, settingsBtn.nextSibling);
  } else {
    toolbarRight.appendChild(menuBtn);
  }

  menuBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    const existingMenu = document.getElementById('file-menu-dropdown');
    if (existingMenu) {
      existingMenu.remove();
      return;
    }

    const btnRect = this.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.id = 'file-menu-dropdown';
    menu.style.cssText = `
      position: fixed;
      top: ${btnRect.bottom}px;
      right: ${window.innerWidth - btnRect.right}px;
      background: #2d2d2d;
      border: 1px solid #3d3d3d;
      border-radius: 8px;
      padding: 8px 0;
      min-width: 160px;
      z-index: 9999;
      box-shadow: 0 4px 20px rgba(0,0,0,0.8);
    `;

    const items = [
      { label: '💾 Save', action: () => handleSave(getEditor(), saveFile) },
      { label: '📂 Save As', action: () => {
          const editor = getEditor();
          if (!editor) { console.warn('Editor component unmounted.'); return; }
          const activeTab = document.querySelector('.tab-item.active');
          if (!activeTab) { return; }
          const fileName = activeTab.dataset.file;
          const content = editor.getValue();
          handleSaveAs(fileName, content, saveFile, (newName, newContent) => {
            if (window.openTab) window.openTab(newName, newContent);
          }, (tabId) => {
            if (window.closeTabById) window.closeTabById(tabId);
          });
        }
      },
      { label: '📂 Recent Files', action: () => showRecentFiles(openFile) },
      { label: '📁 Open Folder', action: () => toggleFileTree() },
    ];

    items.forEach(item => {
      const btn = document.createElement('button');
      btn.textContent = item.label;
      btn.style.cssText = `
        display: block;
        width: 100%;
        background: none;
        border: none;
        color: #ccc;
        padding: 10px 16px;
        text-align: left;
        font-size: 14px;
        cursor: pointer;
        font-family: inherit;
      `;
      
      const selectAction = (ev) => {
        ev.stopPropagation();
        item.action();
        menu.remove();
      };

      btn.addEventListener('click', selectAction);
      btn.addEventListener('touchstart', selectAction);
      menu.appendChild(btn);
    });

    document.body.appendChild(menu);

    setTimeout(() => {
      document.addEventListener('click', function closeMenu() {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      });
    }, 10);
  });

  console.log('✅ File Menu button injected and ready.');
}
