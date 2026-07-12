// --- CHESSOLOGY UI MANAGER -------------------------------------------------
window.ui = {
  init() {
    this.setupMultiplayer();
  },

  showStep(id) {
    ['stepMode','stepOnlineMode','stepJoin','stepHostWait','stepOnlineLobby','stepOfflineVariants','stepWaitHost','stepGameHistory']
      .forEach(s => {
        const el = document.getElementById(s);
        if (el) el.style.display = s === id ? 'block' : 'none';
      });
      
    if (id === 'stepMode') {
      const joinBtn = document.getElementById('joinGameBtn');
      if (joinBtn) {
        joinBtn.textContent = 'Connect';
        joinBtn.disabled = false;
      }
    }
    
    if (id === 'stepOfflineVariants') {
      this.syncStartFromPosBtn();
    }
  },

  syncStartFromPosBtn() {
    const startFromPosBtn = document.getElementById('startFromPosBtn');
    if (!startFromPosBtn) return;
    
    const isDraftChecked = document.getElementById('draftModeToggleOffline')?.checked || false;
    
    const currentFen = boardToFen(board, turn, castling, enPassantSquare);
    const isDefaultPos = (currentFen === 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -');
    
    let wKing = 0, bKing = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === 'K') {
          if (p.color === 'w') wKing++; else bKing++;
        }
      }
    }
    const hasInvalidKings = (wKing !== 1 || bKing !== 1);
    
    const opponent = turn === 'w' ? 'b' : 'w';
    const opponentInCheck = inCheck(opponent, board);
    
    const legalMoves = allLegalMoves(turn, board, enPassantSquare, castling);
    const isGameOver = (legalMoves.length === 0);
    
    if (isDraftChecked || isDefaultPos || hasInvalidKings || opponentInCheck || isGameOver) {
      startFromPosBtn.style.display = 'none';
    } else {
      startFromPosBtn.style.display = 'block';
    }
  },

  showClaimUsernameModal() {
    const modal = document.getElementById('claimModal');
    const input = document.getElementById('claimUsernameInput');
    const errEl = document.getElementById('claimError');
    if (modal) {
      modal.style.display = 'flex';
      if (input) input.value = '';
      if (errEl) errEl.textContent = '';
      if (input) setTimeout(() => input.focus(), 100);
    }
  },

  syncAuthUI() {
    const auth = window.auth;
    if (!auth) return;
    
    const display = document.getElementById('authUsernameDisplay');
    const signInBtn = document.getElementById('googleSignInBtn');
    const signOutBtn = document.getElementById('googleSignOutBtn');
    
    if (display) {
      display.textContent = auth.username || 'Loading...';
    }
    
    const historyContainer = document.getElementById('gameHistoryContainer');
    if (historyContainer) historyContainer.style.display = 'block';

    // Determine sign-in state from the username itself, not from the async
    // Firebase `isAuthenticated` flag. The username is restored from
    // localStorage synchronously on load (before Firebase has resolved),
    // and the rest of the app already enforces "signed out === Guest-prefixed
    // username" as an invariant (see auth.js's onAuthStateChanged, signOut,
    // and the anti-tamper check). Reusing that invariant here means the
    // correct button shows immediately on load instead of flashing "Sign In"
    // for a moment while Firebase catches up.
    const isSignedIn = !!(auth.username && !auth.username.toLowerCase().startsWith('guest'));

    if (isSignedIn) {
      if (signInBtn) signInBtn.style.display = 'none';
      if (signOutBtn) signOutBtn.style.display = 'inline-block';
    } else {
      if (signInBtn) signInBtn.style.display = 'inline-block';
      if (signOutBtn) signOutBtn.style.display = 'none';
    }
  },

  setupMultiplayer() {
    const resetMulti = () => {
      window.multi.active = false;
      window.multi.isHost = false;
      window.multi.gameId = null;
      if (window.multi.unsubHeartbeat) window.multi.unsubHeartbeat();
      if (window.multi.unsubMessages) window.multi.unsubMessages();
      if (window.multi.heartbeatInterval) clearInterval(window.multi.heartbeatInterval);
    };

    const bindBtn = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', fn);
    };

    bindBtn('modeOfflineBtn', () => {
      resetMulti();
      this.showStep('stepOfflineVariants');
      window.app.renderAll();
    });

    bindBtn('showGameHistoryBtn', () => {
      this.showStep('stepGameHistory');
      if (window.app && window.app.loadGameHistory) {
        window.app.loadGameHistory();
      }
    });

    bindBtn('backToModeFromHistoryBtn', () => {
      this.showStep('stepMode');
    });



    // -- Auth Bindings --------------------------------------------------------
    bindBtn('googleSignInBtn', () => {
      if (window.auth) window.auth.signInWithGoogle();
    });
    bindBtn('googleSignOutBtn', () => {
      if (window.auth) window.auth.signOut();
    });
    bindBtn('claimSubmitBtn', async () => {
      const input = document.getElementById('claimUsernameInput');
      const errEl = document.getElementById('claimError');
      if (!input || !errEl || !window.auth) return;
      
      const val = input.value.trim();
      const btn = document.getElementById('claimSubmitBtn');
      btn.disabled = true;
      errEl.textContent = '';
      
      const res = await window.auth.claimUsername(val);
      btn.disabled = false;
      if (res.success) {
        document.getElementById('claimModal').style.display = 'none';
      } else {
        errEl.textContent = res.message;
      }
    });

    // -- Lobby Events ---------------------------------------------------------

    const backOfflineBtn = document.getElementById('backToModeFromOfflineBtn');
    if (backOfflineBtn) {
      backOfflineBtn.addEventListener('click', () => {
        this.showStep('stepMode');
      });
    }

    // Audio Settings setup
    const soundToggle = document.getElementById('soundToggleBtn');
    if (soundToggle) {
      soundToggle.addEventListener('change', (e) => {
        window.audio.enabled = e.target.checked;
        if (window.audio.enabled) {
          window.audio.playSound('move');
        }
      });
    }

    const bestMoveToggle = document.getElementById('showBestMoveToggle');
    if (bestMoveToggle) {
      bestMoveToggle.addEventListener('change', () => {
        if (window.analysis) window.analysis.drawArrow();
      });
    }

    const evalBarToggle = document.getElementById('showEvalBarToggle');
    if (evalBarToggle) {
      evalBarToggle.addEventListener('change', () => {
        if (window.app) window.app.renderAll();
      });
    }

    const hintsToggle = document.getElementById('showHintsToggle');
    if (hintsToggle) {
      hintsToggle.addEventListener('change', () => {
        if (window.app) window.app.renderAll();
      });
    }

    const draftToggleOffline = document.getElementById('draftModeToggleOffline');
    if (draftToggleOffline) {
      draftToggleOffline.addEventListener('change', () => {
        window.ui.syncStartFromPosBtn();
      });
    }

    // Clock Select logic
    const clockSelOff = document.getElementById('clockSelectOffline');
    const customUIOff = document.getElementById('customClockUIOffline');
    if (clockSelOff && customUIOff) {
      clockSelOff.addEventListener('change', (e) => {
        customUIOff.style.display = e.target.value === 'custom' ? 'flex' : 'none';
      });
    }

    const clockSelLobby = document.getElementById('clockSelectLobby');
    const customUILobby = document.getElementById('customClockUILobby');
    if (clockSelLobby && customUILobby) {
      clockSelLobby.addEventListener('change', (e) => {
        customUILobby.style.display = e.target.value === 'custom' ? 'flex' : 'none';
      });
    }

    // Grid buttons sync helper
    const setupTCGrid = (gridId, selectId) => {
      const grid = document.getElementById(gridId);
      const sel = document.getElementById(selectId);
      if (!grid || !sel) return;
      
      const btns = grid.querySelectorAll('.tc-btn');
      btns.forEach(btn => {
        btn.addEventListener('click', () => {
          if (sel.disabled) return;
          btns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          sel.value = btn.dataset.val;
          sel.dispatchEvent(new Event('change'));
        });
      });

      sel.addEventListener('change', () => {
        btns.forEach(b => {
          if (b.dataset.val === sel.value) {
            b.classList.add('active');
          } else {
            b.classList.remove('active');
          }
        });
      });
    };

    setupTCGrid('tcGridOffline', 'clockSelectOffline');
    setupTCGrid('tcGridLobby', 'clockSelectLobby');

    const copyCodeBtn = document.getElementById('copyCodeBtn');
    if (copyCodeBtn) {
      copyCodeBtn.addEventListener('click', () => {
        const textToCopy = document.getElementById('hostCodeValue').textContent;
        navigator.clipboard.writeText(textToCopy)
          .then(() => {
            copyCodeBtn.textContent = 'Copied!';
            setTimeout(() => copyCodeBtn.textContent = 'Copy Code', 2000);
          })
          .catch((err) => {
            console.error("Clipboard copy failed:", err);
            window.prompt("Copy failed or blocked by browser permissions. Please copy manually:", textToCopy);
          });
      });
    }

    // Color segmented control logic
    const segBtns = document.querySelectorAll('#lobbyColorSeg .segmented-btn');
    segBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        segBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    bindBtn('sendChallengeBtn', () => {
      window.app.sendChallenge();
    });

    bindBtn('confirmChallengeSetupBtn', () => {
      window.app.confirmChallengeSetup();
    });

    bindBtn('cancelChallengeSetupBtn', () => {
      window.app.cancelChallengeSetup();
    });

    bindBtn('acceptChallengeBtn', () => {
      const p = window.app.pendingChallenge;
      if (p) window.app.acceptChallenge();
    });

    bindBtn('declineChallengeBtn', () => {
      window.app.declineChallenge();
    });

    bindBtn('acceptProposalBtn', () => {
      window.app.acceptProposal();
    });

    bindBtn('declineProposalBtn', () => {
      window.app.declineProposal();
    });

    // -- Variant Exclusivity Rules -------------------------------------------
    const setupVariantExclusivity = (hbId, conflictingIds) => {
      const hbToggle = document.getElementById(hbId);
      if (!hbToggle) return;
      
      const conflicts = conflictingIds.map(id => document.getElementById(id)).filter(Boolean);
      
      hbToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
          conflicts.forEach(el => {
            el.checked = false;
            el.dispatchEvent(new Event('change'));
          });
        }
      });
      
      conflicts.forEach(el => {
        el.addEventListener('change', (e) => {
          if (e.target.checked) {
            hbToggle.checked = false;
            hbToggle.dispatchEvent(new Event('change'));
          }
        });
      });
    };

    // Online variants: only Hand and Brain is mutually exclusive with the others.
    setupVariantExclusivity('handAndBrainToggle', [
      'diceChessToggle',
      'identityTheftToggle',
      'fogOfWarToggle'
    ]);

    // Offline variants mutual exclusivity
    setupVariantExclusivity('handAndBrainToggleOffline', [
      'diceChessToggleOffline',
      'identityTheftToggleOffline'
    ]);
  }
};

