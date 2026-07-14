export let currentTheme = 'dark';

export function initTheme(EventBus) {
  console.log('🎨 Theme initialized');
  
  EventBus.subscribe('theme:toggle', () => {
    toggleTheme();
  });
}

export function toggleTheme() {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  console.log('🎨 Theme toggled to:', currentTheme);
  alert('🎨 Theme toggled to ' + currentTheme);
}

export function setTheme(theme) {
  currentTheme = theme;
  console.log('🎨 Theme set to:', theme);
}
