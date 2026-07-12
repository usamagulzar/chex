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
        this.purgeOldGames().catch(err => console.error('Game history purge failed:', err));
        resolve(this.db);
      };
      
      request.onerror = (e) => {
        console.error('IndexedDB open error:', e.target.error);
        reject(e.target.error);
      };
    });
  },

  // Removes any saved game older than 7 days. Runs once per session, right
  // after the DB opens (see init() above), so old local game history is
  // cleaned up automatically without the user having to do anything.
  async purgeOldGames() {
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - SEVEN_DAYS_MS;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['games'], 'readwrite');
      const store = transaction.objectStore('games');
      const request = store.openCursor();

      request.onsuccess = (e) => {
        const cursor = e.target.result;
        if (!cursor) return; // no resolve here; transaction.oncomplete below handles it
        const game = cursor.value;
        if (typeof game.date === 'number' && game.date < cutoff) {
          cursor.delete();
        }
        cursor.continue();
      };
      request.onerror = (e) => reject(e.target.error);

      transaction.oncomplete = () => resolve();
      transaction.onerror = (e) => reject(e.target.error);
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
