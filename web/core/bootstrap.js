import { EventBus } from './event-bus.js';
import { initEditor, editor, setEditorContent, getEditorContent } from '../features/editor/editor.js';
import { initSettings, openSettings, closeSettings } from '../features/settings/settings.js';
import { initTerminal, openTerminal } from '../features/terminal/terminal.js';
import { initFileTree, toggleFileTree, openFileTree, closeFileTree } from '../features/file-tree/file-tree.js';
import { initTheme, toggleTheme, setTheme, currentTheme } from '../features/theme-selector/theme-selector.js';

export { EventBus, editor, setEditorContent, getEditorContent, openSettings, closeSettings, openTerminal, toggleFileTree, openFileTree, closeFileTree, toggleTheme, setTheme, currentTheme };

export function initApp() {
  console.log('🚀 Bootstrapping IDE...');

  // =============================================
  // 1. FORCE WELCOME SCREEN ON STARTUP
  // =============================================
  const welcomeScreen = document.getElementById('welcome-screen');
  const editorContainer = document.getElementById('editor-container');

  if (welcomeScreen) {
    welcomeScreen.style.display = 'flex';
    console.log('✅ Welcome screen shown');
  }
  if (editorContainer) {
    editorContainer.style.display = 'none';
    console.log('✅ Editor container hidden');
  }

  // =============================================
  // 2. INITIALIZE FEATURES (BUT NOT EDITOR YET)
  // =============================================
  initSettings(EventBus);
  initTerminal(EventBus);
  initFileTree(EventBus);
  initTheme(EventBus);

  // Initialize editor only when needed (lazy)
  let editorInitialized = false;

  function ensureEditor() {
    if (!editorInitialized) {
      initEditor(EventBus);
      editorInitialized = true;
    }
  }

  // =============================================
  // 3. UI BUTTON BINDINGS
  // =============================================
  document.getElementById('menu-btn')?.addEventListener('click', toggleFileTree);
  document.getElementById('files-btn')?.addEventListener('click', toggleFileTree);

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

  // =============================================
  // 4. WELCOME SCREEN BUTTONS
  // =============================================
  document.getElementById('welcome-new-file')?.addEventListener('click', () => {
    const fileName = prompt('Enter file name (with extension):', 'newfile.js');
    if (fileName) {
      // Show editor, hide welcome
      if (welcomeScreen) welcomeScreen.style.display = 'none';
      if (editorContainer) editorContainer.style.display = 'block';
      ensureEditor(); // Create editor if not created
      createTab(fileName);
    }
  });

  document.getElementById('welcome-open-folder')?.addEventListener('click', () => {
    toggleFileTree();
  });

  // =============================================
  // 5. SYMBOL BAR
  // =============================================
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

  // =============================================
  // 6. COPY & PASTE
  // =============================================
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

  // =============================================
  // 7. OUTPUT
  // =============================================
  document.getElementById('output-close')?.addEventListener('click', function(e) {
    e.stopPropagation();
    const outputOverlay = document.getElementById('output-overlay');
    if (outputOverlay) outputOverlay.classList.remove('show');
  });

  document.getElementById('output-menu')?.addEventListener('click', function(e) {
    e.stopPropagation();
    alert('📋 Output Options:\n\n1. Clear Output\n2. Copy to Clipboard\n3. Toggle Word Wrap\n\n(Coming soon!)');
  });

  // =============================================
  // 8. PREVIEW CLOSE
  // =============================================
  document.getElementById('preview-close')?.addEventListener('click', function() {
    document.getElementById('preview-overlay').classList.remove('show');
  });

  // =============================================
  // 9. TAB MANAGEMENT
  // =============================================
  let openTabs = [];
  let activeTabId = null;
  let tabContents = {};

  function showEditor() {
    if (welcomeScreen) welcomeScreen.style.display = 'none';
    if (editorContainer) editorContainer.style.display = 'block';
    setTimeout(() => { if (editor) editor.layout(); }, 100);
  }

  function showWelcomeScreen() {
    if (welcomeScreen) welcomeScreen.style.display = 'flex';
    if (editorContainer) editorContainer.style.display = 'none';
  }

  function createTab(fileName, content = '') {
    const existingTab = document.querySelector(`.tab-item[data-file="${fileName}"]`);
    if (existingTab) {
      switchTab(parseInt(existingTab.dataset.tabId));
      return;
    }

    const tabBar = document.getElementById('tab-bar');
    const newTab = document.createElement('button');
    const tabId = Date.now() + Math.random() * 1000;
    newTab.className = 'tab-item';
    newTab.dataset.tabId = tabId;
    newTab.dataset.file = fileName;
    newTab.innerHTML = `📄 ${fileName} <span class="tab-close" data-tab-id="${tabId}">✕</span>`;

    tabBar.appendChild(newTab);
    tabContents[tabId] = content || '';

    newTab.addEventListener('click', function(e) {
      if (e.target.classList.contains('tab-close')) return;
      switchTab(tabId);
    });

    const closeBtn = newTab.querySelector('.tab-close');
    closeBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      closeTab(tabId);
    });

    openTabs.push(tabId);
    showEditor();
    switchTab(tabId);
    return tabId;
  }

  function switchTab(tabId) {
    const allTabs = document.querySelectorAll('.tab-item');
    allTabs.forEach(t => t.classList.remove('active'));
    const selected = document.querySelector(`.tab-item[data-tab-id="${tabId}"]`);
    if (selected) {
      selected.classList.add('active');
      activeTabId = tabId;
      const fileName = selected.dataset.file;
      const ext = fileName.split('.').pop().toLowerCase();
      const languageMap = {
        'js': 'javascript', 'html': 'html', 'css': 'css', 'json': 'json',
        'py': 'python', 'java': 'java', 'c': 'c', 'cpp': 'cpp',
        'md': 'markdown', 'xml': 'xml', 'yaml': 'yaml', 'sh': 'shell',
        'sql': 'sql', 'go': 'go', 'rb': 'ruby', 'php': 'php', 'rs': 'rust',
        'ts': 'typescript', 'jsx': 'javascript', 'tsx': 'typescript'
      };
      const language = languageMap[ext] || 'plaintext';
      const content = tabContents[tabId] || '';
      setEditorContent(content, language);
    }
  }

  function closeTab(tabId) {
    const tab = document.querySelector(`.tab-item[data-tab-id="${tabId}"]`);
    if (tab) {
      tab.remove();
      const index = openTabs.indexOf(tabId);
      if (index > -1) openTabs.splice(index, 1);
      delete tabContents[tabId];
      if (activeTabId === tabId) {
        activeTabId = null;
        if (openTabs.length > 0) {
          switchTab(openTabs[openTabs.length - 1]);
        } else {
          showWelcomeScreen();
          // Reset editor content to empty
          if (editor) setEditorContent('');
        }
      }
    }
  }

  window.createTab = createTab;

  // =============================================
  // 10. RUN BUTTON (SMART LOGIC)
  // =============================================
  document.getElementById('run-btn')?.addEventListener('click', function() {
    if (!editor) {
      alert('Editor not ready.');
      return;
    }

    const activeTab = document.querySelector('.tab-item.active');
    const outputOverlay = document.getElementById('output-overlay');
    const outputContent = document.getElementById('output-content');

    if (!activeTab) {
      if (outputContent) outputContent.textContent = '⚠️ No file is open. Open or create a file first.';
      if (outputOverlay) outputOverlay.classList.add('show');
      return;
    }

    const fileName = activeTab.dataset.file;
    const code = editor.getValue();
    const ext = fileName.split('.').pop().toLowerCase();

    if (outputContent) outputContent.textContent = '⏳ Processing...';
    if (outputOverlay) outputOverlay.classList.add('show');

    // --- HTML Preview ---
    if (ext === 'html') {
      const trimmed = code.trim();
      if (!trimmed.startsWith('<') && !trimmed.includes('<html') && !trimmed.includes('<!DOCTYPE')) {
        if (outputContent) outputContent.textContent = `⚠️ "${fileName}" does not appear to be valid HTML.`;
        return;
      }
      const previewOverlay = document.getElementById('preview-overlay');
      const previewFrame = document.getElementById('preview-frame');
      if (previewFrame) previewFrame.srcdoc = code;
      if (previewOverlay) previewOverlay.classList.add('show');
      if (outputContent) outputContent.textContent = `✅ HTML preview opened for ${fileName}`;
      return;
    }

    // --- CSS Preview ---
    if (ext === 'css') {
      if (!code.trim()) {
        if (outputContent) outputContent.textContent = `⚠️ "${fileName}" is empty.`;
        return;
      }
      const previewOverlay = document.getElementById('preview-overlay');
      const previewFrame = document.getElementById('preview-frame');
      const htmlDoc = `<!DOCTYPE html><html><head><title>CSS Preview</title><style>${code}</style></head><body><h1>CSS Preview</h1><p>Your CSS is applied.</p><button>Button</button><div style="padding:20px;border:1px solid #333;">Sample</div></body></html>`;
      if (previewFrame) previewFrame.srcdoc = htmlDoc;
      if (previewOverlay) previewOverlay.classList.add('show');
      if (outputContent) outputContent.textContent = `✅ CSS preview opened for ${fileName}`;
      return;
    }

    // --- JSON Validation ---
    if (ext === 'json') {
      try {
        JSON.parse(code);
        if (outputContent) outputContent.textContent = `✅ JSON is valid.`;
      } catch(e) {
        if (outputContent) outputContent.textContent = `❌ JSON Error: ${e.message}`;
      }
      return;
    }

    // --- JavaScript Execution ---
    if (ext === 'js') {
      if (outputContent) outputContent.textContent = `⏳ Executing ${fileName}...`;
      const btn = this;
      btn.disabled = true;
      btn.textContent = '⏳';

      fetch('http://localhost:3000/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code })
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
        if (outputContent) outputContent.textContent = `❌ Error executing ${fileName}:\n\nCannot connect to backend.\n\nMake sure the backend server is running.\n(Termux: node backend/index.js)`;
        console.error('Fetch error:', err);
      });
      return;
    }

    // --- Unsupported ---
    if (outputContent) outputContent.textContent = `ℹ️ No runner configured for "${ext}" files. Supported: .js, .html, .css, .json`;
  });

  // =============================================
  // 11. D-PAD CURSOR CONTROLS (ACCELERATED)
  // =============================================
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

  const leftBtn = document.getElementById('btn-left');
  if (leftBtn) {
    leftBtn.addEventListener('touchstart', function(e) {
      e.preventDefault();
      onPointerDown('left', e);
    }, { passive: false });
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

  console.log('✅ All features initialized! Welcome screen is active.');
}
