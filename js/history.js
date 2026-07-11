// --- CHESSOLOGY INDEXEDDB HISTORY STORAGE --------------------------------------

window.historyStorage = {
  db: null,

  init() {
    return new Promise((resolve, reject) => {
      if (this.db) return resolve(this.db);
      
      const request = indexedDB.open('ChessologyDB', 1);
      
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('games')) {
          db.createObjectStore('games', { keyPath: 'id' });
        }
      };
      
      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };
      
      request.onerror = (e) => {
        console.error('IndexedDB open error:', e.target.error);
        reject(e.target.error);
      };
    });
  },

  async saveGame(game) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['games'], 'readwrite');
      const store = transaction.objectStore(['games']);
      const request = store.put(game);
      
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  },

  async getGames() {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['games'], 'readonly');
      const store = transaction.objectStore(['games']);
      const request = store.getAll();
      
      request.onsuccess = (e) => {
        const list = e.target.result || [];
        // Sort by date descending
        list.sort((a, b) => b.date - a.date);
        resolve(list);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  },

  async deleteGame(gameId) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['games'], 'readwrite');
      const store = transaction.objectStore(['games']);
      const request = store.delete(gameId);
      
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  }
};
