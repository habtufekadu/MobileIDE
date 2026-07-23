export let recentFiles = [];
let isSaving = false;

function showOutput(text) {
  const outputOverlay = document.getElementById('output-overlay');
  const outputContent = document.getElementById('output-content');
  if (outputContent) outputContent.textContent = text;
  if (outputOverlay) outputOverlay.classList.add('show');
}

function promptUI(title, defaultValue, callback) {
  const container = document.getElementById('output-overlay');
  const contentArea = document.getElementById('output-content');
  if (!container || !contentArea) return;

  contentArea.innerHTML = `
    <div style="text-align: left; padding: 5px;">
      <div style="font-weight: bold; margin-bottom: 12px; color: #fff;">${title}</div>
      <input type="text" id="custom-modal-input" value="${defaultValue}" style="width: 100%; background: #1e1e1e; color: #fff; border: 1px solid #555; padding: 10px; border-radius: 4px; font-family: inherit; font-size: 14px; margin-bottom: 15px; box-sizing: border-box;" />
      <div style="display: flex; justify-content: flex-end; gap: 10px;">
        <button id="custom-modal-cancel" style="background: #444; color: #fff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Cancel</button>
        <button id="custom-modal-confirm" style="background: #007acc; color: #fff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Confirm</button>
      </div>
    </div>
  `;
  container.classList.add('show');

  const inputEl = document.getElementById('custom-modal-input');
  setTimeout(() => { if (inputEl) { inputEl.focus(); inputEl.select(); } }, 150);

  const cleanUp = () => { container.classList.remove('show'); };

  document.getElementById('custom-modal-cancel')?.addEventListener('click', () => { cleanUp(); });
  document.getElementById('custom-modal-confirm')?.addEventListener('click', () => {
    const val = inputEl ? inputEl.value.trim() : '';
    cleanUp();
    if (val) callback(val);
  });
}

export function saveFile(fileName, content, showFeedback = true, refreshTreeCallback) {
  return new Promise((resolve, reject) => {
    if (isSaving) {
      if (showFeedback) showOutput('⏳ Save already in progress...');
      resolve({ success: false, message: 'Save already in progress' });
      return;
    }
    isSaving = true;
    if (showFeedback) showOutput('💾 Saving...');

    fetch('http://localhost:3000/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName, content })
    })
    .then(response => response.json())
    .then(data => {
      isSaving = false;
      if (data.success) {
        if (showFeedback) showOutput(`✅ Saved: ${fileName}`);
        if (refreshTreeCallback) refreshTreeCallback();
        resolve({ success: true, message: 'Saved' });
      } else {
        if (showFeedback) showOutput(`❌ Save failed: ${data.error}`);
        resolve({ success: false, message: data.error });
      }
    })
    .catch(err => {
      isSaving = false;
      if (showFeedback) showOutput('❌ Error connecting to backend. Ensure Termux Node server is running.');
      console.error('Save error:', err);
      resolve({ success: false, message: err.message });
    });
  });
}

export function openFile(fileName, openTabCallback, refreshRecentCallback) {
  fetch(`http://localhost:3000/load?fileName=${encodeURIComponent(fileName)}`)
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        showOutput(`❌ Failed to load file: ${data.error}`);
        return;
      }
      if (!recentFiles.includes(fileName)) {
        recentFiles.unshift(fileName);
        if (recentFiles.length > 10) recentFiles.pop();
        if (refreshRecentCallback) refreshRecentCallback();
      }
      if (openTabCallback) openTabCallback(fileName, data.content || '');
      showOutput(`✅ Loaded: ${fileName}`);
    })
    .catch(err => {
      showOutput('❌ Error loading file. Ensure Termux Node server is running.');
      console.error('Load error:', err);
    });
}

export function showRecentFiles(openFileCallback) {
  if (recentFiles.length === 0) {
    showOutput('📂 No recent files found.');
    return;
  }
  
  const container = document.getElementById('output-overlay');
  const contentArea = document.getElementById('output-content');
  if (!container || !contentArea) return;

  let itemsHtml = recentFiles.map(file => `
    <button class="recent-file-item-btn" data-file="${file}" style="display: block; width: 100%; background: #1e1e1e; border: 1px solid #333; color: #ccc; text-align: left; padding: 10px 14px; margin-bottom: 6px; border-radius: 4px; font-family: monospace; font-size: 13px; cursor: pointer;">
      📄 ${file}
    </button>
  `).join('');

  contentArea.innerHTML = `
    <div style="padding: 5px;">
      <div style="font-weight: bold; margin-bottom: 12px; color: #fff;">📂 Select Recent File</div>
      <div style="max-height: 200px; overflow-y: auto; margin-bottom: 15px;">${itemsHtml}</div>
      <button id="recent-files-close-btn" style="background: #444; color: #fff; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; float: right;">Close</button>
      <div style="clear: both;"></div>
    </div>
  `;
  container.classList.add('show');

  document.getElementById('recent-files-close-btn')?.addEventListener('click', () => container.classList.remove('show'));
  
  contentArea.querySelectorAll('.recent-file-item-btn').forEach(btn => {
    const handler = () => {
      container.classList.remove('show');
      if (openFileCallback) openFileCallback(btn.dataset.file);
    };
    btn.addEventListener('click', handler);
    btn.addEventListener('touchstart', handler);
  });
}

export function handleSaveAs(fileName, content, saveFunction, openTabCallback, closeTabCallback) {
  promptUI('Enter new file name:', fileName, (newName) => {
    if (newName === fileName) return;
    saveFunction(newName, content, true).then(result => {
      if (result.success) {
        if (openTabCallback) openTabCallback(newName, content);
        const activeTab = document.querySelector('.tab-item.active');
        if (activeTab && closeTabCallback) {
          const tabId = parseInt(activeTab.dataset.tabId);
          closeTabCallback(tabId);
        }
      }
    });
  });
}

export function handleSave(editor, saveFunction) {
  if (!editor) {
    showOutput('❌ Editor layout not ready.');
    return;
  }
  const activeTab = document.querySelector('.tab-item.active');
  if (!activeTab) {
    showOutput('❌ No active file is currently open.');
    return;
  }
  const fileName = activeTab.dataset.file;
  const content = editor.getValue();
  saveFunction(fileName, content, true);
}

export function createNewFile(fileName, openTabCallback, refreshTreeCallback) {
  const emptyContent = `// ${fileName} created\n`;
  saveFile(fileName, emptyContent, true, refreshTreeCallback).then(result => {
    if (result.success) {
      if (openTabCallback) openTabCallback(fileName, emptyContent);
      if (refreshTreeCallback) refreshTreeCallback();
    }
  });
}
