export let editor = null;
export let activeTabId = null;
export let tabContents = {};
export let openTabs = [];

export function initEditor(EventBus) {
  console.log('📝 Loading Editor...');
  
  const container = document.getElementById('editor-container');
  container.innerHTML = '<div class="loading">⏳ Loading Editor...</div>';
  
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
      value: '', // EMPTY INITIAL VALUE
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
    
    monaco.languages.setLanguageConfiguration('*', {
      autoClosingPairs: [
        { open: '(', close: ')' },
        { open: '[', close: ']' },
        { open: '{', close: '}' },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
      ]
    });
    
    container.addEventListener('click', function() {
      if (editor) { editor.focus(); setTimeout(() => { if (editor) { editor.layout(); editor.focus(); } }, 100); }
    });
    setTimeout(() => { if (editor) editor.focus(); }, 500);
    window.addEventListener('resize', function() { if (editor) editor.layout(); });
    
    console.log('✅ Monaco Editor loaded (empty initial value)');
    EventBus.publish('editor:ready', editor);
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
