export function isMobile(): boolean {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || 'ontouchstart' in window;
}

export function getButtonSize(): number {
  return isMobile() ? 80 : 60;
}

export function getScaleFactor(): number {
  return Math.min(window.devicePixelRatio || 1, 2);
}

export function getSafeArea(): { top: number; bottom: number; left: number; right: number } {
  const style = getComputedStyle(document.documentElement);
  return {
    top: parseInt(style.getPropertyValue('env(safe-area-inset-top)') || '0', 10) || 0,
    bottom: parseInt(style.getPropertyValue('env(safe-area-inset-bottom)') || '0', 10) || 0,
    left: parseInt(style.getPropertyValue('env(safe-area-inset-left)') || '0', 10) || 0,
    right: parseInt(style.getPropertyValue('env(safe-area-inset-right)') || '0', 10) || 0,
  };
}
