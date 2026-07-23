import { EventBus } from './event-bus.js';
import { initEditor, editor, setEditorContent, getEditorContent } from '../features/editor/editor.js';
import { initSettings, openSettings, closeSettings } from '../features/settings/settings.js';
import { initTerminal, openTerminal } from '../features/terminal/terminal.js';
import { initFileTree, toggleFileTree, openFileTree, closeFileTree, refreshFileTree } from '../features/file-tree/file-tree.js';
import { initTheme, toggleTheme, setTheme, currentTheme } from '../features/theme-selector/theme-selector.js';

import { 
  openTabs, activeTabId, tabContents, isDirty, 
  createTab, switchTab, closeTab, setDirty, getActiveTabInfo 
} from '../features/editor/tabs.js';

import { 
  recentFiles, 
  saveFile, 
  openFile, 
  handleSave, 
  handleSaveAs, 
  showRecentFiles,
  createNewFile 
} from '../features/file-manager/file-manager.js';

import { initFileMenu } from '../features/file-manager/file-menu.js';

export { 
  EventBus, 
  editor, 
  setEditorContent, 
  getEditorContent, 
  openSettings, 
  closeSettings, 
  openTerminal, 
  toggleFileTree, 
  openFileTree, 
  closeFileTree, 
  toggleTheme, 
  setTheme, 
  currentTheme,
  createTab,
  switchTab,
  closeTab,
  setDirty,
  saveFile,
  openFile,
  handleSave,
  handleSaveAs,
  showRecentFiles,
  createNewFile
};

window.editorModels = window.editorModels || {};
let autoSaveTimer = null;

function getOrCreateModel(fileName, content) {
  if (!window.monaco) return null;
  if (window.editorModels[fileName]) return window.editorModels[fileName];
  
  const lang = getLanguageFromExtension(fileName);
  const fileUri = window.monaco.Uri.file(fileName);
  
  let model = window.monaco.editor.getModel(fileUri);
  if (!model) {
    model = window.monaco.editor.createModel(content, lang, fileUri);
  } else {
    model.setValue(content);
  }
  
  window.editorModels[fileName] = model;
  return model;
}

window.openFile = (fileName) => {
  openFile(fileName, (name, content) => {
    ensureEditor();
    const tabId = createTab(name, content, (fname, c, feedback) => saveFile(fname, c, feedback, refreshFileTree));
    if (tabId) {
      const result = switchTab(tabId);
      if (result && editor) {
        showEditor();
        const model = getOrCreateModel(result.fileName, content);
        if (model) {
          editor.setModel(model);
        } else {
          const lang = getLanguageFromExtension(result.fileName);
          setEditorContent(content, lang);
        }
        setDirty(false);
      }
    }
    refreshFileTree();
  }, () => {});
};

window.openTab = (fileName, content) => {
  ensureEditor();
  const tabId = createTab(fileName, content, (fname, c, feedback) => saveFile(fname, c, feedback, refreshFileTree));
  if (tabId) {
    const result = switchTab(tabId);
    if (result && editor) {
      showEditor();
      const model = getOrCreateModel(result.fileName, content);
      if (model) {
        editor.setModel(model);
      } else {
        const lang = getLanguageFromExtension(result.fileName);
        setEditorContent(content, lang);
      }
      setDirty(false);
    }
  }
  refreshFileTree();
};

window.closeTabById = (tabId) => {
  const activeTab = document.querySelector(`.tab-item[data-tab-id="${tabId}"]`);
  if (activeTab && activeTab.dataset.file) {
    const filePath = activeTab.dataset.file;
    if (window.editorModels[filePath]) {
      window.editorModels[filePath].dispose();
      delete window.editorModels[filePath];
    }
  }

  closeTab(tabId);

  if (openTabs.length === 0) {
    if (editor) editor.setModel(null);
  } else {
    const activeInfo = getActiveTabInfo();
    if (activeInfo && window.editorModels[activeInfo.fileName]) {
      const nextModel = window.editorModels[activeInfo.fileName];
      if (editor && nextModel) {
        editor.setModel(nextModel);
      }
    }
  }
  refreshFileTree();
};

