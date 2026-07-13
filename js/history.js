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

  // Removes any saved game older than 7 days, except ones the user has
  // starred — starring a game is how you keep it around indefinitely.
  // Runs once per session, right after the DB opens (see init() above), so
  // old local game history is cleaned up automatically without the user
  // having to do anything.
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
        if (typeof game.date === 'number' && game.date < cutoff && !game.starred) {
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
      const getRequest = store.get(game.id);

      getRequest.onsuccess = () => {
        const existing = getRequest.result;
        if (existing && existing.starred && game.starred === undefined) {
          game.starred = true;
        }
        const putRequest = store.put(game);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = (e) => reject(e.target.error);
      };
      getRequest.onerror = (e) => reject(e.target.error);
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
  },

  // Toggles/sets the starred flag on a saved game. Starred games are
  // exempt from the 7-day auto-purge (see purgeOldGames above).
  async setStarred(gameId, starred) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['games'], 'readwrite');
      const store = transaction.objectStore(['games']);
      const getRequest = store.get(gameId);

      getRequest.onsuccess = () => {
        const game = getRequest.result;
        if (!game) return resolve(false);
        game.starred = !!starred;
        const putRequest = store.put(game);
        putRequest.onsuccess = () => resolve(true);
        putRequest.onerror = (e) => reject(e.target.error);
      };
      getRequest.onerror = (e) => reject(e.target.error);
    });
  }
};
