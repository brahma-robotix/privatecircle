/**
 * Local Storage Management Service
 * Safe browser storage serialization, backup exports, and data recovery
 */

export const StorageService = {
  load: <T>(key: string, fallback: T): T => {
    try {
      const data = localStorage.getItem(key);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn(`[StorageService] Failed to load key "${key}":`, e);
    }
    return fallback;
  },

  save: <T>(key: string, value: T): boolean => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn(`[StorageService] Failed to save key "${key}":`, e);
      return false;
    }
  },

  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`[StorageService] Failed to remove key "${key}":`, e);
    }
  },

  exportDataAsJson: (filename = 'privatecircle-backup.json'): void => {
    try {
      const exportObject: Record<string, unknown> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('privatecircle')) {
          try {
            exportObject[key] = JSON.parse(localStorage.getItem(key) || '{}');
          } catch {
            exportObject[key] = localStorage.getItem(key);
          }
        }
      }

      const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportObject, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonStr);
      downloadAnchor.setAttribute('download', filename);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      console.error('[StorageService] Export failed:', e);
    }
  },
};
