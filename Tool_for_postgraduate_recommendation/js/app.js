// ===== App Initialization =====

function init() {
  // Tab switching
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Modal close
  document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) hideModal();
  });
  document.getElementById('modalCancel').addEventListener('click', hideModal);
  document.getElementById('modalSave').addEventListener('click', modalSave);

  // Keyboard: Escape to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideModal();
  });

  // Initial render (uses switchTab to also init FAB)
  switchTab('dashboard');
}

document.addEventListener('DOMContentLoaded', init);
