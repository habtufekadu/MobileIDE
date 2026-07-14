export function initTerminal(EventBus) {
  console.log('🖥️ Terminal initialized');
  
  EventBus.subscribe('terminal:open', () => {
    console.log('🖥️ Terminal opened');
    alert('🖥️ Terminal feature coming soon!');
  });
}

export function openTerminal() {
  console.log('🖥️ Opening Terminal...');
  alert('🖥️ Terminal feature coming soon!');
}