window.onTabChanged = (tabInfo) => {
    if (!editor) return;
    const model = window.editorModels[tabInfo.fileName];
    if (model) {
        editor.setModel(model);
        editor.focus();
    }
};

function getLanguageFromExtension(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  const map = {
    'js': 'javascript', 'html': 'html', 'css': 'css', 'json': 'json',
    'py': 'python', 'java': 'java', 'c': 'c', 'cpp': 'cpp',
    'md': 'markdown', 'xml': 'xml', 'yaml': 'yaml', 'sh': 'shell',
    'sql': 'sql', 'go': 'go', 'rb': 'ruby', 'php': 'php', 'rs': 'rust',
    'ts': 'typescript', 'jsx': 'javascript', 'tsx': 'typescript'
  };
  return map[ext] || 'plaintext';
}

let editorInitialized = false;

function ensureEditor() {
  if (!editorInitialized) {
    initEditor(EventBus);
    editorInitialized = true;
  }
}

function showEditor() {
  const editorContainer = document.getElementById('editor-container');
  if (editorContainer) editorContainer.style.display = 'block';
  if (editor) {
    setTimeout(() => editor.layout(), 100);
  }
}

export function initApp() {
  console.log('🚀 Bootstrapping IDE (Modular)...');

  ensureEditor();
  showEditor();

  initSettings(EventBus);
  initTerminal(EventBus);
  initFileTree(EventBus);
  initTheme(EventBus);

  document.getElementById('menu-btn')?.addEventListener('click', toggleFileTree);
  document.getElementById('settings-btn')?.addEventListener('click', () => {
    const rightDrawer = document.getElementById('right-drawer');
    const rightOverlay = document.getElementById('right-overlay');
    if (rightDrawer) rightDrawer.classList.toggle('active');
    if (rightOverlay) rightOverlay.classList.toggle('active');
    openSettings();
  });
  document.getElementById('terminal-btn')?.addEventListener('click', openTerminal);
  document.getElementById('left-overlay')?.addEventListener('click', toggleFileTree);
  document.getElementById('right-overlay')?.addEventListener('click', () => {
    const rightDrawer = document.getElementById('right-drawer');
    const rightOverlay = document.getElementById('right-overlay');
    if (rightDrawer) rightDrawer.classList.remove('active');
    if (rightOverlay) rightOverlay.classList.remove('active');
  });

  initFileMenu({
    getEditor: () => editor,
    saveFile: (fileName, content, showFeedback) => saveFile(fileName, content, showFeedback, refreshFileTree),
    openFile: (fileName) => {
      openFile(fileName, (name, content) => {
        ensureEditor();
        const tabId = createTab(name, content, (fname, c, feedback) => saveFile(fname, c, feedback, refreshFileTree));
        if (tabId) {
          switchTab(tabId);
          const model = getOrCreateModel(name, content);
          if (editor && model) {
            editor.setModel(model);
          } else {
            const lang = getLanguageFromExtension(name);
            setEditorContent(content, lang);
          }
          setDirty(false);
        }
        refreshFileTree();
      });
    },
    toggleFileTree,
    handleSave: (ed) => {
      if (!ed) { alert('Editor not ready.'); return; }
      const activeTab = document.querySelector('.tab-item.active');
      if (!activeTab) { alert('No file is open.'); return; }
      const fileName = activeTab.dataset.file;
      const content = ed.getValue();
      saveFile(fileName, content, true, refreshFileTree);
    },
    handleSaveAs: (fileName, content, saveFunc, openTabCb, closeTabCb) => {
      const newName = prompt('Enter new file name:', fileName);
      if (!newName || newName === fileName) return;
      saveFunc(newName, content, true, refreshFileTree).then(result => {
        if (result.success) {
          if (openTabCb) openTabCb(newName, content);
          const activeTab = document.querySelector('.tab-item.active');
          if (activeTab && closeTabCb) {
            const tabId = parseInt(activeTab.dataset.tabId);
            closeTabCb(tabId);
          }
          refreshFileTree();
        }
      });
    },
    showRecentFiles: (openFileFn) => {
      if (recentFiles.length === 0) {
        alert('📂 No recent files.');
        return;
      }
      const list = recentFiles.join('\n');
      const choice = prompt(`📂 Recent Files:\n${list}\n\nEnter a file name to open:`, recentFiles[0]);
      if (choice && recentFiles.includes(choice)) {
        if (openFileFn) openFileFn(choice);
      } else if (choice) {
        alert('File not in recent list.');
      }
    }
  });

  document.getElementById('run-btn')?.addEventListener('click', function() {
    if (!editor) {
      alert('Editor not ready.');
      return;
    }

    const activeTab = document.querySelector('.tab-item.active');
    const outputOverlay = document.getElementById('output-overlay');
    const outputContent = document.getElementById('output-content');
    const previewOverlay = document.getElementById('preview-overlay');
    const previewFrame = document.getElementById('preview-frame');

    if (!activeTab) {
      if (outputContent) outputContent.textContent = '⚠️ No file is open.';
      if (outputOverlay) outputOverlay.classList.add('show');
      return;
    }

    const fileName = activeTab.dataset.file;
    const code = editor.getValue();
    const ext = fileName.split('.').pop().toLowerCase();

    if (outputContent) outputContent.textContent = '⏳ Processing...';
    if (outputOverlay) outputOverlay.classList.add('show');

    if (ext === 'html') {
      const trimmed = code.trim();
      if (!trimmed.startsWith('<') && !trimmed.includes('<html') && !trimmed.includes('<!DOCTYPE')) {
        if (outputContent) outputContent.textContent = `⚠️ "${fileName}" does not appear to be valid HTML.`;
        return;
      }
      if (previewFrame) previewFrame.srcdoc = code;
      if (previewOverlay) previewOverlay.classList.add('show');
      if (outputContent) outputContent.textContent = `✅ HTML preview opened for ${fileName}`;
      return;
    }

    if (ext === 'css') {
      if (!code.trim()) {
        if (outputContent) outputContent.textContent = `⚠️ "${fileName}" is empty.`;
        return;
      }
      const htmlDoc = `<!DOCTYPE html><html><head><title>CSS Preview</title><style>${code}</style></head><body><h1>CSS Preview</h1><p>Your CSS is applied.</p><button>Button</button><div style="padding:20px;border:1px solid #333;">Sample</div></body></html>`;
      if (previewFrame) previewFrame.srcdoc = htmlDoc;
      if (previewOverlay) previewOverlay.classList.add('show');
      if (outputContent) outputContent.textContent = `✅ CSS preview opened for ${fileName}`;
      return;
    }

    if (ext === 'md') {
      if (!code.trim()) {
        if (outputContent) outputContent.textContent = `⚠️ "${fileName}" is empty.`;
        return;
      }
      const markdownHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Markdown Preview</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;background:#fff;color:#333;line-height:1.6;}h1,h2,h3{margin-top:24px;}pre{background:#f4f4f4;padding:16px;border-radius:8px;overflow:auto;}code{background:#f4f4f4;padding:2px 6px;border-radius:4px;}blockquote{border-left:4px solid #ddd;padding-left:16px;color:#666;}table{border-collapse:collapse;width:100%;}th,td{border:1px solid #ddd;padding:8px;text-align:left;}</style></head>
<body><div id="content">Loading markdown...</div>
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"><\/script>
<script>const markdown=${JSON.stringify(code)};document.getElementById('content').innerHTML=marked.parse(markdown);<\/script>
</body></html>
      `;
      if (previewFrame) previewFrame.srcdoc = markdownHtml;
      if (previewOverlay) previewOverlay.classList.add('show');
      if (outputContent) outputContent.textContent = `✅ Markdown preview opened for ${fileName}`;
      return;
    }

    if (ext === 'json') {
      try {
        JSON.parse(code);
        if (outputContent) outputContent.textContent = `✅ JSON is valid.`;
      } catch(e) {
        if (outputContent) outputContent.textContent = `❌ JSON Error: ${e.message}`;
      }
      return;
    }

    if (ext === 'js') {
      if (outputContent) outputContent.textContent = `⏳ Executing ${fileName}...`;
      const btn = this;
      btn.disabled = true;
      btn.textContent = '⏳';

      fetch('http://localhost:3000/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      })
      .then(response => response.json())
      .then(data => {
        btn.textContent = '▶';
        btn.disabled = false;
        if (outputContent) outputContent.textContent = `📄 ${fileName}\n\n` + (data.output || '✅ Code executed successfully (no output)');
      })
      .catch(err => {
        btn.textContent = '▶';
        btn.disabled = false;
        if (outputContent) outputContent.textContent = '❌ Error connecting to backend.';
        console.error(err);
      });
      return;
    }

    if (outputContent) outputContent.textContent = `ℹ️ No runner for "${ext}". Supported: .js, .html, .css, .json, .md`;
  });

  let isSelectMode = false;
  let activePointerId = null;
  let holdTimer = null;
  let repeatTimeout = null;
  let currentDirection = null;
  let isPointerDown = false;
  let holdStartTime = 0;

  function clearHoldAndRepeat() {
    if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
    if (repeatTimeout) { clearTimeout(repeatTimeout); repeatTimeout = null; }
    isPointerDown = false;
    activePointerId = null;
    currentDirection = null;
  }

  function moveCursor(direction) {
    if (!editor) return;
    const pos = editor.getPosition();
    const model = editor.getModel();
    if (!model) return;
    let newLine = pos.lineNumber;
    let newCol = pos.column;
    const maxLine = model.getLineCount();
    switch(direction) {
      case 'up':
        if (newLine > 1) { newLine--; const maxCol = model.getLineMaxColumn(newLine); newCol = Math.min(pos.column, maxCol); }
        break;
      case 'down':
        if (newLine < maxLine) { newLine++; const maxCol = model.getLineMaxColumn(newLine); newCol = Math.min(pos.column, maxCol); }
        break;
      case 'left':
        if (newCol > 1) { newCol--; } else if (newLine > 1) { newLine--; newCol = model.getLineMaxColumn(newLine); }
        break;
      case 'right':
        const currentMaxCol = model.getLineMaxColumn(newLine);
        if (newCol < currentMaxCol) { newCol++; } else if (newLine < maxLine) { newLine++; newCol = 1; }
        break;
    }
    const newPosition = { lineNumber: newLine, column: newCol };
    if (isSelectMode) {
      const currentSelection = editor.getSelection();
      const startPos = currentSelection.getStartPosition();
      editor.setSelection(new monaco.Selection(startPos.lineNumber, startPos.column, newPosition.lineNumber, newPosition.column));
    } else {
      editor.setPosition(newPosition);
    }
    editor.focus();
    editor.revealPosition(newPosition);
  }

  function scheduleNextMove(direction) {
    if (!isPointerDown || currentDirection !== direction) return;
    const elapsed = Date.now() - holdStartTime;
    let delay = 120;
    if (elapsed > 1500) delay = 40;
    else if (elapsed > 500) delay = 60;

    repeatTimeout = setTimeout(() => {
      if (isPointerDown && currentDirection === direction) {
        moveCursor(direction);
        scheduleNextMove(direction);
      }
    }, delay);
  }

  function onPointerDown(direction, e) {
    e.preventDefault();
    if (isPointerDown) return;
    const pointerId = e.pointerId || 0;
    activePointerId = pointerId;
    currentDirection = direction;
    isPointerDown = true;
    holdStartTime = Date.now();

    moveCursor(direction);

    holdTimer = setTimeout(() => {
      if (isPointerDown && currentDirection === direction) {
        scheduleNextMove(direction);
        holdTimer = null;
      }
    }, 300);
  }

  const btnIds = ['btn-up', 'btn-down', 'btn-left', 'btn-right'];
  const dirs = ['up', 'down', 'left', 'right'];
  btnIds.forEach((id, index) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('pointerdown', function(e) { onPointerDown(dirs[index], e); });
      btn.addEventListener('contextmenu', function(e) { e.preventDefault(); });
    }
  });

  const selectBtn = document.getElementById('btn-select');
  if (selectBtn) {
    selectBtn.addEventListener('click', function() {
      isSelectMode = !isSelectMode;
      this.classList.toggle('active');
      if (editor) editor.focus();
    });
  }

  document.addEventListener('pointerup', function(e) {
    if (isPointerDown && activePointerId === e.pointerId) clearHoldAndRepeat();
  });
  document.addEventListener('pointercancel', function(e) {
    if (isPointerDown && activePointerId === e.pointerId) clearHoldAndRepeat();
  });
  document.addEventListener('mouseleave', function() {
    if (isPointerDown) clearHoldAndRepeat();
  });
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) clearHoldAndRepeat();
  });

  EventBus.subscribe('editor:ready', () => {
    if (editor) {
      editor.onDidChangeModelContent(() => {
        if (activeTabId) {
          const content = editor.getValue();
          tabContents[activeTabId] = content;
          if (!isDirty) {
            setDirty(true);
          }
          if (autoSaveTimer) clearTimeout(autoSaveTimer);
          autoSaveTimer = setTimeout(() => {
            const activeTab = document.querySelector('.tab-item.active');
            if (activeTab) {
              const fileName = activeTab.dataset.file;
              saveFile(fileName, editor.getValue(), false, () => {
                setDirty(false);
                refreshFileTree();
              });
            }
          }, 2000);
        }
      });
    }
  });

  document.querySelectorAll('.sym-btn[data-sym]').forEach(btn => {
    btn.addEventListener('click', function() {
      if (!editor) return;
      const sym = this.dataset.sym;
      const selection = editor.getSelection();
      editor.executeEdits('symbol-insert', [{ range: selection, text: sym, forceMoveMarkers: true }]);
      const newPos = { lineNumber: selection.startLineNumber, column: selection.startColumn + sym.length };
      editor.setPosition(newPos);
      editor.focus();
    });
  });

  document.getElementById('copy-btn')?.addEventListener('click', function() {
    if (!editor) return;
    const selection = editor.getSelection();
    if (selection.isEmpty()) return;
    const model = editor.getModel();
    if (!model) return;
    const text = model.getValueInRange(selection);
    if (!text) return;
    const ta = document.createElement('textarea');
    ta.style.cssText = 'position:fixed;opacity:0;left:-9999px;top:-9999px;';
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    try { document.execCommand('copy'); } catch(e) { console.error(e); }
    document.body.removeChild(ta);
  });

  document.getElementById('paste-btn')?.addEventListener('click', function() {
    const pasteOverlay = document.getElementById('paste-overlay');
    const pasteTextarea = document.getElementById('paste-textarea');
    if (pasteOverlay) pasteOverlay.classList.add('show');
    setTimeout(() => { if (pasteTextarea) pasteTextarea.focus(); }, 150);
  });

  document.getElementById('paste-confirm')?.addEventListener('click', function() {
    const pasteOverlay = document.getElementById('paste-overlay');
    const pasteTextarea = document.getElementById('paste-textarea');
    const text = pasteTextarea ? pasteTextarea.value : '';
    if (text && editor) {
      const selection = editor.getSelection();
      editor.executeEdits('paste', [{ range: selection, text: text, forceMoveMarkers: true }]);
      editor.setSelection(selection);
    }
    if (pasteOverlay) pasteOverlay.classList.remove('show');
    if (editor) editor.focus();
  });

  document.getElementById('paste-cancel')?.addEventListener('click', function() {
    const pasteOverlay = document.getElementById('paste-overlay');
    if (pasteOverlay) pasteOverlay.classList.remove('show');
    if (editor) editor.focus();
  });

  document.getElementById('paste-overlay')?.addEventListener('click', function(e) {
    if (e.target === this) {
      const pasteOverlay = document.getElementById('paste-overlay');
      if (pasteOverlay) pasteOverlay.classList.remove('show');
      if (editor) editor.focus();
    }
  });

  document.getElementById('output-close')?.addEventListener('click', function(e) {
    e.stopPropagation();
    document.getElementById('output-overlay').classList.remove('show');
  });

  document.getElementById('preview-close')?.addEventListener('click', function() {
    document.getElementById('preview-overlay').classList.remove('show');
  });

  console.log('✅ Modular IDE Bootstrap complete!');
}

initApp();