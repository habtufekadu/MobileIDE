export function initFileTree(EventBus) {
  console.log('📂 File Tree initialized');
  
  const fileTreeContent = document.getElementById('file-tree-content');
  if (fileTreeContent) {
    fileTreeContent.innerHTML = `
      <ul>
        <li>📄 index.js</li>
        <li>📄 utils.js</li>
        <li>📄 style.css</li>
        <li>📂 src/</li>
        <li>📂 components/</li>
      </ul>
    `;
  }
  
  EventBus.subscribe('file-tree:open', () => {
    console.log('📂 File Tree opened');
  });
}

export function toggleFileTree() {
  console.log('📂 Toggling File Tree...');
  const leftDrawer = document.getElementById('left-drawer');
  const leftOverlay = document.getElementById('left-overlay');
  if (leftDrawer) leftDrawer.classList.toggle('active');
  if (leftOverlay) leftOverlay.classList.toggle('active');
}

export function openFileTree() {
  const leftDrawer = document.getElementById('left-drawer');
  const leftOverlay = document.getElementById('left-overlay');
  if (leftDrawer) leftDrawer.classList.add('active');
  if (leftOverlay) leftOverlay.classList.add('active');
}

export function closeFileTree() {
  const leftDrawer = document.getElementById('left-drawer');
  const leftOverlay = document.getElementById('left-overlay');
  if (leftDrawer) leftDrawer.classList.remove('active');
  if (leftOverlay) leftOverlay.classList.remove('active');
}
