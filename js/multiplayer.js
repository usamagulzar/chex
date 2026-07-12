// --- CHESSOLOGY FIREBASE MULTIPLAYER -------------------------------------------

window.multi = {
  active: false,
  myColor: 'w',
  peerId: '', // my username
  hostId: null,
  opponentId: '',
  isHost: false,
  gameId: null,

  unsubChallenges: null,
  unsubActiveChallenge: null,
  unsubGame: null,
  unsubHeartbeat: null,
  heartbeatInterval: null,
  disconnectTimeRemaining: null,
  disconnectInterval: null,
  connectTime: 0,
  lastProcessedPgn: '',
  lastProcessedMoveTime: null,
  lastSignalTimestamp: 0,
  lastMatchVariants: null,
  lastClockConfig: null,

  initPeer() {
    this.peerId = (window.auth && window.auth.username) 
      ? window.auth.username.toLowerCase() 
      : ('guest' + Math.floor(Math.random() * 10000));
      
    if (window.ui && typeof window.ui.syncAuthUI === 'function') {
      window.ui.syncAuthUI();
    }
    
    this.cleanupOldGames();
    this.listenForChallenges();
  },

  async cleanupOldGames() {
    try {
      const threeDaysAgo = new Date(Date.now() - (3 * 24 * 60 * 60 * 1000));
      // Clean up challenges sent by me older than 3 days
      const oldChallenges = await db.collection('challenges')
        .where('sender', '==', this.peerId)
        .where('createdAt', '<', threeDaysAgo)
        .get();
        
      oldChallenges.forEach(doc => {
        doc.ref.delete();
      });

      // Clean up RTDB games older than 24 hours
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      const userGamesRef = rtdb.ref(`user_games/${this.peerId}`);
      userGamesRef.once('value').then(snapshot => {
        if (!snapshot.exists()) return;
        const games = snapshot.val();
        for (const gameId in games) {
          const timestamp = games[gameId];
          if (timestamp < oneDayAgo) {
            console.log(`Cleaning up old game room: ${gameId}`);
            rtdb.ref(`games/${gameId}`).remove().catch(()=>{});
            rtdb.ref(`user_games/${this.peerId}/${gameId}`).remove().catch(()=>{});
          }
        }
      });
    } catch(e) {
      console.warn("Cleanup error:", e);
    }
  },

  listenForChallenges() {
    if (this.unsubChallenges) this.unsubChallenges();
    // Every time this listener (re)attaches — which happens more than once
    // per session: once from initPeer() at boot with a placeholder peerId,
    // again once real auth/username settles, again on retry after an error —
    // Firestore fires 'added' for every doc CURRENTLY matching the query,
    // not just genuinely new ones. Without this guard, a still-pending
    // challenge gets handed to onReceiveChallenge() again on every
    // re-attach, popping the same challenge popup back up repeatedly.
    if (!this._seenChallengeIds) this._seenChallengeIds = new Set();

    this.unsubChallenges = db.collection('challenges')
      .where('target', '==', this.peerId)
      .where('status', '==', 'pending')
      .onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const id = change.doc.id;
            if (this._seenChallengeIds.has(id)) return; // already surfaced this session
            this._seenChallengeIds.add(id);

            const data = change.doc.data();
            const createdAtTime = data.createdAt ? data.createdAt.toDate().getTime() : Date.now();
            const age = Date.now() - createdAtTime;
            
            // If already older than 30 seconds, ignore and clean up
            if (age > 30000) {
              change.doc.ref.delete().catch(()=>{});
              return;
            }
            
            if (window.app && window.app.onReceiveChallenge) {
              window.app.onReceiveChallenge({
                challengeId: id,
                sender: data.sender,
                variants: data.variants,
                colorReq: data.colorReq,
                clockConfig: data.clockConfig,
                createdAtTime: createdAtTime
              });
            }
          } else if (change.type === 'removed') {
            // Freed up (accepted/declined/expired elsewhere) — allow a brand
            // new challenge that reuses... it never reuses IDs, but keep the
            // set from growing unbounded over a long session.
            this._seenChallengeIds.delete(change.doc.id);
          }
        });
      }, (err) => {
        // Most common cause: this listener attached before Firebase anonymous
        // auth finished resolving, so the initial read was permission-denied.
        // Retry instead of leaving the user permanently unable to receive
        // challenges for the rest of the session.
        console.warn("Error listening to challenges, retrying in 2s:", err);
        if (this._challengeRetryTimeout) clearTimeout(this._challengeRetryTimeout);
        this._challengeRetryTimeout = setTimeout(() => this.listenForChallenges(), 2000);
      });
  },

  async sendChallenge(targetUser, variants, colorReq, clockConfig) {
    if (!targetUser) return;
    if (window.auth && typeof window.auth.ensureAnonymousAuth === 'function') {
      await window.auth.ensureAnonymousAuth();
    }
    const senderUid = (window.auth && window.auth.googleUID) || (auth.currentUser && auth.currentUser.uid) || null;
    if (!senderUid) {
      console.warn('Cannot send challenge before Firebase auth is ready.');
      return;
    }
    const targetLower = targetUser.toLowerCase();
    const targetSnap = await db.collection('usernames').doc(targetLower).get();
    const targetUid = targetSnap.exists && targetSnap.data() ? targetSnap.data().uid : null;

    this.lastMatchVariants = variants;
    this.lastClockConfig = clockConfig;
    
    const challengeRef = db.collection('challenges').doc();
    const challengeId = challengeRef.id;
    
    await challengeRef.set({
      sender: this.peerId,
      senderUid: senderUid,
      target: targetLower,
      targetUid: targetUid,
      status: 'pending',
      variants: variants,
      colorReq: colorReq,
      clockConfig: clockConfig,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    this.gameId = challengeId;
    this.isHost = true;
    this.opponentId = targetLower;
    this.lastProcessedPgn = '';
    this.lastProcessedMoveTime = null;
    this.lastSignalTimestamp = 0;
    
    // Auto-expire challenge in 30 seconds
    if (this.challengeTimeout) clearTimeout(this.challengeTimeout);
    this.challengeTimeout = setTimeout(() => {
      challengeRef.get().then(doc => {
        if (doc.exists && doc.data().status === 'pending') {
          console.log("Challenge expired. Deleting...");
          this.unsubActiveChallenge();
          challengeRef.delete().catch(()=>{});
          this.gameId = null;
          if (window.app && window.app.onChallengeDeclined) {
            window.app.onChallengeDeclined();
          }
        }
      });
    }, 30000);
    
    if (this.unsubActiveChallenge) this.unsubActiveChallenge();
    this.unsubActiveChallenge = challengeRef.onSnapshot((doc) => {
      if (!doc.exists) return;
      const data = doc.data();
      if (data.status === 'accepted') {
        if (this.challengeTimeout) clearTimeout(this.challengeTimeout);
        this.unsubActiveChallenge();
        challengeRef.delete().catch(()=>{}); // Clean up the challenge immediately!
        
        this.active = true;
        
        let myColor = 'w';
        if (data.colorReq === 'random') {
          myColor = Math.random() < 0.5 ? 'w' : 'b';
        } else if (data.colorReq === 'b') {
          myColor = 'b';
        }
        this.myColor = myColor;
        this.lastMatchVariants = data.variants;
        this.lastClockConfig = data.clockConfig;
        if (!data.joinerUid) {
          console.warn('Challenge accepted without joinerUid; cannot create an authorized game record.');
          return;
        }
        
        const timestamp = Date.now();
        const initialPayload = {
          host: this.peerId,
          hostUid: senderUid,
          joiner: this.opponentId,
          joinerUid: data.joinerUid,
          hostColor: myColor,
          variants: data.variants,
          clockConfig: data.clockConfig,
          pgn: '',
          draft_w: '',
          draft_b: '',
          draftLocked_w: false,
          draftLocked_b: false,
          signal: null,
          createdAt: timestamp,
          lastMoveTime: firebase.database.ServerValue.TIMESTAMP
        };
        if (data.clockConfig && data.clockConfig.wTime) {
          initialPayload.time_w = data.clockConfig.wTime * 1000;
          initialPayload.time_b = data.clockConfig.bTime * 1000;
        }
        rtdb.ref('games/' + this.gameId).set(initialPayload);

        // Save game references in player lists
        rtdb.ref(`user_games/${this.peerId}/${this.gameId}`).set(timestamp);
        rtdb.ref(`user_games/${this.opponentId}/${this.gameId}`).set(timestamp);
        
        if (window.app && window.app.onChallengeAccepted) {
          window.app.onChallengeAccepted({
            yourColor: myColor,
            variants: data.variants,
            clockConfig: data.clockConfig
          });
        }
        this.setupGameListeners();
      } else if (data.status === 'declined') {
        if (this.challengeTimeout) clearTimeout(this.challengeTimeout);
        this.unsubActiveChallenge();
        challengeRef.delete().catch(()=>{}); // Clean up
        this.gameId = null;
        if (window.app && window.app.onChallengeDeclined) {
          window.app.onChallengeDeclined();
        }
      }
    });
  },

  async acceptChallenge(challengeId, _isRetry = false) {
    if (window.auth && typeof window.auth.ensureAnonymousAuth === 'function') {
      await window.auth.ensureAnonymousAuth();
    }
    let joinerUid = (window.auth && window.auth.googleUID) || (auth.currentUser && auth.currentUser.uid) || null;

    if (!joinerUid) {
      // auth.onAuthStateChanged (which sets window.auth.googleUID) can lag
      // slightly behind signInAnonymously() resolving. One short retry
      // covers that gap instead of failing outright on a fresh page load.
      if (!_isRetry) {
        await new Promise(res => setTimeout(res, 400));
        return this.acceptChallenge(challengeId, true);
      }
      console.warn('Cannot accept challenge: Firebase auth is not ready.');
      return false;
    }

    this.gameId = challengeId;
    this.isHost = false;
    this.lastProcessedPgn = '';
    this.lastProcessedMoveTime = null;
    this.lastSignalTimestamp = 0;
    
    const challengeRef = db.collection('challenges').doc(challengeId);
    try {
      await challengeRef.update({
        status: 'accepted',
        joinerUid: joinerUid
      });

      // Wait for host to create the game node in RTDB to know our color
      const gameRef = rtdb.ref('games/' + challengeId);
      const listener = gameRef.on('value', (snapshot) => {
        if (snapshot.exists()) {
          gameRef.off('value', listener);
          challengeRef.delete().catch(()=>{}); // Clean up the challenge doc
          
          const data = snapshot.val();
          this.active = true;
          this.opponentId = data.host;
          this.hostId = data.host;
          this.hostUid = data.hostUid || null;
          this.lastMatchVariants = data.variants;
          this.lastClockConfig = data.clockConfig;
          this.myColor = data.hostColor === 'w' ? 'b' : 'w';
          
          if (window.app && window.app.onChallengeAccepted) {
             window.app.onChallengeAccepted({
                yourColor: this.myColor,
                variants: data.variants,
                clockConfig: data.clockConfig
             });
          }
          this.setupGameListeners();
        }
      });
      return true;
    } catch (err) {
      console.error('Failed to accept challenge:', err);
      this.gameId = null;
      return false;
    }
  },

  declineChallenge(challengeId) {
    return db.collection('challenges').doc(challengeId).update({
      status: 'declined'
    }).then(() => true).catch(err => {
      console.error('Failed to decline challenge:', err);
      return false;
    });
  },

  setupGameListeners() {
    this.connectTime = Date.now();
    this.lastProcessedMoveTime = null;
    const gameRef = rtdb.ref('games/' + this.gameId);
    
    // Set up presence
    const myPresenceRef = rtdb.ref('games/' + this.gameId + '/presence/' + this.peerId);
    myPresenceRef.set(true);
    myPresenceRef.onDisconnect().remove();
    
    // Listen for opponent presence
    const oppPresenceRef = rtdb.ref('games/' + this.gameId + '/presence/' + this.opponentId);
    oppPresenceRef.on('value', (snapshot) => {
		  if (over) {                  
    if (this.disconnectInterval) {
      clearInterval(this.disconnectInterval);
      this.disconnectInterval = null;
      this.disconnectTimeRemaining = null;
    }
    return;
  }
      const isOnline = snapshot.val() === true;
      if (!isOnline && this.active) {
        console.warn("Opponent presence lost. Starting 90s resignation timer...");
        if (this.disconnectInterval) clearInterval(this.disconnectInterval);
        
        this.disconnectTimeRemaining = 90;
        if (window.app && window.app.renderAll) window.app.renderAll();
        
        this.disconnectInterval = setInterval(() => {
          this.disconnectTimeRemaining--;
          if (this.disconnectTimeRemaining <= 0) {
            clearInterval(this.disconnectInterval);
            this.disconnectInterval = null;
            this.disconnectTimeRemaining = null;
            if (this.active) {
              console.warn("Opponent presence timeout. Resigning/aborting game.");
              if (window.app && window.app.handleMultiplayerMessage) {
                const isAbort = (window.moveHistory && window.moveHistory.length < 2);
                window.app.handleMultiplayerMessage({ type: isAbort ? 'abort' : 'resign' });
              }
			  this.active = false;
            }
          }
          if (window.app && window.app.renderAll) window.app.renderAll();
        }, 1000);
      } else {
        if (this.disconnectInterval) {
          clearInterval(this.disconnectInterval);
          this.disconnectInterval = null;
        }
        this.disconnectTimeRemaining = null;
        if (window.app && window.app.renderAll) window.app.renderAll();
      }
    });
    
    // Listen for game state updates (PGN, signals, draft FENs, clocks)
    const oppColor = this.myColor === 'w' ? 'b' : 'w';
    this.unsubGame = (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.val();

		// 0. Pick up a game-ending result written by the other client (e.g. their
		// auto-resign after our presence timed out) even if we never got a live signal.
		if (data.result && window.app && window.app.onRemoteGameEnded) {
		  window.app.onRemoteGameEnded(data.result);
		}
		
      // 1. Process PGN
      if (data.pgn !== undefined && data.pgn !== this.lastProcessedPgn) {
        this.lastProcessedPgn = data.pgn;
        if (window.app && window.app.onRemoteMove) {
          window.app.onRemoteMove(data.pgn);
        }
      }
	  
if (data.currentDice !== undefined && window.variants && window.variants.diceChessEnabled) {
        // Only accept network dice if it is the opponent's turn.
        // If it's our turn, our device already rolled them instantly.
        if (turn !== this.myColor) {
          window.variants.allowedDiceTypes = data.currentDice ? data.currentDice.split(',') : [];
          if (window.app) window.app.renderAll();
        }
      }

		if (data.brainSuggestedPiece !== undefined && window.variants && window.variants.handAndBrainEnabled) {
  if (turn !== this.myColor) {   // only accept the network value on the non-mover's client
    window.variants.brainSuggestedPiece = data.brainSuggestedPiece;
    if (window.app) window.app.renderAll();
  }
}

      // 2. Process Draft placements
      const oppDraftFen = data[`draft_${oppColor}`];
      const oppLocked = data[`draftLocked_${oppColor}`];
      
      if (oppLocked && window.variants && window.variants.draftLocked) {
        if (!window.variants.draftLocked[oppColor]) {
          window.variants.draftLocked[oppColor] = true;
          // Apply opponent's draft board layout from FEN
          if (oppDraftFen && window.app && window.app.applyDraftFen) {
            window.app.applyDraftFen(oppColor, oppDraftFen);
          }
          if (window.app && window.app.checkDraftCompletion) {
            window.app.checkDraftCompletion();
          }
			 gameRef.child('signal').set(null);
        }
      }

      // 3. Process Signals
      if (data.signal && data.signal.sender !== this.peerId) {
        const sigTime = data.signal.timestamp || 0;
        if (sigTime > this.lastSignalTimestamp) {
          this.lastSignalTimestamp = sigTime;
          if (window.app && window.app.handleMultiplayerMessage) {
            window.app.handleMultiplayerMessage(data.signal);
          }
        }
      }

      // 4. Authoritative Server Timestamp Delta Clock Sync
      if (data.lastMoveTime) {
        const isGameStart = (window.moveHistory && window.moveHistory.length === 0);
        if (this.lastProcessedMoveTime === null || isGameStart) {
          this.lastProcessedMoveTime = data.lastMoveTime;
          if (window.timer && window.timer.enabled) {
            if (data.time_w !== undefined) window.timer.whiteTime = data.time_w;
            if (data.time_b !== undefined) window.timer.blackTime = data.time_b;
            window.timer.render();
          }
          if (data.activeSide === this.myColor && window.timer && window.timer.enabled && window.timer.active) {
            rtdb.ref(".info/serverTimeOffset").once("value", (offsetSnap) => {
              const offset = offsetSnap.val() || 0;
              const estimatedServerNow = Date.now() + offset;
              const elapsedSinceLastMove = estimatedServerNow - data.lastMoveTime;
              if (elapsedSinceLastMove > 0) {
                if (this.myColor === 'w') {
                  window.timer.whiteTime = Math.max(0, window.timer.whiteTime - elapsedSinceLastMove);
                } else {
                  window.timer.blackTime = Math.max(0, window.timer.blackTime - elapsedSinceLastMove);
                }
                window.timer.lastTick = Date.now();
                window.timer.render();
              }
            });
          }
        } else if (data.lastMoveTime > this.lastProcessedMoveTime) {
          const elapsed = data.lastMoveTime - this.lastProcessedMoveTime;
          this.lastProcessedMoveTime = data.lastMoveTime;

          if (data.activeSide === this.myColor) {
            if (window.timer && window.timer.enabled) {
			  window.timer[oppColor === 'w' ? 'whiteTime' : 'blackTime'] = data[`time_${oppColor}`];
              window.timer.switchTurn(this.myColor);
              window.timer.lastTick = Date.now();
            }
          }
        }
      }
    };
    
    gameRef.on('value', this.unsubGame);
  },

  sendMove(newPgn) {
    if (this.gameId && this.active) {
		this.lastProcessedPgn = newPgn; // to prevent echoing your own moves!
      const myTime = this.myColor === 'w' ? window.timer.whiteTime : window.timer.blackTime;
      rtdb.ref('games/' + this.gameId).update({
        pgn: newPgn,
        activeSide: this.myColor === 'w' ? 'b' : 'w',
        lastMoveTime: firebase.database.ServerValue.TIMESTAMP,
        [`time_${this.myColor}`]: myTime,
		currentDice: null
      });
    }
  },

  sendDraftState(color, fen, locked) {
    if (this.gameId && this.active) {
      rtdb.ref('games/' + this.gameId).update({
        [`draft_${color}`]: fen,
        [`draftLocked_${color}`]: locked
      });
    }
  },

  sendSignal(type, payload = {}) {
    if (this.gameId && this.active) {
      rtdb.ref('games/' + this.gameId).update({
        signal: {
          type: type,
          sender: this.peerId,
          timestamp: Date.now(),
          ...payload
        }
      });
    }
  },

  saveGameResult(resultText) {
    if (this.gameId) {
      rtdb.ref('games/' + this.gameId).update({
        result: resultText,
        pgn: exportPgn()
      });
    }
  },

  // Detaches Firebase listeners + presence for the CURRENT game, without
// touching `active`/`gameId`/`opponentId` — so Rematch still knows who
// to challenge again. Call this the moment a game legitimately ends
// (draw/resign/abort/timeout), so a stale presence listener from a
// finished game can never fire against a later rematch.
detachListeners() {
  if (this.disconnectInterval) clearInterval(this.disconnectInterval);
  this.disconnectInterval = null;
  this.disconnectTimeRemaining = null;
  if (this.gameId) {
    rtdb.ref('games/' + this.gameId).off('value', this.unsubGame);
    rtdb.ref('games/' + this.gameId + '/presence/' + this.opponentId).off('value');

    const myPresence = rtdb.ref('games/' + this.gameId + '/presence/' + this.peerId);
    myPresence.remove();
  }
},

// Full teardown... used when actually leaving the game (goToMenu).
cleanupGame() {
  this.detachListeners();
  this.active = false;
  this.gameId = null;
}
};
