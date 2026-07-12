// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAjm6mKyQs-b8xUtf6EKkRnZrAFtfxAlss",
  authDomain: "chex-6369e.firebaseapp.com",
  databaseURL: "https://chex-6369e-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "chex-6369e",
  storageBucket: "chex-6369e.firebasestorage.app",
  messagingSenderId: "237580909329",
  appId: "1:237580909329:web:6a46754688f73b7c05eab0",
  measurementId: "G-MQT14SPW5Z"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const rtdb = firebase.database();

window.auth = {
  username: null,
  googleUID: null,
  isAuthenticated: false,
  isAnonymous: false,
  authReady: null,

  async ensureAnonymousAuth() {
    if (auth.currentUser) return auth.currentUser;
    if (this.authReady) return this.authReady;

    this.authReady = auth.signInAnonymously()
      .then(result => result.user)
      .catch(err => {
        console.error('Anonymous sign-in error:', err);
        return null;
      })
      .finally(() => {
        this.authReady = null;
      });

    return this.authReady;
  },

  init() {
    // 1. Check local storage for existing username
    let storedUsername = localStorage.getItem('chessology_username');
    if (!storedUsername) {
      // 2. Generate a random guest username if none exists
      storedUsername = 'Guest' + Math.random().toString(36).substring(2, 8).toUpperCase();
      localStorage.setItem('chessology_username', storedUsername);
    }
    this.username = storedUsername;
    
    // Initialize WebRTC listener immediately so the user can receive challenges.
    // (Session/game restore on refresh is handled entirely by app.js's
    // checkAndRestoreSession - don't also resume here, it races against it.)
    if (window.multi && typeof window.multi.initPeer === 'function') {
      window.multi.initPeer();
    }

    if (!auth.currentUser) {
      this.ensureAnonymousAuth();
    }

    // Listen for Firebase Auth state changes
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        this.googleUID = user.uid;
        this.isAnonymous = !!user.isAnonymous;
        this.isAuthenticated = !user.isAnonymous;

        if (user.isAnonymous) {
          let currentName = localStorage.getItem('chessology_username') || '';
          if (!currentName.toLowerCase().startsWith('guest')) {
            const guestName = Math.random().toString(36).substring(2, 8).toUpperCase();
            this.setUsername(guestName);
          }

          // initPeer() (called synchronously in init(), above) may have attached
          // the challenge listener *before* this anonymous sign-in resolved,
          // in which case that first attach could have failed permission checks.
          // Re-attach now that request.auth is guaranteed to be populated.
          if (window.multi && typeof window.multi.listenForChallenges === 'function') {
            window.multi.listenForChallenges();
          }

          if (window.ui && typeof window.ui.syncAuthUI === 'function') {
            window.ui.syncAuthUI();
          }
          return;
        }

        // Check if user already claimed a username
        const docRef = db.collection('users').doc(user.uid);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
          const data = docSnap.data();
          this.setUsername(data.username);
          if (window.ui && typeof window.ui.syncAuthUI === 'function') {
            window.ui.syncAuthUI();
          }
        } else {
          // User authenticated but hasn't claimed a username yet
          if (window.ui && typeof window.ui.showClaimUsernameModal === 'function') {
            window.ui.showClaimUsernameModal();
          }
        }
      } else {
        this.googleUID = null;
        this.isAuthenticated = false;
        this.isAnonymous = false;
        
        // Security check: if they are logged out, they MUST use a Guest username.
        // If they used Inspect Element to forge a custom name in localStorage, boot them.
        let currentName = localStorage.getItem('chessology_username') || '';
        if (!currentName.toLowerCase().startsWith('guest')) {
          console.warn("Unauthenticated user detected with custom username. Reverting to Guest.");
          const guestName = Math.random().toString(36).substring(2, 8).toUpperCase();
          this.setUsername(guestName);
        }

        this.ensureAnonymousAuth();
        
        if (window.ui && typeof window.ui.syncAuthUI === 'function') {
          window.ui.syncAuthUI();
        }
      }
    });

    if (window.ui && typeof window.ui.syncAuthUI === 'function') {
      window.ui.syncAuthUI();
    }
  },

  setUsername(newUsername) {
    if (!this.isAuthenticated && !newUsername.toLowerCase().startsWith('guest')) {
      console.warn("Security Error: Cannot set a custom username without authenticating first.");
      return;
    }
    this.username = newUsername;
    localStorage.setItem('chessology_username', newUsername);
    // Re-init peer with new username if we are not actively in a game, and the ID actually changed
    if (window.multi && !window.multi.active) {
      if (window.multi.peerId !== newUsername.toLowerCase()) {
        window.multi.initPeer();
      }
    }
  },

  async signInWithGoogle() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      await auth.signInWithPopup(provider);
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        console.log("Sign-in popup closed by user.");
        return;
      }
      console.error("Google Sign-in Error:", err);
      alert("Sign-in failed: " + err.message);
    }
  },

  async signOut() {
    await auth.signOut();
    await this.ensureAnonymousAuth();
    // Revert to a guest username
    const guestName = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.setUsername(guestName);
    if (window.ui && typeof window.ui.syncAuthUI === 'function') {
      window.ui.syncAuthUI();
    }
  },

  async claimUsername(requestedUsername) {
    if (!this.googleUID || (auth.currentUser && auth.currentUser.isAnonymous)) {
      return { success: false, message: "Sign in with Google to claim a username" };
    }
    if (!requestedUsername || requestedUsername.length < 6) return { success: false, message: "Username must be at least 6 characters" };
    if (requestedUsername.toLowerCase().startsWith('guest')) return { success: false, message: "Cannot claim a guest username" };
    if (!/^[a-zA-Z0-9_\.]+$/.test(requestedUsername)) return { success: false, message: "Only letters, numbers, underscores, and dots allowed" };

    const cleanUsername = requestedUsername.trim();
    const cleanLower = cleanUsername.toLowerCase();
    
    const usernameRef = db.collection('usernames').doc(cleanLower);
    const userRef = db.collection('users').doc(this.googleUID);

    try {
      const claimed = await db.runTransaction(async (transaction) => {
        const usernameSnap = await transaction.get(usernameRef);
        if (usernameSnap.exists) {
          return false;
        }

        transaction.set(usernameRef, { uid: this.googleUID, display: cleanUsername });
        transaction.set(userRef, { username: cleanUsername });
        return true;
      });

      if (!claimed) {
        return { success: false, message: "Username is already taken!" };
      }
      
      this.setUsername(cleanUsername);
      if (window.ui && typeof window.ui.syncAuthUI === 'function') {
        window.ui.syncAuthUI();
      }
      return { success: true };
    } catch (err) {
      console.error("Error claiming username:", err);
      return { success: false, message: "Database error: " + err.message };
    }
  }
};
