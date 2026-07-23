export let editor = null;
export let activeTabId = null;
export let tabContents = {};
export let openTabs = [];

function getLanguageFromExtension(filePath) {
  const ext = filePath.split('.').pop().toLowerCase();
  const map = {
    'js': 'javascript',
    'json': 'json',
    'html': 'html',
    'css': 'css',
    'md': 'markdown',
    'py': 'python',
    'java': 'java',
    'sh': 'shell'
  };
  return map[ext] || 'plaintext';
}

export function initEditor(EventBus) {
  console.log('📝 Loading Editor...');
  
  const container = document.getElementById('editor-container');
  container.innerHTML = '<div class="loading">⏳ Loading Editor...</div>';
  
  EventBus.subscribe('file:open', ({ filePath, content }) => {
    openFileInTab(filePath, content);
  });

  EventBus.subscribe('file:request-save', () => {
    if (!activeTabId || !editor) return;
    const currentContent = editor.getValue();
    tabContents[activeTabId] = currentContent;
    EventBus.publish('file:save', { filePath: activeTabId, content: currentContent });
  });
  
  function loadEditor(source) {
    const script = document.createElement('script');
    script.src = source;
    script.onload = function() {
      require.config({ paths: { vs: source.replace('loader.js', '') } });
      require(['vs/editor/editor.main'], function() {
        createEditor();
      });
    };
    script.onerror = function() {
      if (source.includes('node_modules')) {
        console.warn('Local Monaco failed, trying CDN...');
        loadEditor('https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.34.1/min/vs/loader.js');
      } else {
        container.innerHTML = '<div class="error">❌ Failed to load Monaco from all sources.</div>';
      }
    };
    document.head.appendChild(script);
  }
  
  function createEditor() {
    container.innerHTML = '';
    editor = monaco.editor.create(container, {
      value: '',
      language: 'plaintext',
      theme: 'vs-dark',
      automaticLayout: true,
      fontSize: 14,
      minimap: { enabled: false },
      wordWrap: 'on',
      mouseWheelZoom: true,
      scrollbar: {
        vertical: 'visible',
        horizontal: 'visible',
        verticalScrollbarSize: 16,
        horizontalScrollbarSize: 16,
        useShadows: false,
        handleMouseWheel: true
      },
      smoothScrolling: false,
      cursorSmoothCaretAnimation: 'off',
      renderWhitespace: 'none',
      scrollBeyondLastLine: false,
      renderValidationDecorations: 'off',
      lineNumbersMinChars: 1
    });
    
    container.addEventListener('click', function() {
      if (editor) { editor.focus(); setTimeout(() => { if (editor) { editor.layout(); editor.focus(); } }, 100); }
    });
    setTimeout(() => { if (editor) editor.focus(); }, 500);
    window.addEventListener('resize', function() { if (editor) editor.layout(); });
    
    console.log('✅ Monaco Editor loaded');
    EventBus.publish('editor:ready', editor);
  }
  
  function openFileInTab(filePath, content) {
    if (!openTabs.includes(filePath)) {
      openTabs.push(filePath);
      tabContents[filePath] = content;
    }
    if (activeTabId && editor) {
      tabContents[activeTabId] = editor.getValue();
    }
    activeTabId = filePath;
    const lang = getLanguageFromExtension(filePath);
    setEditorContent(tabContents[filePath], lang);
    EventBus.publish('tabs:updated', { openTabs, activeTabId });
  }

  loadEditor('node_modules/monaco-editor/min/vs/loader.js');
}

export function setEditorContent(content, language) {
  if (!editor) return;
  editor.setValue(content || '');
  if (language) {
    const model = editor.getModel();
    if (model) {
      monaco.editor.setModelLanguage(model, language);
    }
  }
}

export function getEditorContent() {
  if (!editor) return '';
  return editor.getValue();
}