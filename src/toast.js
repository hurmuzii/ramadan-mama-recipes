/**
 * Toast Notification Utility
 * Usage: showToast('message', 'success' | 'error' | 'info', durationMs)
 */
export function showToast(message, type = 'success', duration = 3000) {
    let container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    // Auto-remove
    setTimeout(() => {
        toast.classList.add('toast-hide');
        setTimeout(() => toast.remove(), 400);
    }, duration);
}
