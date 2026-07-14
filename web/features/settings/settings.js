export function initSettings(EventBus) {
  console.log('⚙️ Settings initialized');
  
  const settingsContent = document.getElementById('settings-content');
  if (settingsContent) {
    settingsContent.innerHTML = `
      <ul>
        <li>🎨 Theme: Dark</li>
        <li>🔤 Font Size: 14</li>
        <li>📐 Tab Size: 2</li>
        <li>🖥️ Terminal</li>
        <li>🎨 Theme Selector</li>
      </ul>
    `;
  }
  
  EventBus.subscribe('settings:open', () => {
    console.log('⚙️ Settings opened');
  });
}

export function openSettings() {
  console.log('⚙️ Opening Settings...');
  const rightDrawer = document.getElementById('right-drawer');
  const rightOverlay = document.getElementById('right-overlay');
  if (rightDrawer) rightDrawer.classList.add('active');
  if (rightOverlay) rightOverlay.classList.add('active');
}

export function closeSettings() {
  console.log('⚙️ Closing Settings...');
  const rightDrawer = document.getElementById('right-drawer');
  const rightOverlay = document.getElementById('right-overlay');
  if (rightDrawer) rightDrawer.classList.remove('active');
  if (rightOverlay) rightOverlay.classList.remove('active');
}
