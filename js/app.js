// --- CHESSOLOGY APPLICATION LAYER -------------------------------------------
const TIMING = {
  SESSION_RESTORE_DELAY_MS: 500,
  RESULT_BANNER_DELAY_MS: 300,
  DRAG_THRESHOLD_PX: 6
};

window.app = {
  passPlayMode: 'static', // 'static', 'rotate', 'bothSides'
  draftColor: 'w',        // For local draft setup selection
  gameState: 'setup',
  branches: null,
  currentBranchId: 'main',

  get over() {
    return over;
  },
  set over(val) {
    over = val;
  },

  init() {
    this.bindEvents();
    newGame();
	
    setTimeout(() => this.checkAndRestoreSession(), TIMING.SESSION_RESTORE_DELAY_MS);
  },

  hideResultBanner() {
    document.getElementById('resultBanner').classList.remove('show');
  },



  isEvalVisible() {
    const showEval = document.getElementById('showEvalBarToggle')?.checked !== false;
    const isIdentityTheft = window.variants && window.variants.isIdentityTheftActive;
    const isFog = window.variants && window.variants.fogOfWarEnabled;
    if (!showEval || isIdentityTheft || isFog ) return false;
    if (this.gameState === 'playing' && !over) return false;
    return true;
  },

	isBestMoveVisible() {
  const showBest = document.getElementById('showBestMoveToggle')?.checked !== false;
  const isIdentityTheft = window.variants && window.variants.isIdentityTheftActive;
  const isFog = window.variants && window.variants.fogOfWarEnabled;
  if (!showBest || isIdentityTheft || isFog) return false;
  if (this.gameState === 'playing' && !over) return false;
  return true;
},

	
  // --- RENDERING UI ----------------------------------------------------------
  renderAll() {
    this.syncPlayerNames();
    const fogToggle = document.getElementById('fogOfWarToggle');
    if (fogToggle) {
      fogToggle.disabled = false;
    }

    // 2. Hide setup flow card once the game starts
    const gameActive = this.gameState !== 'setup';
    const setupCard = document.getElementById('setupCard');
    if (setupCard) setupCard.style.display = gameActive ? 'none' : 'block';

    const gameActionsCard = document.getElementById('gameActionsCard');
    if (gameActionsCard) {
      const showControlsCard = (this.gameState === 'playing' || this.gameState === 'analysis' || over);
      gameActionsCard.style.display = showControlsCard ? 'block' : 'none';
    }

    const resignBtn = document.getElementById('resignBtn');
    const drawBtn = document.getElementById('drawBtn');
    const rematchBtnStatus = document.getElementById('rematchBtnStatus');
    const undoBtn = document.getElementById('undoBtn');
    const returnToMenuBtn = document.getElementById('returnToMenuBtn');
    if (resignBtn) {
      const showResign = gameActive && !over && !window.variants.isDraftActive && !this.isReviewMode;
      resignBtn.style.display = showResign ? 'block' : 'none';
      const isAbort = moveHistory.length < 2;
      resignBtn.textContent = (multi.active && isAbort) ? 'Abort' : 'Resign';
    }
    if (drawBtn) {
      const showDraw = gameActive && !over && !window.variants.isDraftActive && !this.isReviewMode;
      drawBtn.style.display = showDraw ? 'block' : 'none';
    }
    if (rematchBtnStatus) {
      rematchBtnStatus.style.display = (gameActive && over && this.activeGameId) ? 'block' : 'none';
    }
    if (undoBtn) {
      const showUndo = gameActive && !over && !window.variants.isDraftActive && (multi.active || moveHistory.length > 0) && !this.isReviewMode;
      undoBtn.style.display = showUndo ? 'block' : 'none';
      
      const isUndoDisabled = !gameActive || over || (multi.active && multi.myColor !== turn && moveHistory.length > 0);
      undoBtn.disabled = isUndoDisabled;
      undoBtn.style.opacity = isUndoDisabled ? '0.4' : '1';
      undoBtn.style.pointerEvents = isUndoDisabled ? 'none' : 'auto';
    }
    if (returnToMenuBtn) {
      returnToMenuBtn.style.display = (gameActive && (over || this.isReviewMode)) ? 'block' : 'none';
    }



    // 3. Render game details
    this.renderBoard();
    if (window.analysis && window.analysis.bestMove) {
      window.analysis.drawArrow();
    }
    this.renderBars();
    this.renderHist();
    this.renderStatus();
    this.renderDraftUI();
    this.renderEditorUI();
    this.renderBranchSelector();

    // Trigger Stockfish analysis if no game is currently active
    const evalBar = document.getElementById('evalBar');
    
    // Determine if board is flipped to flip the eval bar and swap player cards
    const isPerspectiveFlipped = flipped;
    const boardCol = document.querySelector('.board-col');
    if (boardCol) {
      boardCol.classList.toggle('flipped', isPerspectiveFlipped);
    }
    
      const isEvalVisible = this.isEvalVisible();
	  const isBestMoveVisible = this.isBestMoveVisible();
	  const isIdentityTheft = window.variants && window.variants.isIdentityTheftActive;   // add this line

    
    const gameWrap = document.querySelector('.game-wrap');
    if (gameWrap) {
      gameWrap.classList.toggle('has-eval', isEvalVisible);
      gameWrap.classList.toggle('in-setup-flow', this.gameState === 'setup');
    }
    
this.isEvalVisibleCached = isEvalVisible;   // let engine.js read this without recomputing
	  

if (evalBar) {
  gameWrap.classList.toggle('has-eval', isEvalVisible);
}

if (isEvalVisible) {
  if (evalBar) {
    evalBar.style.display = 'flex';
    evalBar.classList.toggle('flipped', isPerspectiveFlipped);
  }
} else {
  if (evalBar) evalBar.style.display = 'none';
}

if ((isEvalVisible || isBestMoveVisible) && window.analysis && !window.variants.isDraftActive) {
  window.analysis.analyze(boardToFen(board, turn, castling, enPassantSquare));
} else if (window.analysis) {
  window.analysis.stop();
}
	  
    const copyFenBtn = document.getElementById('copyFenBtn');
    const copyPgnBtn = document.getElementById('copyPgnBtn');

    if (copyFenBtn) {
      copyFenBtn.style.display = (this.gameState === 'playing' && !over) ? 'none' : 'inline-flex';
    }

    if (copyPgnBtn) {
      copyPgnBtn.style.display = (this.gameState === 'playing' && !over) ? 'none' : 'inline-flex';
    }

    const evalToggle = document.getElementById('showEvalBarToggle');
    const bestToggle = document.getElementById('showBestMoveToggle');
    if (evalToggle && bestToggle) {
      const hideEngineUI = (window.variants && window.variants.isIdentityTheftActive) ||
                           (window.variants && window.variants.fogOfWarEnabled);
      evalToggle.disabled = hideEngineUI;
      bestToggle.disabled = hideEngineUI;
      evalToggle.parentElement.style.display = hideEngineUI ? 'none' : 'flex';
      bestToggle.parentElement.style.display = hideEngineUI ? 'none' : 'flex';
    }

    const importBtn = document.getElementById('importBtn');
    const fenPgnInput = document.getElementById('fenPgnInput');
    const isPlaying = (this.gameState === 'playing' && !over);
    const isMultiActive = multi.active;
    const isImportDisabled = isPlaying || isMultiActive;

    const importExportCard = document.getElementById('importExportCard');
    if (importExportCard) importExportCard.style.display = isPlaying ? 'none' : 'block';

    if (importBtn) {
      importBtn.disabled = isImportDisabled;
      importBtn.style.opacity = isImportDisabled ? '0.4' : '1';
      importBtn.style.pointerEvents = isImportDisabled ? 'none' : 'auto';
    }
    if (fenPgnInput) {
      fenPgnInput.disabled = isImportDisabled;
      fenPgnInput.style.opacity = isImportDisabled ? '0.4' : '1';
      fenPgnInput.placeholder = isPlaying ? "Import is disabled during gameplay" : (isMultiActive ? "Import is disabled during multiplayer" : "Paste FEN or PGN here...");
    }
    
    const editBoardBtn = document.getElementById('editBoardBtn');
    if (editBoardBtn) {
      const isOnline = multi.active;
      editBoardBtn.disabled = isOnline;
      editBoardBtn.style.opacity = isOnline ? '0.4' : '1';
      editBoardBtn.style.pointerEvents = isOnline ? 'none' : 'auto';
    }
  },

  renderBoard() {
    const el = document.getElementById('boardEl');
	const existingOverlay = document.getElementById('arrowOverlay');

    el.innerHTML = '';
    
    let ckr = -1, ckc = -1;
    if (!over && !window.variants.isDraftActive && !(window.variants && window.variants.isFogOfWarActive) && inCheck(turn, board)) {
      const k = findKing(turn, board);
      if (k) { ckr = k.r; ckc = k.c; }
    }

    // Determine perspective color for Fog of War and Coordinate Flipped states
    const activeViewer = multi.active ? multi.myColor : turn;
    const isPerspectiveFlipped = flipped;
    
    const getDisplayRow = rIdx => isPerspectiveFlipped ? 7 - rIdx : rIdx;
    const getDisplayCol = cIdx => isPerspectiveFlipped ? 7 - cIdx : cIdx;

    // Get Fog of War visibility map - lift fog entirely when game is over
    const hasFog = window.variants.isFogOfWarActive && !window.variants.isDraftActive && !over;
    const visibleSquares = hasFog ? window.variants.getVisibleSquares(activeViewer, board) : null;

    // Highlights validation on draft mode rows
    const isDrafting = window.variants.isDraftActive;
    const activeDraftColor = multi.active ? multi.myColor : this.draftColor;
    const isEditMode = (this.gameState !== 'playing' || over) && !multi.active && this.editorTool === 'edit';
    const suppressMoveHints = isDrafting || isEditMode;

    for (let rIdx = 0; rIdx < 8; rIdx++) {
      for (let cIdx = 0; cIdx < 8; cIdx++) {
        const r = getDisplayRow(rIdx), c = getDisplayCol(cIdx);
        const light = (r + c) % 2 === 0;
        const sq = document.createElement('div');
        sq.className = 'sq ' + (light ? 'light' : 'dark');
        sq.dataset.r = r;
        sq.dataset.c = c;

        // Render coordinate inside the square
        if (cIdx === 7) {
          const rankLbl = document.createElement('span');
          rankLbl.className = 'coord rank-coord';
          rankLbl.textContent = 8 - r;
          sq.appendChild(rankLbl);
        }
        if (rIdx === 7) {
          const fileLbl = document.createElement('span');
          fileLbl.className = 'coord file-coord';
          fileLbl.textContent = FILES[c];
          sq.appendChild(fileLbl);
        }

        // Is this square covered in Fog of War?
        const isFogged = hasFog && !visibleSquares.has(`${r},${c}`);
        if (isFogged) {
          sq.classList.add('fog');
        }

        // Apply draft highlighting
        if (isDrafting && !window.variants.draftLocked[activeDraftColor]) {
          const isMyDraftRow = activeDraftColor === 'w' ? (r >= 4 && r <= 7) : (r >= 0 && r <= 3);
          if (isMyDraftRow) {
            sq.classList.add('draft-valid');
          }
        }

        if (!isFogged) {
          if (!suppressMoveHints && selectedSquare?.r === r && selectedSquare?.c === c) sq.classList.add('selectedSquare');
          
          if (lastMove) {
            if (lastMove.from.r === r && lastMove.from.c === c) sq.classList.add('lf');
            if (lastMove.to.r === r && lastMove.to.c === c) sq.classList.add('lt');
          }
          if (r === ckr && c === ckc) sq.classList.add('chk');
          
          const showHints = document.getElementById('showHintsToggle')?.checked !== false;
          if (!suppressMoveHints && selectedSquare && showHints) {
            const mv = legal.find(m => m.r === r && m.c === c);
            if (mv) sq.classList.add(board[r][c] || mv.enp ? 'chint' : 'mhint');
          }
        }

          const piece = board[r][c];
          if (piece && !isFogged) {
            // Hide opponent's pieces during draft phase for secret drafting
            if (isDrafting && piece.color !== activeDraftColor) {
              el.appendChild(sq);
              continue;
            }
  
            const pe = document.createElement('div');
            pe.className = 'piece';
            const shouldFlip = opponentFlipped && ((!isPerspectiveFlipped && piece.color === 'b') || (isPerspectiveFlipped && piece.color === 'w'));
            if (shouldFlip) pe.classList.add('flip-piece');
            
            const isMyTurnOnline = multi.active ? (multi.myColor === turn) : true;
            if (piece.color === turn && !over && isMyTurnOnline && !isDrafting) {
              pe.classList.add('mine');
            }
            // Allow draft edits on user pieces
            if (isDrafting && piece.color === activeDraftColor && !window.variants.draftLocked[activeDraftColor]) {
              pe.classList.add('mine');
            }

          // Build SVG representation (aggregates compound icons for Append mode)
          const pTypes = piece.types || [piece.type];
          if (pTypes.length > 1) {
            // Render composite compound layout
            pe.innerHTML = this.generateCompositeSVG(piece.color, pTypes);
          } else {
            pe.innerHTML = SVG[piece.color + piece.type];
          }
          sq.appendChild(pe);
        }
        el.appendChild(sq);
      }
    }
    
	  const svgOverlay = existingOverlay || document.createElementNS("http://www.w3.org/2000/svg", "svg");
	  if (!existingOverlay) {
	    svgOverlay.id = "arrowOverlay";
	    svgOverlay.setAttribute("viewBox", "0 0 100 100");
	    svgOverlay.setAttribute("preserveAspectRatio", "none");
	    svgOverlay.setAttribute("style", "position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10;");
	  }
	  el.appendChild(svgOverlay);
  },

  generateCompositeSVG(color, types) {
    // Renders primary piece slightly scaled with secondary piece badge
    const p1 = SVG[color + types[0]];
    const p2 = SVG[color + types[1]];
    return `
      <div style="position:relative;width:100%;height:100%">
        <div style="width:85%;height:85%;position:absolute;top:0;left:0">${p1}</div>
        <div style="width:50%;height:50%;position:absolute;bottom:-2px;right:-2px;background:var(--panel2);border:1px solid var(--gold);border-radius:4px;padding:1px">${p2}</div>
      </div>
    `;
  },


	renderBars() {
	  const isDrafting = window.variants.isDraftActive;
	  document.getElementById('barW').classList.toggle('active', turn === 'w' && !over && !isDrafting);
	  document.getElementById('barB').classList.toggle('active', turn === 'b' && !over && !isDrafting);
	
	  // Tally material from pieces currently on the board (correctly reflects promotions)
	  const wCounts = { P: 0, N: 0, B: 0, R: 0, Q: 0 };
	  const bCounts = { P: 0, N: 0, B: 0, R: 0, Q: 0 };
	
	  for (let r = 0; r < board.length; r++) {
	    for (let c = 0; c < board[r].length; c++) {
	      const piece = board[r][c];
	      if (!piece) continue;
	      const pTypes = piece.types || [piece.type]; // supports composite pieces
	      const counts = piece.color === 'w' ? wCounts : bCounts;
	      pTypes.forEach(t => { if (counts[t] !== undefined) counts[t]++; });
	    }
	  }
	
	  const wm = Object.keys(wCounts).reduce((s, t) => s + wCounts[t] * (PIECE_VALUES[t] || 0), 0);
	  const bm = Object.keys(bCounts).reduce((s, t) => s + bCounts[t] * (PIECE_VALUES[t] || 0), 0);
	
	  const types = ['P', 'N', 'B', 'R', 'Q'];
	  let netW = [], netB = [];
	
	  types.forEach(t => {
	    const diff = wCounts[t] - bCounts[t];
	    if (diff > 0) {
	      for (let i = 0; i < diff; i++) netW.push({ color: 'b', type: t });
	    } else if (diff < 0) {
	      for (let i = 0; i < Math.abs(diff); i++) netB.push({ color: 'w', type: t });
	    }
	  });
	
	  document.getElementById('capW').innerHTML = netW.map(p => `<span>${SVG[p.color + p.type]}</span>`).join('');
	  document.getElementById('scoreW').textContent = wm > bm ? '+' + (wm - bm) : '';
	
	  document.getElementById('capB').innerHTML = netB.map(p => `<span>${SVG[p.color + p.type]}</span>`).join('');
	  document.getElementById('scoreB').textContent = bm > wm ? '+' + (bm - wm) : '';
	},
	
  renderHist() {
    const body = document.getElementById('histBody'); body.innerHTML = '';
    const activeIdx = viewIndex - 1;

    // Fog of War: hide opponent moves until game ends
    const hasFog = window.variants.isFogOfWarActive && !over;
    // In online fog, myColor is the viewer; opponent is the other side
    const myColor = multi.active ? multi.myColor : null;
    // White moves are at even moveHistory indices, black at odd
    const isOpponentMove = (color) => hasFog && myColor && color !== myColor;

    for (let i = 0; i < moveHistory.length; i += 2) {
      const wm = moveHistory[i], bm = moveHistory[i + 1];
      const row = document.createElement('div'); row.className = 'mrow';
      const num = document.createElement('div'); num.className = 'mnum'; num.textContent = (i / 2 + 1) + '.';

      const wc = document.createElement('div'); wc.className = 'mcell';
      if (isOpponentMove('w')) {
        wc.textContent = wm ? '???' : '';
        wc.style.opacity = '0.4';
        wc.style.cursor = 'default';
      } else {
        wc.textContent = wm?.san || '';
        wc.onclick = () => jumpTo(i + 1);
        if (i === activeIdx) wc.classList.add('cur');
        
        if (wm) {
          const vars = this.getBranchesAtMove(i + 1);
          vars.forEach(v => {
            const link = document.createElement('span');
            link.className = 'var-inline-link';
            link.textContent = ` (${this.getVarPreviewText(v, i + 1)})`;
            link.onclick = (e) => {
              e.stopPropagation();
              this.switchBranch(v.id);
            };
            wc.appendChild(link);
          });
        }
      }

      const bc2 = document.createElement('div'); bc2.className = 'mcell';
      if (isOpponentMove('b')) {
        bc2.textContent = bm ? '???' : '';
        bc2.style.opacity = '0.4';
        bc2.style.cursor = 'default';
      } else {
        bc2.textContent = bm?.san || '';
        if (bm) {
          bc2.onclick = () => jumpTo(i + 2);
          if (i + 1 === activeIdx) bc2.classList.add('cur');
          
          const vars = this.getBranchesAtMove(i + 2);
          vars.forEach(v => {
            const link = document.createElement('span');
            link.className = 'var-inline-link';
            link.textContent = ` (${this.getVarPreviewText(v, i + 2)})`;
            link.onclick = (e) => {
              e.stopPropagation();
              this.switchBranch(v.id);
            };
            bc2.appendChild(link);
          });
        }
      }

      row.append(num, wc, bc2); body.appendChild(row);
    }
    if (viewIndex === moveHistory.length) {
      body.scrollTop = body.scrollHeight;
    } else {
      const activeEl = body.querySelector('.mcell.cur');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  },

  renderStatus() {
    const el = document.getElementById('statusTxt');
    if (!el) return;

    if (window.multi && window.multi.active && window.multi.disconnectTimeRemaining !== null && window.multi.disconnectTimeRemaining !== undefined && window.multi.disconnectTimeRemaining <= 30) {
      const isAbort = (window.moveHistory && window.moveHistory.length < 2);
      const actionWord = isAbort ? 'aborting' : 'resigning';
      el.innerHTML = `<span style="color: #ff4a4a; font-weight: bold;">Disconnected... ${actionWord} in ${window.multi.disconnectTimeRemaining}s</span>`;
      return;
    }

    if (over) {
      if (viewIndex < moveHistory.length) {
        // Fall through to show status & dice choices in review mode
      } else {
        const title = document.getElementById('resultTitle')?.textContent || 'Game Over';
        const sub = document.getElementById('resultSub')?.textContent || '';
        el.textContent = sub ? `${title} - ${sub}` : title;
        return;
      }
    }

    if (this.gameState === 'setup') {
      // 1. Check for King capture (neither color has a king)
      let wKing = false, bKing = false;
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const piece = board[r][c];
          if (piece && piece.type === 'K') {
            if (piece.color === 'w') wKing = true;
            else bKing = true;
          }
        }
      }
      if (!wKing) {
        el.textContent = "Black wins! (White King Captured)";
        return;
      }
      if (!bKing) {
        el.textContent = "White wins! (Black King Captured)";
        return;
      }

      // 2. Check for checkmate, stalemate, draws, check
      const nxt = allLegalMoves(turn, board, enPassantSquare, castling, true);
      const chk = inCheck(turn, board);
      const isMate = nxt.length === 0 && chk;
      const isStale = nxt.length === 0 && !chk;
      const isInsuff = !window.variants.fogOfWarEnabled && isInsufficientMaterial(board);
      
      if (isMate) {
        const winner = turn === 'w' ? 'Black' : 'White';
        el.textContent = `Checkmate! ${winner} wins.`;
        return;
      }
      if (isStale) {
        el.textContent = "Draw (Stalemate)";
        return;
      }
      if (isInsuff) {
        el.textContent = "Draw (Insufficient material)";
        return;
      }
      if (chk) {
        el.textContent = `Check! ${turn === 'w' ? 'White' : 'Black'} to move.`;
        return;
      }
      
      let txt = moveHistory.length > 0 ? "Analysis Mode" : "Game Setup Phase";
      
      // Show dice for the move currently selected in review/history
      const reviewDice = (viewIndex < moveHistory.length) ? moveHistory[viewIndex]?.dice : null;
      if (window.variants.diceChessEnabled && reviewDice && reviewDice.length > 0) {
        const viewerColor = (viewIndex % 2 === 0) ? 'w' : 'b';
        const icons = reviewDice.map(t => {
          return `<span class="dice-piece-icon">${SVG[viewerColor + t]}</span>`;
        }).join('');
        txt += `<div class="variant-info-box">${window.ICONS.dice} Move: ${icons}</div>`;
      }
      
      el.innerHTML = txt;
      return;
    }

    if (window.pendingPowerSelection) {
      el.textContent = "Waiting for opponent to select powers...";
      return;
    }

    // Draft phase status text
    if (window.variants.isDraftActive) {
      const activeColor = multi.active ? multi.myColor : this.draftColor;
      const points = window.variants.draftPointsLeft[activeColor];
      const lockedSelf = window.variants.draftLocked[activeColor];
      
      if (lockedSelf) {
        el.textContent = "Locked in. Waiting for opponent...";
      } else {
        el.textContent = `Drafting: ${points} pts left`;
      }
      return;
    }

    // Normal game play status
    const isFog = window.variants && window.variants.isFogOfWarActive;
    let turnName = (turn === 'w' ? 'White' : 'Black');
    if (window.multi && window.multi.active) {
      const activeUser = (turn === 'w') ? window.multi.peerId : window.multi.opponentId;
      if (activeUser) {
        turnName = activeUser.charAt(0).toUpperCase() + activeUser.slice(1);
      }
    }
    let txt = '';
    if (over && viewIndex < moveHistory.length) {
      txt += '<span style="color:var(--gold); font-weight:bold; font-size:0.75rem; display:block; margin-bottom:2px;">REVIEW MODE</span>';
    }
    txt += turnName + ((!isFog && inCheck(turn, board)) ? ' is in check!' : ' to move');

// Dice Chess allowed pieces info
    if (window.variants.isDiceChessActive) {
      const reviewDice = (viewIndex < moveHistory.length) ? moveHistory[viewIndex]?.dice : window.variants.allowedDiceTypes;
      const reviewTurn = (viewIndex < moveHistory.length) ? moveHistory[viewIndex]?.turn : turn;
      if (reviewDice && reviewDice.length > 0) {
        const icons = reviewDice.map(t => {
          return `<span class="dice-piece-icon">${SVG[reviewTurn + t]}</span>`;
        }).join('');
        txt += `<div class="variant-info-box">${window.ICONS.dice} Move: ${icons}</div>`;
      } else if (viewIndex >= moveHistory.length && !over) {
        // Waiting for the roll to arrive (e.g. from the opponent over the network)
        txt += `<div class="variant-info-box"><span class="brain-thinking">${window.ICONS.dice} Rolling...</span></div>`;
      }
    }

    // Hand and Brain suggestion info
    if (window.variants.isHandAndBrainActive) {
      if (viewIndex < moveHistory.length) {
        const histSan = moveHistory[viewIndex]?.san || '';
        const playedPiece = (histSan.match(/^[NBRQK]/) || [])[0] || 'P';
        const reviewTurn = moveHistory[viewIndex]?.turn || turn;
        const icon = `<span class="dice-piece-icon">${SVG[reviewTurn + playedPiece]}</span>`;
        txt += `<div class="variant-info-box">${window.ICONS.brain} Move: ${icon}</div>`;
      } else if (window.variants.brainSuggestedPiece) {
        const icon = `<span class="dice-piece-icon">${SVG[turn + window.variants.brainSuggestedPiece]}</span>`;
        txt += `<div class="variant-info-box">${window.ICONS.brain} Move: ${icon}</div>`;
      } else {
        txt += `<div class="variant-info-box"><span class="brain-thinking">${window.ICONS.brain} Thinking...</span></div>`;
      }
    }

    el.innerHTML = txt;
  },

  syncPlayerNames() {
    const nameW = document.getElementById('nameW');
    const nameB = document.getElementById('nameB');
    if (!nameW || !nameB) return;

    if (window.multi && window.multi.active) {
      const whiteUser = (window.multi.myColor === 'w') ? window.multi.peerId : window.multi.opponentId;
      const blackUser = (window.multi.myColor === 'b') ? window.multi.peerId : window.multi.opponentId;
      nameW.textContent = whiteUser ? (whiteUser.charAt(0).toUpperCase() + whiteUser.slice(1)) : 'White';
      nameB.textContent = blackUser ? (blackUser.charAt(0).toUpperCase() + blackUser.slice(1)) : 'Black';
    } else {
      nameW.textContent = 'White';
      nameB.textContent = 'Black';
    }
  },

  renderDraftUI() {
    const container = document.getElementById('draftUI');
    if (!window.variants.isDraftActive || this.gameState === 'setup') {
      container.style.display = 'none';
      return;
    }
    container.style.display = 'block';

    const activeColor = multi.active ? multi.myColor : this.draftColor;
    const lockedSelf = window.variants.draftLocked[activeColor];
    const points = window.variants.draftPointsLeft[activeColor];

    let html = `<div class="draft-pts">Draft Points Left: <strong>${points}</strong></div>`;
    
    if (!lockedSelf) {
      const types = ['P', 'N', 'B', 'R', 'Q', 'K'];
      html += `<div class="draft-bank">`;
      types.forEach(t => {
        const cost = window.variants.getPieceCost(t);
        const label = t === 'K' ? 'Free' : `(${cost})`;
        const activeClass = window.variants.draftActivePieceType === t ? 'active' : '';
        html += `
          <button class="draft-piece-btn ${activeClass}" onclick="window.app.selectDraftPiece('${t}')">
            ${SVG[activeColor + t]}
            <span>${t} ${label}</span>
          </button>
        `;
      });
      html += `</div>`;
      html += `<button class="btn primary" style="width:100%;margin-top:6px" onclick="window.app.lockDraftSelf()">Lock Draft</button>`;
    } else {
      html += `<div class="draft-pts" style="color:var(--dim)">Draft setup submitted successfully.</div>`;
    }

    container.innerHTML = html;
  },

  selectDraftPiece(type) {
    window.variants.draftActivePieceType = type;
    this.renderAll();
  },

  renderEditorUI() {
    const container = document.getElementById('editorUI');
    if (!container) return;
    
    const isAnalysis = (this.gameState !== 'playing' || over) && !multi.active;
    const isEditActive = isAnalysis && this.editorTool === 'edit';
    
    const gameActionsCard = document.getElementById('gameActionsCard');
    const setupCard = document.getElementById('setupCard');
    
    if (!isEditActive) {
      container.style.display = 'none';
      
      const editBtn = document.getElementById('editBoardBtn');
      if (editBtn) {
        const textSpan = document.getElementById('editBtnText');
        if (textSpan) textSpan.textContent = "Edit";
        editBtn.classList.remove('primary');
        editBtn.style.display = '';
      }
      
      // Restore default visibility
      const gameActive = (this.gameState !== 'setup');
      if (gameActionsCard) {
        const showControlsCard = (this.gameState === 'playing' || this.gameState === 'analysis' || over);
        gameActionsCard.style.display = showControlsCard ? 'block' : 'none';
      }
      if (setupCard) setupCard.style.display = gameActive ? 'none' : 'block';
      return;
    }
    
    // Hide game status and select mode in edit mode
    if (gameActionsCard) gameActionsCard.style.display = 'none';
    if (setupCard) setupCard.style.display = 'none';
    
    container.style.display = 'block';
    
    const editBtn = document.getElementById('editBoardBtn');
    if (editBtn) {
      editBtn.style.display = 'none';
    }
    
    const activeColor = this.editorColor || 'w';
    const activeType = this.editorPieceType || 'P';
    
    let html = `
      <div class="card-hd">Board Editor</div>
      <div class="status-body" style="padding:10px; gap:8px; display:flex; flex-direction:column;">
        <div style="font-size:0.7rem; color:var(--dim); text-align:center; margin-bottom: 2px;">
          Select a piece below, then click a square to place it.<br>Click it again to erase. Click <strong>Exit Edit</strong> when done.
        </div>
        
        <div style="font-size:0.72rem; color:var(--gold); font-weight:600; margin-bottom:-4px;">White Pieces:</div>
        <div class="draft-bank" style="margin-top:2px; background:var(--panel2); padding:4px;">
    `;
    
    const types = ['P', 'N', 'B', 'R', 'Q', 'K'];
    types.forEach(t => {
      const isActive = (activeColor === 'w' && activeType === t);
      const activeClass = isActive ? 'active' : '';
      html += `
        <button class="draft-piece-btn ${activeClass}" onclick="window.app.selectEditorPiece('w', '${t}')">
          ${SVG['w' + t]}
          <span>${t}</span>
        </button>
      `;
    });
    
    html += `
      </div>
      
      <div style="font-size:0.72rem; color:var(--gold); font-weight:600; margin-top:4px; margin-bottom:-4px;">Black Pieces:</div>
      <div class="draft-bank" style="margin-top:2px; background:var(--panel2); padding:4px;">
    `;
    
    types.forEach(t => {
      const isActive = (activeColor === 'b' && activeType === t);
      const activeClass = isActive ? 'active' : '';
      html += `
        <button class="draft-piece-btn ${activeClass}" onclick="window.app.selectEditorPiece('b', '${t}')">
          ${SVG['b' + t]}
          <span>${t}</span>
        </button>
      `;
    });
    
    // Castling Rights check based on home square pieces
    const canWK = board[7][4]?.type === 'K' && board[7][4]?.color === 'w' && board[7][7]?.type === 'R' && board[7][7]?.color === 'w';
    const canWQ = board[7][4]?.type === 'K' && board[7][4]?.color === 'w' && board[7][0]?.type === 'R' && board[7][0]?.color === 'w';
    const canBK = board[0][4]?.type === 'K' && board[0][4]?.color === 'b' && board[0][7]?.type === 'R' && board[0][7]?.color === 'b';
    const canBQ = board[0][4]?.type === 'K' && board[0][4]?.color === 'b' && board[0][0]?.type === 'R' && board[0][0]?.color === 'b';

    let castlingHtml = '';
    if (canWK || canWQ || canBK || canBQ) {
      castlingHtml += `
        <div style="font-size:0.72rem; color:var(--gold); font-weight:600; margin-top:4px; margin-bottom:-4px;">Castling Rights:</div>
        <div style="background:var(--panel2); padding:6px; border-radius:6px; display:flex; flex-direction:column; gap:4px;">
      `;
      if (canWK) {
        castlingHtml += `
          <label style="display:flex; align-items:center; gap:6px; font-size:0.7rem; cursor:pointer;">
            <input type="checkbox" ${castling.wK ? 'checked' : ''} onchange="window.app.toggleEditorCastling('wK')">
            White King-side (O-O)
          </label>
        `;
      }
      if (canWQ) {
        castlingHtml += `
          <label style="display:flex; align-items:center; gap:6px; font-size:0.7rem; cursor:pointer;">
            <input type="checkbox" ${castling.wQ ? 'checked' : ''} onchange="window.app.toggleEditorCastling('wQ')">
            White Queen-side (O-O-O)
          </label>
        `;
      }
      if (canBK) {
        castlingHtml += `
          <label style="display:flex; align-items:center; gap:6px; font-size:0.7rem; cursor:pointer;">
            <input type="checkbox" ${castling.bK ? 'checked' : ''} onchange="window.app.toggleEditorCastling('bK')">
            Black King-side (O-O)
          </label>
        `;
      }
      if (canBQ) {
        castlingHtml += `
          <label style="display:flex; align-items:center; gap:6px; font-size:0.7rem; cursor:pointer;">
            <input type="checkbox" ${castling.bQ ? 'checked' : ''} onchange="window.app.toggleEditorCastling('bQ')">
            Black Queen-side (O-O-O)
          </label>
        `;
      }
      castlingHtml += `</div>`;
    }

    const hasUndo = this.editorUndoStack && this.editorUndoStack.length > 0;
    html += `
        </div>
        ${castlingHtml}
        <div class="btn-row" style="margin-top:6px; width:100%;">
          <button class="btn" style="flex:1; font-size:0.72rem; padding:6px 2px;" onclick="window.app.clearEditorBoard()">Clear</button>
          <button class="btn" style="flex:1; font-size:0.72rem; padding:6px 2px;" onclick="window.app.resetEditorBoard()">Reset</button>
          <button class="btn" style="flex:1; font-size:0.72rem; padding:6px 2px;" onclick="window.app.undoEditorChange()" ${hasUndo ? '' : 'disabled style="opacity:0.5; cursor:not-allowed;"'}>Undo</button>
          <button class="btn" style="flex:1; font-size:0.72rem; padding:6px 2px;" onclick="window.app.flipEditorBoard()">Flip</button>
        </div>
        <div class="btn-row" style="margin-top:6px; width:100%;">
          <button class="btn primary" style="flex:1; font-size:0.72rem; padding:6px 2px;" onclick="window.app.toggleBoardEditor()">Exit Edit</button>
        </div>
      </div>
    `;
    
    container.innerHTML = html;
  },

  toggleBoardEditor() {
    if (multi.active) {
      alert("Board editing is disabled in multiplayer games.");
      return;
    }
    
    if (this.editorTool === 'edit') {
      // 1. Validate Kings presence
      let wKingCount = 0;
      let bKingCount = 0;
      let wKing = null;
      let bKing = null;
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const piece = board[r][c];
          if (piece && piece.type === 'K') {
            if (piece.color === 'w') {
              wKingCount++;
              wKing = { r, c };
            } else if (piece.color === 'b') {
              bKingCount++;
              bKing = { r, c };
            }
          }
        }
      }
      if (wKingCount !== 1 || bKingCount !== 1) {
        alert("Cannot exit editor: there must be exactly one White King and one Black King on the board.");
        return;
      }
      
      // 2. Validate Kings distance (no touching)
      const distR = Math.abs(wKing.r - bKing.r);
      const distC = Math.abs(wKing.c - bKing.c);
      if (distR <= 1 && distC <= 1) {
        alert("Cannot exit editor: Kings cannot touch each other.");
        return;
      }
      
      // 3. Validate Pawns not on 1st or 8th rank (row 0 or row 7)
      for (let c = 0; c < 8; c++) {
        const p0 = board[0][c];
        const p7 = board[7][c];
        if (p0 && p0.type === 'P') {
          alert("Cannot exit editor: Pawns cannot be on the 8th rank.");
          return;
        }
        if (p7 && p7.type === 'P') {
          alert("Cannot exit editor: Pawns cannot be on the 1st rank.");
          return;
        }
      }
      
      // 4. Validate opponent's King is not under check
      const opponentColor = turn === 'w' ? 'b' : 'w';
      if (inCheck(opponentColor, board)) {
        alert(`Cannot exit editor: The ${opponentColor === 'w' ? 'White' : 'Black'} King is under check, but it is not their turn to move.`);
        return;
      }
      
      this.editorTool = 'move';
    } else {
      // If we were playing, pause/end the game and switch to setup/edit state
      if (this.gameState === 'playing' && !over) {
        if (!confirm("Editing the board will end the current game and enter custom setup. Proceed?")) {
          return;
        }
        this.gameState = 'setup';
        over = true;
        viewIndex = moveHistory.length;
        liveState = null;
      }
      this.editorUndoStack = [];
      this.editorTool = 'edit';
      if (!this.editorPieceType) {
        this.editorColor = 'w';
        this.editorPieceType = 'P';
      }
      clearHints();
    }
    this.renderAll();
  },

  selectEditorPiece(color, type) {
    this.editorColor = color;
    this.editorPieceType = type;
    this.editorTool = 'edit';
    this.renderAll();
  },

  setEditorTool(tool) {
    this.editorTool = tool;
    this.renderAll();
  },

  clearEditorBoard() {
    this.saveEditorHistory();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        board[r][c] = null;
      }
    }
    this.branches = null;
    this.enPassantSquare = null;
    this.currentBranchId = 'main';
    moveHistory = [];
    boardHistory = [];
    viewIndex = 0;
    liveState = null;
    this.renderAll();
  },

  resetEditorBoard() {
    this.saveEditorHistory();
    importFen(INIT_FEN, true);
    this.branches = null;
    this.currentBranchId = 'main';
    this.renderAll();
  },

  saveEditorHistory() {
    if (!this.editorUndoStack) this.editorUndoStack = [];
    this.editorUndoStack.push({
      board: cloneBoard(board),
      turn: turn,
      castling: { ...castling },
      enPassantSquare: enPassantSquare ? { ...enPassantSquare } : null
    });
    if (this.editorUndoStack.length > 20) {
      this.editorUndoStack.shift();
    }
  },

  undoEditorChange() {
    if (!this.editorUndoStack || this.editorUndoStack.length === 0) return;
    const prev = this.editorUndoStack.pop();
    board = cloneBoard(prev.board);
    turn = prev.turn;
    castling = { ...prev.castling };
    enPassantSquare = prev.enPassantSquare ? { ...prev.enPassantSquare } : null;
    this.renderAll();
  },

  toggleEditorCastling(right) {
    this.saveEditorHistory();
    castling[right] = !castling[right];
    this.renderAll();
  },

  flipEditorBoard() {
    flipped = !flipped;
    this.renderAll();
  },

  lockDraftSelf() {
    const activeColor = multi.active ? multi.myColor : this.draftColor;
    if (window.variants.lockDraft(activeColor)) {
      if (multi.active) {
        // FIX: Pass fen of my side only
        const fen = window.variants.getDraftFenForColor(activeColor);
        multi.sendDraftState(activeColor, fen, true);
      } else {
        if (activeColor === 'w' && !window.variants.draftLocked.b) {
          this.draftColor = 'b';
        } else if (activeColor === 'b' && !window.variants.draftLocked.w) {
          this.draftColor = 'w';
        }
      }
      this.checkDraftCompletion();
      this.renderAll();
    }
  },

  checkDraftCompletion() {
    if (window.variants.draftLocked.w && window.variants.draftLocked.b) {
      // Both locked! Start standard match
      window.variants.draftEnabled = false;
      
      // Roll dice for first turn if Dice Chess
      if (window.variants.diceChessEnabled) window.variants.rollDice('w');
	  else if (window.variants.handAndBrainEnabled) window.variants.requestBrainMove('w');
      
      if (window.timer && window.timer.enabled) {
        window.timer.start('w');
      }
      
      // Sync complete board to other side if host
      if (multi.active && multi.isHost) {
        const startingFen = boardToFen(board, 'w', castling, enPassantSquare);
        let headers = `[Event "Online Game"]\n[FEN "${startingFen}"]\n`;
        if (window.variants.diceChessEnabled) headers += `[Variant "Dice Chess"]\n`;
        if (window.variants.fogOfWarEnabled) headers += `[Variant "Fog of War"]\n`;
        if (window.variants.draftEnabled) headers += `[Variant "Draft Mode"]\n`;
        if (window.variants.identityTheftEnabled) headers += `[Variant "Identity Theft (${window.variants.identityTheftMode})"]\n`;
        
        multi.sendMove(headers);
      }
      
      alert("Draft completed! The battle begins.");
      // Reset live state history baseline
      boardHistory = [cloneState()];
      viewIndex = 0;
      liveState = null;
    }
  },

  // â”€â”€â”€ MOVE EXECUTION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  execMove(fromRow, fromCol, toRow, toCol, flags, promo = null) {
    this.execMoveDirect(fromRow, fromCol, toRow, toCol, flags, promo);

    // Roll dice / Think Stockfish
    if (window.variants.diceChessEnabled) window.variants.rollDice(turn);
    if (window.variants.handAndBrainEnabled) window.variants.requestBrainMove(turn);

    // Sync online move if multi; unless a power-select trim is pending,
    // in which case showPowerSelect's confirmBtn.onclick sends it once resolved.
    if (multi.active && turn !== multi.myColor && !window.pendingPowerSelection) {
      multi.sendMove(exportPgn());
    }

    this.renderAll();
  },

  execMoveDirect(fromRow, fromCol, toRow, toCol, flags, promo = null) {
    const isAnalysis = (this.gameState !== 'playing' || over) && !multi.active;
    if (isAnalysis) {
      over = false;
    }
    if (isAnalysis && viewIndex < moveHistory.length) {
      const branchId = 'var-' + Date.now();
      moveHistory = moveHistory.slice(0, viewIndex);
      boardHistory = boardHistory.slice(0, viewIndex);
      
      if (!this.branches) {
        this.branches = [
          {
            id: 'main',
            name: 'Main Line',
            moveHistory: [],
            boardHistory: [],
            liveState: cloneState(),
            over: true
          }
        ];
      }
      
      const parentBranchId = this.currentBranchId;
      const parentMoveIdx = viewIndex;

      const newBranch = {
        id: branchId,
        name: `Var at Move ${Math.floor(viewIndex / 2) + 1}`,
        moveHistory: [...moveHistory],
        boardHistory: [...boardHistory],
        liveState: cloneState(),
        parentBranchId: parentBranchId,
        parentMoveIdx: parentMoveIdx,
        over: false
      };
      this.branches.push(newBranch);
      this.currentBranchId = branchId;
    }

    const bb = cloneBoard(board);
    boardHistory.push(cloneState());
    const piece = board[fromRow][fromCol];
    const cap = flags.enp ? { color: turn === 'w' ? 'b' : 'w', type: 'P' } : board[toRow][toCol];

    // Snapshot pre-move enPassantSquare/castling for correct SAN disambiguation
    const prevEnPassantSquare = enPassantSquare ? { ...enPassantSquare } : null;
    const prevCastlingRights = { ...castling };

    board = applyMv(board, { r: fromRow, c: fromCol }, { r: toRow, c: toCol }, flags, promo);
    
    updateCastlingAfterMove(piece, { r: fromRow, c: fromCol }, { r: toRow, c: toCol });

    enPassantSquare = flags.dp ? { r: (fromRow + toRow) / 2, c: fromCol } : null;
    if (piece.type === 'P' || cap) halfMoveClock = 0; else halfMoveClock++;
    
    const prev = turn;
    turn = turn === 'w' ? 'b' : 'w';
    if (prev === 'b') fullMoveNumber++;


    if (window.timer.enabled) {
      window.timer.switchTurn(turn);
    }

    const nxt = allLegalMoves(turn, board, enPassantSquare, castling, true);
    const chk = (window.variants && window.variants.isFogOfWarActive) ? false : inCheck(turn, board);
    const isMate = nxt.length === 0 && chk, isStale = nxt.length === 0 && !chk;

    const currFen = boardToFen(board, turn, castling, enPassantSquare);
    const counts = positionHistory();
    const isRep = counts[currFen] >= 3;
	const isInsuff = !window.variants.fogOfWarEnabled && isInsufficientMaterial(board);

    const san = moveToSAN({ r: fromRow, c: fromCol }, { r: toRow, c: toCol }, piece, cap, flags, bb, isMate, chk, promo, prevEnPassantSquare, prevCastlingRights);
    lastMove = { from: { r: fromRow, c: fromCol }, to: { r: toRow, c: toCol } };
    moveHistory.push({
      san,
      turn: prev,
      cap,
      dice: window.variants.diceChessEnabled ? [...window.variants.allowedDiceTypes] : null
    });

if (window.variants && window.variants.diceChessEnabled) {
      window.variants.allowedDiceTypes = [];
    }
	  
    if (this.branches && this.currentBranchId !== 'main') {
      const activeBranch = this.branches.find(b => b.id === this.currentBranchId);
      if (activeBranch && activeBranch.name.startsWith('Var at Move')) {
        const moveNumber = Math.floor((moveHistory.length - 1) / 2) + 1;
        const isWhite = ((moveHistory.length - 1) % 2 === 0);
        activeBranch.name = `Var: ${moveNumber}${isWhite ? '.' : '...'}${san}`;
      }
    }
    
    viewIndex = moveHistory.length;
    liveState = null;
    selectedSquare = null;
    legal = [];

    // Trigger local sounds
    if (isMate) window.audio.playSound('end');
    else if (chk) window.audio.playSound('check');
    else if (cap) window.audio.playSound('capture');
    else window.audio.playSound('move');

    // Auto rotate perspective locally if set in Pass 'n' Play
    if (!multi.active && this.passPlayMode === 'rotate') {
      flipped = (turn === 'b');
    }

    const doEnd = (title, sub) => {
      if (this.gameState === 'setup') return;
      over = true;
      window.app.isReviewMode = true;
      window.app.clearSessionState();
      if (multi.active) {
        multi.saveGameResult(title);
      }
      window.app.saveGameToHistory(title);
      setTimeout(() => {
        document.getElementById('resultTitle').textContent = title;
        document.getElementById('resultSub').textContent = sub;
        document.getElementById('resultBanner').classList.add('show');
        if (!isMate && !(cap && cap.type === 'K')) window.audio.playSound('end');
      }, TIMING.RESULT_BANNER_DELAY_MS);
    };

    if (cap && cap.type === 'K') {
      const winner = cap.color === 'w' ? 'Black' : 'White';
      doEnd(`${winner} Wins!`, 'King Captured');
      return;
    }

    if (isMate || isStale || halfMoveClock >= 100 || isRep || isInsuff) {
      if (isMate) doEnd((prev === 'w' ? 'White' : 'Black') + ' Wins!', 'by checkmate');
      else if (isStale) doEnd('Draw', 'Stalemate');
      else if (halfMoveClock >= 100) doEnd('Draw', '50-move rule');
      else if (isRep) doEnd('Draw', 'Threefold repetition');
      else if (isInsuff) doEnd('Draw', 'Insufficient material');
      return;
    }

    const movedPiece = board[toRow][toCol];
    // In 'append' mode, a piece can theoretically collect identities like Infinity Stones.
    // However, to keep the UI from imploding, we hard-cap it at 2 active powers.
    // If they grab a 3rd, we freeze the game and force them to trim back down to 2.
    if (window.variants.isIdentityTheftActive && window.variants.identityTheftMode === 'append' && movedPiece && movedPiece.types && movedPiece.types.length > 2) {
      window.pendingPowerSelection = { r: toRow, c: toCol, types: [...movedPiece.types], selected: [] };
      if (window.timer && window.timer.enabled) {
        window.timer.stop();
      }
      const isMyPiece = multi.active ? (multi.myColor === prev) : true;
      if (isMyPiece) {
        this.showPowerSelect(toRow, toCol, movedPiece.color, movedPiece.types);
      }
    }
    if (!over) {
      this.saveSessionState();
    }
    this.saveGameToHistory();
  },

  showPowerSelect(r, c, color, types) {
    const container = document.getElementById('powerSelectContainer');
    const confirmBtn = document.getElementById('confirmPowerSelectBtn');
    container.innerHTML = '';
    window.pendingPowerSelection.selected = [];
    confirmBtn.disabled = true;

    types.forEach(t => {
      const btn = document.createElement('div');
      btn.className = 'pbtn';
      btn.style.width = '48px'; btn.style.height = '48px';
      btn.innerHTML = SVG[color + t];
      btn.dataset.type = t;
      btn.addEventListener('click', () => {
        const selectedList = window.pendingPowerSelection.selected;
        if (selectedList.includes(t)) {
          selectedList.splice(selectedList.indexOf(t), 1);
          btn.style.borderColor = 'var(--border)';
        } else if (selectedList.length < 2) {
          selectedList.push(t);
          btn.style.borderColor = 'var(--gold)';
        }
        confirmBtn.disabled = selectedList.length !== 2;
      });
      container.appendChild(btn);
    });

	  confirmBtn.onclick = () => {
      const selectedList = window.pendingPowerSelection.selected;
      document.getElementById('powerSelectOverlay').classList.remove('show');
      
      // Update locally
      const p = board[r][c];
      p.types = [...selectedList];
      p.types.sort((a, b) => (PIECE_VALUES[b] || 0) - (PIECE_VALUES[a] || 0));
      p.type = p.types[0];

      // Tag the move that caused this trim, so PGN can reproduce the pick
      const idx = realMoveHistory.length - 1;
      if (idx >= 0) {
        const mv = realMoveHistory[idx];
        const trail = mv.san.match(/[+#]*$/)[0];
        mv.san = mv.san.slice(0, mv.san.length - trail.length) + '=' + p.types.join('') + trail;
      }
      
      window.pendingPowerSelection = null;
      this.renderAll();

      // Now that the pick is final, sync the move to the opponent
      if (multi.active && multi.myColor === color) {
        multi.sendMove(exportPgn());
      }

      if (window.timer && window.timer.enabled) {
        window.timer.start(turn);
      }

      if (multi.active) {
        multi.sendSignal('trim-powers', { r, c, types: p.types });
      }
    };

    document.getElementById('powerSelectOverlay').classList.add('show');
  },

  renderBranchSelector() {
    if (!this.branches || (moveHistory.length === 0 && this.branches.find(b => b.id === this.currentBranchId)?.moveHistory.length > 0)) {
      this.branches = [
        {
          id: 'main',
          name: 'Main Line',
          moveHistory: [...moveHistory],
          boardHistory: [...boardHistory],
          liveState: cloneState(),
          over: over
        }
      ];
      this.currentBranchId = 'main';
    }

    const activeBranch = this.branches.find(b => b.id === this.currentBranchId);
    if (activeBranch && viewIndex === moveHistory.length) {
      activeBranch.moveHistory = [...moveHistory];
      activeBranch.boardHistory = [...boardHistory];
      activeBranch.liveState = cloneState();
      activeBranch.over = over;
    }

    const branchSelect = document.getElementById('branchSelect');
    if (branchSelect) {
      branchSelect.style.display = 'none';
    }
  },

  switchBranch(branchId) {
    const branch = this.branches.find(b => b.id === branchId);
    if (!branch) return;

    // Save current branch's over state before switching
    const currentBranch = this.branches.find(b => b.id === this.currentBranchId);
    if (currentBranch) {
      currentBranch.over = over;
    }
    
    this.currentBranchId = branchId;
    moveHistory = [...branch.moveHistory];
    boardHistory = [...branch.boardHistory];
    
    restoreState(branch.liveState);
    over = branch.over !== undefined ? branch.over : false;
    viewIndex = moveHistory.length;
    liveState = null;
    selectedSquare = null;
    legal = [];
    
    this.renderAll();
  },

  getBranchesAtMove(branchIdx) {
    if (!this.branches) return [];
    const list = [];
    
    // We want to find other branches that branch off at this exact ply (index branchIdx - 1).
    // They must share the exact same prefix of moves up to branchIdx - 1.
    const myPrefix = moveHistory.slice(0, branchIdx - 1);
    const myMove = moveHistory[branchIdx - 1];
    if (!myMove) return [];
    
    this.branches.forEach(b => {
      if (b.id === this.currentBranchId) return;
      
      // Check if this branch has enough moves
      if (b.moveHistory.length < branchIdx) return;
      
      // Check if it shares the prefix
      let prefixMatch = true;
      for (let i = 0; i < branchIdx - 1; i++) {
        if (b.moveHistory[i]?.san !== myPrefix[i]?.san) {
          prefixMatch = false;
          break;
        }
      }
      if (!prefixMatch) return;
      
      // Check if the move at branchIdx - 1 is different
      const otherMove = b.moveHistory[branchIdx - 1];
      if (otherMove && otherMove.san !== myMove.san) {
        list.push(b);
      }
    });
    
    return list;
  },

  getVarPreviewText(v, branchIdx) {
    let text = '';
    const startPly = branchIdx - 1;
    for (let i = 0; i < 2; i++) {
      const plyIdx = startPly + i;
      const mv = v.moveHistory[plyIdx];
      if (!mv) break;
      
      const moveNumber = Math.floor(plyIdx / 2) + 1;
      const isWhite = (plyIdx % 2 === 0);
      if (i === 0) {
        text += (isWhite ? moveNumber + '.' : moveNumber + '...') + mv.san;
      } else {
        text += ' ' + (isWhite ? moveNumber + '.' : '') + mv.san;
      }
    }
    if (v.moveHistory.length > startPly + 2) {
      text += '...';
    }
    return text;
  },

  exportPgnRecursive(history, startPly = 0) {
    let pgn = "";
    let printNum = true;
    
    for (let i = startPly; i < history.length; i++) {
      const isWhite = (i % 2 === 0);
      const moveNumber = Math.floor(i / 2) + 1;
      
      let commentStr = "";
      if (history[i].dice && history[i].dice.length > 0) {
        commentStr = ` {Dice: ${history[i].dice.join(',')}}`;
      }

      if (isWhite) {
        pgn += `${moveNumber}. ${history[i].san}${commentStr} `;
        printNum = false;
      } else {
        if (printNum) {
          pgn += `${moveNumber}... ${history[i].san}${commentStr} `;
          printNum = false;
        } else {
          pgn += `${history[i].san}${commentStr} `;
        }
      }
      
      const nextPly = i + 2;
      const vars = this.getBranchesAtMove(nextPly);
      if (vars.length > 0) {
        vars.forEach(v => {
          const varPgn = this.exportPgnRecursive(v.moveHistory, i + 1);
          pgn += `(${varPgn.trim()}) `;
        });
        printNum = true;
      }
    }
    return pgn.trim();
  },

  generatePgnHeaders() {
    const isIdentityTheft = window.variants && window.variants.isIdentityTheftActive;
    const isDiceChess = window.variants && window.variants.isDiceChessActive;
    const isDraft = window.variants && window.variants.isDraftActive;
    const isFog = window.variants && window.variants.isFogOfWarActive;
	
	
    
    let headers = "";
    headers += `[Event "Local Game"]\n`;
    headers += `[Site "Chessology"]\n`;
    
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    headers += `[Date "${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}"]\n`;
    headers += `[Round "1"]\n`;
    headers += `[White "White"]\n`;
    headers += `[Black "Black"]\n`;
    headers += `[Result "*"]\n`;
    
    const startingFen = (boardHistory.length > 0) ? boardToFen(boardHistory[0].board, boardHistory[0].turn, boardHistory[0].castling, boardHistory[0].enPassantSquare) : INIT_FEN;
    if (startingFen !== INIT_FEN) {
      headers += `[FEN "${startingFen}"]\n`;
      headers += `[SetUp "1"]\n`;
    }
    
    if (isIdentityTheft) {
      headers += `[Variant "Identity Theft (${window.variants.identityTheftMode})"]\n`;
      headers += `[Note "Only workable in Chessology parser"]\n`;
    } else if (isDiceChess) {
      headers += `[Variant "Dice Chess"]\n`;
    } else if (window.variants && window.variants.isHandAndBrainActive) {   
      headers += `[Variant "Hand and Brain"]\n`;
    } else if (isDraft) {
      headers += `[Variant "Draft Mode"]\n`;
    } else if (isFog) {
      headers += `[Variant "Fog of War"]\n`;
    }
    
    return headers + "\n";
  },

  // â”€â”€â”€ USER INTERACTION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  bindEvents() {
    // Board pointer interactions
    const boardEl = document.getElementById('boardEl');
    boardEl.addEventListener('pointerdown', this.onPointerDown.bind(this));

    const branchSelect = document.getElementById('branchSelect');
    if (branchSelect) {
      branchSelect.addEventListener('change', e => {
        this.switchBranch(e.target.value);
      });
    }

    // Keyboard Arrow navigation & Escape bindings
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && selectedSquare && !over) {
        clearHints();
        this.renderAll();
      }
      if (moveHistory.length > 0) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          if (viewIndex > 0) jumpTo(viewIndex - 1);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          if (viewIndex < moveHistory.length) jumpTo(viewIndex + 1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          jumpTo(0);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          jumpTo(moveHistory.length);
        }
      }
    });

    // Sidebar selectors setup
    const passPlaySeg = document.getElementById('passPlaySeg');
    if (passPlaySeg) {
      passPlaySeg.querySelectorAll('.segmented-btn').forEach(btn => {
        btn.addEventListener('click', e => {
          const targetBtn = e.currentTarget;
          const wasActive = targetBtn.classList.contains('active');
          
          passPlaySeg.querySelectorAll('.segmented-btn').forEach(b => b.classList.remove('active'));
          targetBtn.classList.add('active');
          this.passPlayMode = targetBtn.dataset.val;
          opponentFlipped = (this.passPlayMode === 'bothSides');
          
          if (this.passPlayMode === 'static') {
            if (wasActive) {
              flipped = !flipped;
            } else {
              flipped = false;
            }
          } else if (this.passPlayMode === 'rotate') {
            flipped = (turn === 'b');
          } else {
            flipped = false;
          }
          this.renderAll();
        });
      });
    }

    document.getElementById('backToModeFromOfflineBtn').addEventListener('click', () => {
      this.showStep('stepMode');
    });

    // Variants toggles have no immediate side-effects.
    // They are securely read and locked in when startGame() is called.
  },

  onPointerDown(e) {
    if (pointerId !== null || window.pendingPowerSelection) return;
    
    // Lock controls online when it is opponent's turn (only if game is active)
	if (this.gameState === 'playing' && multi.active && turn !== multi.myColor && !window.variants.isDraftActive) return;
  if (window.variants.diceChessEnabled && (over || this.isReviewMode)) return;

    // Handle Board Editor placement click interactions
    const isEditMode = (this.gameState !== 'playing' || over) && !multi.active && this.editorTool === 'edit';
    if (isEditMode) {
      const sq = sqFromXY(e.clientX, e.clientY);
      if (sq) {
        this.saveEditorHistory();
        const { r, c } = sq;
        const activeColor = this.editorColor || 'w';
        const activeType = this.editorPieceType || 'P';
        
        const existing = board[r][c];
        if (existing && existing.color === activeColor && existing.type === activeType) {
          board[r][c] = null;
        } else {
          // If placing a King, remove any existing King of the same color first
          if (activeType === 'K') {
            for (let row = 0; row < 8; row++) {
              for (let col = 0; col < 8; col++) {
                if (board[row][col]?.type === 'K' && board[row][col]?.color === activeColor) {
                  board[row][col] = null;
                }
              }
            }
          }
          
          board[r][c] = {
            color: activeColor,
            type: activeType,
            types: [activeType]
          };
        }
        
        this.branches = null;
        this.currentBranchId = 'main';
        moveHistory = [];
        boardHistory = [];
        viewIndex = 0;
        liveState = null;
        
        this.renderAll();
      }
      return;
    }

    if (over && this.gameState !== 'analysis' && multi.active) return;

    // Snaps back to live if viewing history (unless in analysis mode)
    const isAnalysis = (this.gameState !== 'playing' || over) && !multi.active;
    if (viewIndex !== moveHistory.length && !isAnalysis) {
      jumpTo(moveHistory.length);
      return;
    }

    const sq = sqFromXY(e.clientX, e.clientY);
    if (!sq) return;
    const { r, c } = sq;

    // Handle Draft placement click interactions
    if (window.variants.isDraftActive) {
      const activeColor = multi.active ? multi.myColor : this.draftColor;
      if (!window.variants.draftLocked[activeColor]) {
        window.variants.handleDraftPlace(r, c, activeColor);
        this.renderAll();
      }
      return;
    }

    const piece = board[r][c];
    if (!piece || piece.color !== turn) {
      this.clickSq(r, c);
      return;
    }
    
    if (!this.isMyTurn()) return;

    pointerId = e.pointerId;
    dragStartSquare = { r, c };
    isDragging = false;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    
    const wasSelected = (selectedSquare && selectedSquare.r === r && selectedSquare.c === c);
    
    selectedSquare = { r, c };
    legal = legalMovesForPiece(r, c, board, enPassantSquare, castling);
    this.updateHints();

    const sqEl = boardEl.querySelector(`.sq[data-r="${r}"][data-c="${c}"]`);
    draggedElement = sqEl ? sqEl.querySelector('.piece') : null;

    if (draggedElement) {
      boardEl.setPointerCapture(pointerId);
      draggedElement.classList.add('dragging-active');
    }

    const onPointerMove = (ev) => {
      if (pointerId === null || ev.pointerId !== pointerId || !draggedElement) return;
      const dx = ev.clientX - dragStartX;
      const dy = ev.clientY - dragStartY;
      if (!isDragging && Math.hypot(dx, dy) > TIMING.DRAG_THRESHOLD_PX) {
        isDragging = true;
      }
      if (isDragging) {
        draggedElement.style.transform = `translate(${dx}px, ${dy}px)`;
        hlDropXY(ev.clientX, ev.clientY);
      }
    };

    const cleanup = () => {
      boardEl.removeEventListener('pointermove', onPointerMove);
      boardEl.removeEventListener('pointerup', onPointerUp);
      boardEl.removeEventListener('pointercancel', onPointerCancel);
      document.querySelectorAll('.sq.dov').forEach(el2 => el2.classList.remove('dov'));

      if (draggedElement) {
        try {
          boardEl.releasePointerCapture(pointerId);
        } catch (err) {}
        draggedElement.classList.remove('dragging-active');
        draggedElement.style.transform = '';
      }

      pointerId = null;
      draggedElement = null;
      isDragging = false;
    };

    const onPointerUp = (ev) => {
      if (pointerId === null || ev.pointerId !== pointerId) return;

      const endSq = sqFromXY(ev.clientX, ev.clientY);
      const wasDragged = isDragging;

      cleanup();

      if (wasDragged && endSq && dragStartSquare && (endSq.r !== dragStartSquare.r || endSq.c !== dragStartSquare.c)) {
        const mv = legal.find(m => m.r === endSq.r && m.c === endSq.c);
        if (mv) {
          const mp = board[dragStartSquare.r][dragStartSquare.c];
          if (this.checkPromo(mp, endSq.r, endSq.c)) {
            showPromo(mp.color, p => this.execMove(dragStartSquare.r, dragStartSquare.c, endSq.r, endSq.c, mv, p));
          } else {
            clearHints();
            this.execMove(dragStartSquare.r, dragStartSquare.c, endSq.r, endSq.c, mv);
          }
        }
      } else if (!wasDragged && wasSelected) {
        clearHints();
        this.updateHints();
      } else {
        // clicked to select: already highlighted in onPointerDown, do nothing
      }
    };

    const onPointerCancel = (ev) => {
      if (pointerId === null || ev.pointerId !== pointerId) return;
      cleanup();
      this.renderAll();
    };

    boardEl.addEventListener('pointermove', onPointerMove);
    boardEl.addEventListener('pointerup', onPointerUp);
    boardEl.addEventListener('pointercancel', onPointerCancel);
  },

  updateHints() {
    document.querySelectorAll('.sq').forEach(sq => {
      sq.classList.remove('selectedSquare', 'chint', 'mhint');
    });
    if (!selectedSquare) return;
    
    const selSq = boardEl.querySelector(`.sq[data-r="${selectedSquare.r}"][data-c="${selectedSquare.c}"]`);
    if (selSq) selSq.classList.add('selectedSquare');
    
    const showHints = document.getElementById('showHintsToggle')?.checked !== false;
    if (!showHints) return;
    
    legal.forEach(m => {
      const sq = boardEl.querySelector(`.sq[data-r="${m.r}"][data-c="${m.c}"]`);
      if (sq) {
        sq.classList.add(board[m.r][m.c] || m.enp ? 'chint' : 'mhint');
      }
    });
  },

  clickSq(r, c) {
    if ((over && multi.active) || window.pendingPowerSelection) return;
    const piece = board[r][c];
    if (selectedSquare) {
      const { r: sr, c: sc } = selectedSquare;
      if (sr === r && sc === c) {
        clearHints();
        this.updateHints();
        return;
      }
      const mv = legal.find(m => m.r === r && m.c === c);
      if (mv) {
        const mp = board[sr][sc];
        if (this.checkPromo(mp, r, c)) {
          showPromo(mp.color, p => this.execMove(sr, sc, r, c, mv, p));
          return;
        }
        clearHints();
        this.execMove(sr, sc, r, c, mv);
        return;
      }
      if (piece && piece.color === turn) {
        if (!this.isMyTurn()) return;
        selectedSquare = { r, c };
        legal = legalMovesForPiece(r, c, board, enPassantSquare, castling);
        this.updateHints();
        return;
      }
      clearHints();
      this.updateHints();
      return;
    }
    if (piece && piece.color === turn) {
      if (!this.isMyTurn()) return;
      selectedSquare = { r, c };
      legal = legalMovesForPiece(r, c, board, enPassantSquare, castling);
      this.updateHints();
    }
  },

  isMyTurn() {
    if (this.gameState !== 'playing') return true;
    return !multi.active || multi.myColor === turn;
  },

  checkPromo(mp, r, c) {
    const promoRank = mp.color === 'w' ? 0 : 7;
    const target = board[r][c];
    
    // A pawn stealing a non-pawn's identity doesn't need to promote. It just became something better anyway.
    const isStealCaptureOfNonPawn = target && target.type !== 'P' && window.variants.isIdentityTheftActive && window.variants.identityTheftMode === 'steal';
    
    if (mp.type === 'P' && r === promoRank && !isStealCaptureOfNonPawn) return true;
    
    // Steal-mode capture of a pawn on the promotion rank would leave the piece as an illegal P on rank 1 or 8.
    // That breaks the universe. So we route it through normal promotion instead.
    if (window.variants.isIdentityTheftActive && window.variants.identityTheftMode === 'steal') {
      if (target && target.type === 'P' && r === promoRank) {
        return true;
      }
    }
    return false;
  },

  showHints(r, c) {
    selectedSquare = { r, c };
    legal = legalMovesForPiece(r, c, board, enPassantSquare, castling);
  },

  // â”€â”€â”€ SIGNALING & MULTIPLAYER SETUP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


  onLobbyConnected(role) {
    window.ui.showStep('stepOnlineLobby');
    const peerName = role === 'Host' ? 'Joiner' : 'Host';
    document.getElementById('lobbyPeerName').textContent = peerName;
    // Start with fresh defaults in the lobby
    this.hideResultBanner();
    over = false;

    // Lock controls and hide send button for Joiner
    const isJoiner = role === 'Joiner';
    document.getElementById('diceChessToggle').disabled = isJoiner;
    document.getElementById('draftModeToggle').disabled = isJoiner;
    document.getElementById('identityTheftToggle').disabled = isJoiner;
    document.getElementById('identityTheftMode').disabled = isJoiner;
    
    document.getElementById('clockSelectLobby').disabled = isJoiner;
    document.getElementById('wTimeLobby').disabled = isJoiner;
    document.getElementById('wIncLobby').disabled = isJoiner;
    document.getElementById('bTimeLobby').disabled = isJoiner;
    document.getElementById('bIncLobby').disabled = isJoiner;
    
    const colorBtns = document.querySelectorAll('#lobbyColorSeg .segmented-btn');
    colorBtns.forEach(btn => {
      btn.style.pointerEvents = isJoiner ? 'none' : 'auto';
      btn.style.opacity = isJoiner ? '0.5' : '1';
    });

    const sendBtn = document.getElementById('sendChallengeBtn');
    if (sendBtn) {
      sendBtn.style.display = isJoiner ? 'none' : 'block';
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send Challenge';
    }

    let statusMsg = document.getElementById('lobbyJoinerStatus');
    if (!statusMsg) {
      statusMsg = document.createElement('div');
      statusMsg.id = 'lobbyJoinerStatus';
      statusMsg.style.fontSize = '0.75rem';
      statusMsg.style.color = 'var(--gold)';
      statusMsg.style.textAlign = 'center';
      statusMsg.style.marginTop = '8px';
      if (sendBtn) sendBtn.parentNode.insertBefore(statusMsg, sendBtn);
    }
    statusMsg.textContent = isJoiner ? 'Waiting for Host to send challenge...' : '';
  },

  readLobbyVariants() {
    return {
      diceChessEnabled: document.getElementById('diceChessToggle').checked,
      fogOfWarEnabled: document.getElementById('fogOfWarToggle').checked,
      draftEnabled: document.getElementById('draftModeToggle').checked,
      identityTheftEnabled: document.getElementById('identityTheftToggle').checked,
      identityTheftMode: document.getElementById('identityTheftMode').value,
	  handAndBrainEnabled: document.getElementById('handAndBrainToggle').checked   // add this

    };
  },

  readClockConfig(mode) {
    // 'Lobby' uses elements: clockSelectLobby, wTimeLobby, bTimeLobby, wIncLobby, bIncLobby
    // 'Offline' uses elements: clockSelectOffline, wTimeOff, bTimeOff, wIncOff, bIncOff
    const isLobby = mode === 'Lobby';
    const selectedOption = document.getElementById(isLobby ? 'clockSelectLobby' : 'clockSelectOffline').value;
    if (selectedOption === 'custom') {
      const suffix = isLobby ? 'Lobby' : 'Off';
      return {
        wTime: parseInt(document.getElementById('wTime' + suffix).value) || 0,
        bTime: parseInt(document.getElementById('bTime' + suffix).value) || 0,
        wInc:  parseInt(document.getElementById('wInc'  + suffix).value) || 0,
        bInc:  parseInt(document.getElementById('bInc'  + suffix).value) || 0
      };
    }
    const [minutes, inc] = selectedOption.split('|').map(Number);
    return { wTime: minutes * 60, bTime: minutes * 60, wInc: inc, bInc: inc };
  },

  sendChallenge() {
    // Step 1: triggered by the main "Send Challenge" button.
    // Validates the target username, then opens the Challenge Settings
    // dialog (time control + color) instead of sending immediately.
    const sendBtn = document.getElementById('sendChallengeBtn');
    if (sendBtn.disabled) return;

    const targetUser = document.getElementById('connIdInput')?.value;
    if (!targetUser) {
      alert("Please enter a username to challenge.");
      return;
    }

    document.getElementById('challengeSetupOv')?.classList.add('show');
  },

  cancelChallengeSetup() {
    document.getElementById('challengeSetupOv')?.classList.remove('show');
  },

  confirmChallengeSetup() {
    // Step 2: triggered by the Confirm button inside the Challenge Settings dialog.
    // Reads the chosen time control + color, then actually sends the challenge.
    const sendBtn = document.getElementById('sendChallengeBtn');
    const targetUser = document.getElementById('connIdInput')?.value;
    if (!targetUser) {
      alert("Please enter a username to challenge.");
      return;
    }

    const colorBtn = document.querySelector('#lobbyColorSeg .segmented-btn.active');
    const colorReq = colorBtn ? colorBtn.dataset.color : 'random';

    multi.sendChallenge(
      targetUser,
      this.readLobbyVariants(),
      colorReq,
      this.readClockConfig('Lobby')
    );

    document.getElementById('challengeSetupOv')?.classList.remove('show');

    sendBtn.disabled = true;
    sendBtn.textContent = 'Waiting for opponent...';
  },

  acceptChallenge() {
    if (this.challengePopupTimeout) clearTimeout(this.challengePopupTimeout);
    if (!this.pendingChallenge) return;
    multi.acceptChallenge(this.pendingChallenge.challengeId);
    document.getElementById('challengePopup').style.display = 'none';
    this.pendingChallenge = null;
  },

  declineChallenge() {
    if (this.challengePopupTimeout) clearTimeout(this.challengePopupTimeout);
    if (!this.pendingChallenge) return;
    multi.declineChallenge(this.pendingChallenge.challengeId);
    document.getElementById('challengePopup').style.display = 'none';
    this.pendingChallenge = null;
  },

  showProposal(type) {
    this.pendingProposal = type;
    const title = document.getElementById('proposalTitle');
    const text = document.getElementById('proposalText');
    const popup = document.getElementById('proposalPopup');
    
    if (type === 'undo') {
      title.textContent = "Undo Request";
      text.textContent = "Opponent has requested to undo the last move.";
    } else if (type === 'reset') {
      title.textContent = "Restart Request";
      text.textContent = "Opponent has requested to restart the game.";
    } else if (type === 'draw') {
      title.textContent = "Draw Offer";
      text.textContent = "Opponent has offered a draw.";
    }
    if (popup) popup.style.display = 'block';
  },

  acceptProposal() {
    if (!this.pendingProposal) return;
    const type = this.pendingProposal;
    this.pendingProposal = null;
    const popup = document.getElementById('proposalPopup');
    if (popup) popup.style.display = 'none';
    
    if (type === 'undo') {
      multi.sendSignal('accept-undo');
      this.localUndo();
    } else if (type === 'reset') {
      multi.sendSignal('accept-reset');
      this.localReset();
      if (multi.isHost) {
        rtdb.ref('games/' + multi.gameId).update({
          pgn: '',
          draftLocked_w: false,
          draftLocked_b: false,
          draft_w: '',
          draft_b: ''
        });
      }
    } else if (type === 'draw') {
      multi.sendSignal('accept-draw');
      over = true;
	  if (window.timer) window.timer.stop();
      this.isReviewMode = true;
      document.getElementById('resultTitle').textContent = 'Draw';
      document.getElementById('resultSub').textContent = 'By agreement';
      document.getElementById('resultBanner').classList.add('show');
      window.audio.playSound('end');
      this.saveGameToHistory('Draw');
      multi.saveGameResult('Draw');
      this.clearSessionState();
	  if (multi.active) multi.detachListeners();
      this.renderAll();
    }
  },

  declineProposal() {
    if (!this.pendingProposal) return;
    const type = this.pendingProposal;
    this.pendingProposal = null;
    const popup = document.getElementById('proposalPopup');
    if (popup) popup.style.display = 'none';
    
    if (type === 'undo') {
      multi.sendSignal('decline-undo');
    } else if (type === 'reset') {
      multi.sendSignal('decline-reset');
    } else if (type === 'draw') {
      multi.sendSignal('decline-draw');
    }
  },

  saveSessionState() {
    if (!multi.active) return;
    const sess = {
      role: multi.isHost ? 'host' : 'joiner',
      roomCode: multi.isHost ? multi.peerId : multi.hostId,
      gameId: multi.gameId || null,
      peerId: multi.peerId || null,
      opponentId: multi.opponentId || null,
      isHost: !!multi.isHost,
      myColor: multi.myColor
    };
    sessionStorage.setItem('chessology_session', JSON.stringify(sess));
    
    const allPieces = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (board[r][c]) {
          allPieces.push({ r, c, type: board[r][c].type, color: board[r][c].color, types: board[r][c].types });
        }
      }
    }
    const gameState = {
      board: allPieces,
      turn: turn,
      castling: castling,
      enPassantSquare: enPassantSquare,
      halfMoveClock: halfMoveClock,
      fullMoveNumber: fullMoveNumber,
      whiteTime: window.timer ? window.timer.whiteTime : null,
      blackTime: window.timer ? window.timer.blackTime : null,
      variants: {
        diceChessEnabled: window.variants.diceChessEnabled,
        fogOfWarEnabled: window.variants.fogOfWarEnabled,
        draftEnabled: window.variants.draftEnabled,
        identityTheftEnabled: window.variants.identityTheftEnabled,
		handAndBrainEnabled: window.variants.handAndBrainEnabled
      }
    };
    sessionStorage.setItem('chessology_game_state', JSON.stringify(gameState));
  },

  clearSessionState() {
    sessionStorage.removeItem('chessology_session');
    sessionStorage.removeItem('chessology_game_state');
  },

  async checkAndRestoreSession() {
    const sessionStr = sessionStorage.getItem('chessology_session');
    const gameStateStr = sessionStorage.getItem('chessology_game_state');
    if (!sessionStr || !gameStateStr) return;

    try {
      const sess = JSON.parse(sessionStr);
      const state = JSON.parse(gameStateStr);
      const myPeerId = (multi.peerId || sess.peerId || (window.auth && window.auth.username ? window.auth.username.toLowerCase() : '')).toLowerCase();

      if (!myPeerId) {
        throw new Error('Unable to determine your player identity.');
      }
      
      const confirmRestore = confirm("Active multiplayer session detected. Reconnect and resume game?");
      if (!confirmRestore) {
        this.clearSessionState();
        return;
      }

      if (window.auth && typeof window.auth.ensureAnonymousAuth === 'function') {
        await window.auth.ensureAnonymousAuth();
      }

      let gameId = sess.gameId || null;
      let gameData = null;

      if (gameId) {
        const savedGameSnap = await rtdb.ref(`games/${gameId}`).once('value');
        if (savedGameSnap.exists()) {
          gameData = savedGameSnap.val();
        }
      }

		if (!gameData) {
		  throw new Error('The saved multiplayer game could not be located or has already finished.');
		}
		
		if (gameData.result) {
		  this.clearSessionState();
		  alert(`This game already ended: ${gameData.result}`);
		  return;
		}
		
		const isHost = gameData.host === myPeerId;
		
      const opponentId = isHost ? gameData.joiner : gameData.host;
      if (!opponentId) {
        throw new Error('The saved multiplayer game is missing opponent information.');
      }

      const restoredColor = isHost
        ? (gameData.hostColor || sess.myColor || 'w')
        : ((gameData.hostColor || sess.myColor || 'w') === 'w' ? 'b' : 'w');

      this.localReset();
	  this.activeGameId = 'game-' + Date.now();

      multi.myColor = restoredColor;
      multi.gameId = gameId;
      multi.isHost = isHost;
      multi.opponentId = opponentId;
      multi.active = true;
      multi.lastProcessedPgn = gameData.pgn || '';
      multi.lastProcessedMoveTime = gameData.lastMoveTime || null;
      multi.lastSignalTimestamp = 0;

      flipped = (restoredColor === 'b');
      this.gameState = 'playing';

      const appliedVariants = gameData.variants || state.variants || {};

      if (gameData.pgn && gameData.pgn.trim()) {
        importPgn(gameData.pgn);
      } else {
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            board[r][c] = null;
          }
        }

        if (Array.isArray(state.board)) {
          state.board.forEach(p => {
            board[p.r][p.c] = { type: p.type, color: p.color, types: p.types };
          });
        }

        turn = state.turn;
        castling = state.castling;
        enPassantSquare = state.enPassantSquare;
        halfMoveClock = state.halfMoveClock;
        fullMoveNumber = state.fullMoveNumber;
      }

      window.variants.diceChessEnabled = !!appliedVariants.diceChessEnabled;
      window.variants.fogOfWarEnabled = !!appliedVariants.fogOfWarEnabled;
      window.variants.draftEnabled = !!appliedVariants.draftEnabled;
      window.variants.identityTheftEnabled = !!appliedVariants.identityTheftEnabled;
      window.variants.identityTheftMode = appliedVariants.identityTheftMode || window.variants.identityTheftMode;
	  window.variants.handAndBrainEnabled = !!appliedVariants.handAndBrainEnabled;

if (window.variants.diceChessEnabled && gameData.currentDice) {
        window.variants.allowedDiceTypes = gameData.currentDice.split(',');
      }
		
      if (window.variants.draftEnabled) {
        window.variants.draftLocked = {
          w: !!gameData.draftLocked_w,
          b: !!gameData.draftLocked_b
        };

        const draftPoints = { w: window.variants.DRAFT_BUDGET, b: window.variants.DRAFT_BUDGET };
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece && piece.color) {
              draftPoints[piece.color] -= window.variants.getPieceCost(piece.type);
            }
          }
        }
        window.variants.draftPointsLeft = {
          w: Math.max(0, draftPoints.w),
          b: Math.max(0, draftPoints.b)
        };
      }

      if (window.timer) {
        const whiteTimeMs = typeof gameData.time_w === 'number' ? gameData.time_w : (typeof state.whiteTime === 'number' ? state.whiteTime : 0);
        const blackTimeMs = typeof gameData.time_b === 'number' ? gameData.time_b : (typeof state.blackTime === 'number' ? state.blackTime : 0);
        const clockConfig = gameData.clockConfig || state.clockConfig || null;
        window.timer.init(whiteTimeMs / 1000, blackTimeMs / 1000, clockConfig?.wInc || 0, clockConfig?.bInc || 0);
        if (window.timer.enabled && !window.variants.draftEnabled) {
          window.timer.start(gameData.activeSide || turn);
        }
      }

      window.ui.showStep('stepGame');
      multi.setupGameListeners();
      this.renderAll();
      this.saveSessionState();
    } catch (e) {
      console.error("Failed to restore session:", e);
      this.clearSessionState();
      alert(`Could not restore the saved multiplayer game. ${e && e.message ? e.message : e}`);
    }
  },

  startGameWithSettings(variants, myColor, clockConfig) {
    multi.myColor = myColor;
    window.variants.diceChessEnabled = variants.diceChessEnabled;
    window.variants.fogOfWarEnabled = variants.fogOfWarEnabled;
    window.variants.draftEnabled = variants.draftEnabled;
    window.variants.identityTheftEnabled = variants.identityTheftEnabled;
    window.variants.identityTheftMode = variants.identityTheftMode;
	window.variants.handAndBrainEnabled = variants.handAndBrainEnabled;

    if (clockConfig) {
      window.timer.init(clockConfig.wTime, clockConfig.bTime, clockConfig.wInc, clockConfig.bInc);
      if (window.timer.enabled && !variants.draftEnabled) {
        window.timer.start('w');
      }
    } else {
      window.timer.init(0, 0, 0, 0);
    }

    this.localReset();
	this.activeGameId = 'game-' + Date.now();
    this.gameState = 'playing';
    flipped = (myColor === 'b'); // Set initial online perspective based on color
    window.variants.init();

    if (window.variants.diceChessEnabled && !window.variants.draftEnabled) {
      window.variants.rollDice('w');
    }
    this.saveSessionState();
    this.renderAll();
  },

  handleMultiplayerMessage(data) {
    // A 200-line if/else chain for message parsing is a crime against humanity.
    // This dispatch table prevents our multiplayer handler from devolving into spaghetti.
    const handlers = {
      'challenge':           (d) => this.onReceiveChallenge(d),
      'accept-challenge':    (d) => this.onChallengeAccepted(d),
      'decline-challenge':   ()  => this.onChallengeDeclined(),
      'move':                (d) => this.onRemoteMove(d),
      'dice-roll':           (d) => this.onDiceRoll(d),
      'draft-lock':          (d) => this.onDraftLock(d),
      'draft-complete-sync': (d) => this.onDraftCompleteSync(d),
      'trim-powers':         (d) => this.onTrimPowers(d),
      'propose-undo':        ()  => this.showProposal('undo'),
      'accept-undo':         ()  => this.onUndoAccepted(),
      'decline-undo':        ()  => this.onUndoDeclined(),
      'propose-reset':       ()  => this.showProposal('reset'),
      'accept-reset':        ()  => this.onResetAccepted(),
      'decline-reset':       ()  => this.onResetDeclined(),
      'propose-draw':        ()  => this.showProposal('draw'),
      'accept-draw':         ()  => this.onDrawAccepted(),
      'decline-draw':        ()  => this.onDrawDeclined(),
      'start-game':          (d) => this.onStartGame(d),
      'resign':              ()  => this.onOpponentResign(),
      'abort':               ()  => this.onGameAborted(),
      'timeout':             (d) => this.handleTimeOut(d.color, true),
      'request-clock-sync':  (d) => this.onClockSyncRequest(d),
      'clock-sync-response': (d) => this.onClockSyncResponse(d),
      'state-sync':          (d) => this.onStateSync(d),
    };
    const handler = handlers[data.type];
    if (handler) handler(data);
  },

  onReceiveChallenge(data) {
    const myColor = data.colorReq === 'random'
      ? (Math.random() < 0.5 ? 'w' : 'b')
      : (data.colorReq === 'w' ? 'b' : 'w');

    this.pendingChallenge = {
      challengeId: data.challengeId,
      sender: data.sender,
      variants: data.variants,
      myColor,
      clockConfig: data.clockConfig
    };

    const list = document.getElementById('challengeVariantsList');
    const v = data.variants;
    list.replaceChildren();

    const variantLines = [];
    if (v.diceChessEnabled) variantLines.push('Dice Chess');
    if (v.fogOfWarEnabled) variantLines.push('Fog of War');
    if (v.draftEnabled) variantLines.push('Draft Mode');
    if (v.identityTheftEnabled) variantLines.push(`Identity Theft (${v.identityTheftMode})`);
	if (v.handAndBrainEnabled) variantLines.push('Hand and Brain');

    if (variantLines.length === 0) {
      const standardLine = document.createElement('div');
      standardLine.style.color = 'var(--dim)';
      standardLine.textContent = 'Standard Chess';
      list.appendChild(standardLine);
    } else {
      variantLines.forEach(label => {
        const line = document.createElement('div');
        line.textContent = `• ${label}`;
        list.appendChild(line);
      });
    }

    if (data.colorReq !== 'random') {
      const colorLine = document.createElement('div');
      colorLine.style.marginTop = '4px';
      colorLine.style.color = 'var(--text)';

      const label = document.createElement('strong');
      label.style.color = '#fff';
      label.textContent = myColor === 'w' ? 'White' : 'Black';

      colorLine.append('You will play as: ');
      colorLine.appendChild(label);
      list.appendChild(colorLine);
    }
    document.getElementById('challengePopup').style.display = 'block';

    if (this.challengePopupTimeout) clearTimeout(this.challengePopupTimeout);
    const remainingTime = Math.max(0, 30000 - (Date.now() - (data.createdAtTime || Date.now())));
    this.challengePopupTimeout = setTimeout(() => {
      console.log("Challenge expired locally.");
      this.declineChallenge();
    }, remainingTime);
  },

  onChallengeAccepted(data) {
    const sendBtn = document.getElementById('sendChallengeBtn');
    sendBtn.disabled = false;
    sendBtn.textContent = 'Send Challenge';
    // Use the challenge data instead of local UI state
    this.startGameWithSettings(data.variants, data.yourColor, data.clockConfig); 
  },

  onChallengeDeclined() {
    alert('Opponent declined your challenge.');
    const sendBtn = document.getElementById('sendChallengeBtn');
    sendBtn.disabled = false;
    sendBtn.textContent = 'Send Challenge';

    const rematchBtn = document.getElementById('rematchBtnStatus');
    const bannerBtn = document.getElementById('rematchBtn');
    [rematchBtn, bannerBtn].forEach(btn => {
      if (btn) {
        btn.disabled = false;
        if (btn.textContent.includes('Request Sent')) btn.textContent = 'Rematch';
      }
    });
  },

  onRemoteMove(pgn) {
    if (!pgn) return;

    const wasDrafting = window.variants.isDraftActive;

    importPgn(pgn);

    // Play move sound
    if (window.audio) {
      window.audio.playSound('move');
    }

    if (wasDrafting && !window.variants.isDraftActive) {
      if (window.timer && window.timer.enabled) {
        window.timer.start('w');
      }
    }

if (window.variants.diceChessEnabled && !window.variants.isDraftActive) {
  window.variants.rollDice(turn);
}
if (window.variants.handAndBrainEnabled && !window.variants.isDraftActive) {
  window.variants.requestBrainMove(turn);   // add
}

	  
	
    this.renderAll();
  },
  
onDiceRoll(data) {
    if (window.variants) {
      // Only apply incoming dice signals if we are the player waiting
      if (turn !== window.multi.myColor) {
        window.variants.allowedDiceTypes = data.allowedDiceTypes || [];
        this.renderAll();
      }
    }
  },

  onClockSyncRequest(data) {
    if (!multi.active || !multi.isHost || !window.timer) return;
    multi.sendSignal('clock-sync-response', {
      requestTimestamp: data.requestTimestamp,
      whiteTime: window.timer.whiteTime,
      blackTime: window.timer.blackTime,
      activeSide: window.timer.activeSide
    });
  },

  onClockSyncResponse(data) {
    if (!multi.active || multi.isHost || !window.timer) return;
    const latency = Math.max(0, (Date.now() - data.requestTimestamp) / 2);
  },

  applyDraftFen(color, fen) {
    const tempBoard = Array.from({ length: 8 }, () => Array(8).fill(null));
    fen.split(' ')[0].split('/').forEach((row, r) => {
      let c = 0;
      for (const ch of row) {
        if (/\d/.test(ch)) {
          c += +ch;
        } else {
          const type = ch.toUpperCase();
          tempBoard[r][c++] = {
            color: ch === type ? 'w' : 'b',
            type: type,
            types: [type]
          };
        }
      }
    });

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (tempBoard[r][c] && tempBoard[r][c].color === color) {
          board[r][c] = tempBoard[r][c];
        }
      }
    }
  },

  onTrimPowers(data) {
    const p = board[data.r][data.c];
    if (p) {
      p.types = data.types;
      p.type = data.types[0];
    }
    window.pendingPowerSelection = null;
    if (window.timer && window.timer.enabled) window.timer.start(turn);
    this.renderAll();
  },

  onUndoAccepted() {
    this.localUndo();
    const undoBtn = document.getElementById('undoBtn');
    if (undoBtn) {
      undoBtn.disabled = false;
      undoBtn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px; margin-right:4px;"><path d="M3 7v6h6"></path><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path></svg>Undo`;
    }
  },

  onUndoDeclined() {
    alert('Opponent declined your undo request.');
    const undoBtn = document.getElementById('undoBtn');
    if (undoBtn) {
      undoBtn.disabled = false;
      undoBtn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px; margin-right:4px;"><path d="M3 7v6h6"></path><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path></svg>Undo`;
    }
  },

  onResetAccepted() {
    this.localReset();
    this.onLobbyConnected(multi.isHost ? 'Host' : 'Joiner');
  },

  onResetDeclined() {
    alert('Opponent declined the rematch request.');
    document.querySelectorAll('.result-box button').forEach(btn => {
      if (btn.textContent.includes('Request Sent')) {
        btn.disabled = false;
        btn.textContent = 'Rematch';
      }
    });
  },

  onStartGame(data) {
    this.localReset();
    this.gameState = 'playing';
    if (data.variants) {
      window.variants.diceChessEnabled      = data.variants.diceChessEnabled;
      window.variants.fogOfWarEnabled       = data.variants.fogOfWarEnabled;
      window.variants.draftEnabled          = data.variants.draftEnabled;
      window.variants.identityTheftEnabled  = data.variants.identityTheftEnabled;
      window.variants.identityTheftMode     = data.variants.identityTheftMode;
      window.variants.handAndBrainEnabled = data.variants.handAndBrainEnabled;
		
      // Reflect settings in the Joiner's lobby UI
      const diceToggle = document.getElementById('diceChessToggle');    if (diceToggle) diceToggle.checked = data.variants.diceChessEnabled;
      const fogToggle = document.getElementById('fogOfWarToggle');     if (fogToggle) fogToggle.checked = data.variants.fogOfWarEnabled;
      const draftToggle = document.getElementById('draftModeToggle');    if (draftToggle) draftToggle.checked = data.variants.draftEnabled;
      const identityToggle = document.getElementById('identityTheftToggle'); if (identityToggle) identityToggle.checked = data.variants.identityTheftEnabled;
      const identityModeSelect = document.getElementById('identityTheftMode');  if (identityModeSelect) identityModeSelect.value = data.variants.identityTheftMode;
	  const handBrainToggle = document.getElementById('handAndBrainToggle'); if (handBrainToggle) handBrainToggle.checked = data.variants.handAndBrainEnabled;

	if (window.variants.diceChessEnabled && !window.variants.draftEnabled) {
  window.variants.rollDice('w');
}
if (window.variants.handAndBrainEnabled && !window.variants.draftEnabled) {
  window.variants.requestBrainMove('w'); 
}
	
	}
    window.variants.init();
    this.renderAll();
  },

	onRemoteGameEnded(resultText) {
	  if (over) return;
	  over = true;
	  if (window.timer) window.timer.stop();
	  document.getElementById('resultTitle').textContent = resultText;
	  document.getElementById('resultSub').textContent = '';
	  document.getElementById('resultBanner').classList.add('show');
	  this.saveGameToHistory(resultText);
	  this.clearSessionState();
	  if (multi.active) multi.detachListeners();
	  this.renderAll();
	},

	
  onOpponentResign() {
	if (over) return;
    over = true;
	if (window.timer) window.timer.stop();
    let oppName = (multi.myColor === 'b' ? 'White' : 'Black');
    if (multi.opponentId) {
      oppName = multi.opponentId.charAt(0).toUpperCase() + multi.opponentId.slice(1);
    }
    document.getElementById('resultTitle').textContent = 'You win!';
    document.getElementById('resultSub').textContent = oppName + ' Resigned';
    if (multi.active) {
      multi.saveGameResult(oppName + ' Resigned');
    }
    this.saveGameToHistory(oppName + ' Resigned');
    document.getElementById('resultBanner').classList.add('show');
    window.audio.playSound('end');
	if (multi.active) multi.detachListeners();
    this.renderAll();
  },

  onGameAborted() {
	if (over) return;
    over = true;
	if (window.timer) window.timer.stop();
    document.getElementById('resultTitle').textContent = 'Game Aborted';
    document.getElementById('resultSub').textContent = 'Opponent aborted the game.';
    if (multi.active) {
      multi.saveGameResult('Aborted');
    }
    document.getElementById('resultBanner').classList.add('show');
    window.audio.playSound('end');
	if (multi.active) multi.detachListeners();
    this.renderAll();
  },



  localUndo() {
  if (!boardHistory.length) return;
  restoreState(boardHistory.pop());
  moveHistory.pop();
  clearHints();
  over = false;
  viewIndex = moveHistory.length;
  liveState = null;
  this.hideResultBanner();

  // `turn` now holds the side whose move we just undid — refund the
  // increment they were credited for that move, and make sure their
  // clock (not the opponent's) is the one ticking again.
  if (window.timer && window.timer.enabled) {
    const moverColor = turn;
    const inc = moverColor === 'w' ? window.timer.whiteInc : window.timer.blackInc;
    if (moverColor === 'w') {
      window.timer.whiteTime = Math.max(0, window.timer.whiteTime - inc);
    } else {
      window.timer.blackTime = Math.max(0, window.timer.blackTime - inc);
    }
    window.timer.activeSide = moverColor;
    window.timer.lastTick = Date.now();
    if (!window.timer.active) window.timer.start(moverColor);
  }

  this.renderAll();
},

  localReset() {
    initBoard(INIT_FEN);
    turn = 'w';
    castling = { wK: true, wQ: true, bK: true, bQ: true };
    enPassantSquare = null;
    halfMoveClock = 0;
    fullMoveNumber = 1;
    selectedSquare = null;
    legal = [];
    moveHistory = [];
    boardHistory = [];
    lastMove = null;
    over = false;
    dragStartSquare = null;
    draggedElement = null;
    isDragging = false;
    viewIndex = 0;
    liveState = null;
    this.gameState = 'setup';
    this.branches = null;
    this.currentBranchId = 'main';
    window.variants.draftLocked = { w: false, b: false };
    window.variants.draftPointsLeft = { w: window.variants.DRAFT_BUDGET, b: window.variants.DRAFT_BUDGET };
    window.variants.draftActivePieceType = null;
    this.activeGameId = null;
    this.isReviewMode = false;
    this.clearSessionState();
    this.hideResultBanner();

	// Put the clock back to the original time control instead of leaving
	// whatever time happened to be left when the reset was agreed to.
	if (window.timer && multi.active && multi.lastClockConfig) {
	  const cc = multi.lastClockConfig;
	  window.timer.init(cc.wTime, cc.bTime, cc.wInc, cc.bInc);
	}

    this.renderAll();
  },

  startGame() {
    this.activeGameId = 'game-' + Date.now();
    const getT = (offId) => document.getElementById(offId)?.checked || false;
    const getS = (offId) => document.getElementById(offId)?.value || 'steal';
    
    window.variants.diceChessEnabled = getT('diceChessToggleOffline');
    window.variants.draftEnabled = getT('draftModeToggleOffline');
    window.variants.identityTheftEnabled = getT('identityTheftToggleOffline');
    window.variants.identityTheftMode = getS('identityTheftModeOffline');
    window.variants.fogOfWarEnabled = false; // Never online here
	window.variants.handAndBrainEnabled = getT('handAndBrainToggleOffline');

    const clockConfig = this.readClockConfig('Offline');
    window.timer.init(clockConfig.wTime, clockConfig.bTime, clockConfig.wInc, clockConfig.bInc);

    this.gameState = 'playing';
    window.variants.init();
    clearHints();
    
    if (window.timer.enabled && !window.variants.draftEnabled) {
      window.timer.start('w');
    }
    
    if (window.variants.diceChessEnabled && !window.variants.draftEnabled) {
      window.variants.rollDice('w');
    }

    if (window.variants.handAndBrainEnabled && !window.variants.draftEnabled) {
       window.variants.requestBrainMove('w');
    }

    this.renderAll();
  },

  saveGameToHistory(overResult = null) {
    if (!this.activeGameId) return;
    if (this.gameState !== 'playing') return;
    
    // Save only if at least 2 moves are played by both players (4 half-moves)
    if (moveHistory.length < 4) return;
    
    const pgn = exportPgn();
    
    // Determine variant string
    const activeVariants = [];
    if (window.variants.diceChessEnabled) activeVariants.push('Dice Chess');
    if (window.variants.fogOfWarEnabled) activeVariants.push('Fog of War');
    if (window.variants.draftEnabled) activeVariants.push('Draft Mode');
    if (window.variants.identityTheftEnabled) activeVariants.push('Identity Theft');
    if (window.variants.handAndBrainEnabled) activeVariants.push('Hand and Brain');
	  
    const variantStr = activeVariants.length > 0 ? activeVariants.join(', ') : 'Standard';
    
    const resultStr = overResult || (over ? 'Game Over' : '*');
    
    const getCapitalized = (name) => {
      if (!name) return 'Unknown';
      return name.charAt(0).toUpperCase() + name.slice(1);
    };
    const whitePlayer = multi.active 
      ? (multi.myColor === 'w' ? getCapitalized(multi.peerId) : getCapitalized(multi.opponentId))
      : 'White';
    const blackPlayer = multi.active
      ? (multi.myColor === 'b' ? getCapitalized(multi.peerId) : getCapitalized(multi.opponentId))
      : 'Black';

    const gameRecord = {
      id: this.activeGameId,
      date: Date.now(),
      pgn: pgn,
      white: whitePlayer,
      black: blackPlayer,
      result: resultStr,
      variant: variantStr,
      variants: {
        diceChessEnabled: !!window.variants.diceChessEnabled,
        fogOfWarEnabled: !!window.variants.fogOfWarEnabled,
        draftEnabled: !!window.variants.draftEnabled,
        identityTheftEnabled: !!window.variants.identityTheftEnabled,
		handAndBrainEnabled: !!window.variants.handAndBrainEnabled 
      },
      isMultiplayer: !!multi.active
    };
    
    window.historyStorage.saveGame(gameRecord).catch(err => {
      console.error('Failed to save game to history:', err);
    });
  },

  async loadGameHistory() {
    const listEl = document.getElementById('gameHistoryList');
    if (!listEl) return;
    listEl.replaceChildren();

    const loading = document.createElement('div');
    loading.style.color = 'var(--dim)';
    loading.style.textAlign = 'center';
    loading.style.fontSize = '0.8rem';
    loading.style.padding = '20px';
    loading.textContent = 'Loading game history...';
    listEl.appendChild(loading);

    try {
      const games = await window.historyStorage.getGames();
      listEl.replaceChildren();

      if (games.length === 0) {
        const emptyEl = document.createElement('div');
        emptyEl.style.color = 'var(--dim)';
        emptyEl.style.fontSize = '0.8rem';
        emptyEl.style.textAlign = 'center';
        emptyEl.style.padding = '20px';
        emptyEl.textContent = 'No games played yet.';
        listEl.appendChild(emptyEl);
        return;
      }

      games.forEach(g => {
        const timeStr = new Date(g.date).toLocaleDateString() + ' ' + new Date(g.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const resultText = g.result || 'Ongoing / Incomplete';

        const isMulti = g.isMultiplayer !== undefined ? g.isMultiplayer : (g.white !== 'White' || g.black !== 'Black');
        const myName = (window.multi && window.multi.peerId) ? window.multi.peerId.toLowerCase() : '';
        
        let circleColor = '#9e9e9e'; // Default grey for draw, unfinished, or offline
        let opponentLabel = 'Offline';

        if (isMulti) {
          const oppName = (g.white.toLowerCase() === myName) ? g.black : g.white;
          opponentLabel = `vs ${oppName}`;
          
          if (myName) {
            const isDraw = resultText.includes('Draw') || resultText.includes('Aborted');
            const isUnfinished = resultText === '*' || resultText.includes('Ongoing') || resultText.includes('Review');
            
            if (!isDraw && !isUnfinished) {
              if (resultText.includes('won') || resultText.includes('Wins')) {
                const iWon = (g.white.toLowerCase() === myName && resultText.includes('White')) || 
                             (g.black.toLowerCase() === myName && resultText.includes('Black'));
                circleColor = iWon ? '#4ade80' : '#f87171';
              } else if (resultText.includes('Resigned')) {
                const iResigned = resultText.toLowerCase().includes(myName);
                circleColor = iResigned ? '#f87171' : '#4ade80';
              }
            }
          }
        }

        const item = document.createElement('div');
        item.style.cssText = 'background:var(--panel2); border:1px solid var(--border); border-radius:6px; padding:10px; display:flex; flex-direction:column; gap:6px;';

        const headerRow = document.createElement('div');
        headerRow.style.display = 'flex';
        headerRow.style.justifyContent = 'space-between';
        headerRow.style.alignItems = 'center';

        const opponentContainer = document.createElement('div');
        opponentContainer.style.display = 'flex';
        opponentContainer.style.alignItems = 'center';
        opponentContainer.style.gap = '6px';

        const circle = document.createElement('span');
        circle.style.cssText = `display:inline-block; width:8px; height:8px; border-radius:50%; background:${circleColor}; flex-shrink:0;`;

        const title = document.createElement('span');
        title.style.fontWeight = 'bold';
        title.style.color = 'var(--text)';
        title.style.fontSize = '0.85rem';
        title.textContent = opponentLabel;

        opponentContainer.appendChild(circle);
        opponentContainer.appendChild(title);

        const time = document.createElement('span');
        time.style.fontSize = '0.75rem';
        time.style.color = 'var(--dim)';
        time.textContent = timeStr;

        headerRow.appendChild(opponentContainer);
        headerRow.appendChild(time);

        const resultLine = document.createElement('div');
        resultLine.style.fontSize = '0.78rem';
        resultLine.style.color = circleColor;
        resultLine.style.fontWeight = '600';
        resultLine.textContent = resultText;

        const footerRow = document.createElement('div');
        footerRow.style.display = 'flex';
        footerRow.style.justifyContent = 'space-between';
        footerRow.style.alignItems = 'center';
        footerRow.style.marginTop = '2px';

        const variantsTag = document.createElement('span');
        variantsTag.style.fontSize = '0.7rem';
        variantsTag.style.color = 'var(--gold)';
        variantsTag.style.border = '1px solid var(--gold)';
        variantsTag.style.borderRadius = '4px';
        variantsTag.style.padding = '1px 4px';
        variantsTag.textContent = g.variant || 'Standard';

        const buttonGroup = document.createElement('div');
        buttonGroup.style.display = 'flex';
        buttonGroup.style.gap = '6px';

        const reviewBtn = document.createElement('button');
        reviewBtn.className = 'btn';
        reviewBtn.style.padding = '4px 8px';
        reviewBtn.style.fontSize = '0.7rem';
        reviewBtn.style.minWidth = 'unset';
        reviewBtn.style.background = 'var(--gold)';
        reviewBtn.style.color = '#000';
        reviewBtn.textContent = 'Review';
        reviewBtn.addEventListener('click', () => this.reviewPastGame(g));

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn';
        deleteBtn.style.padding = '4px 8px';
        deleteBtn.style.fontSize = '0.7rem';
        deleteBtn.style.minWidth = 'unset';
        deleteBtn.style.color = '#ff4444';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (confirm('Delete this game from history?')) {
            await window.historyStorage.deleteGame(g.id);
            this.loadGameHistory();
          }
        });

        buttonGroup.appendChild(reviewBtn);
        buttonGroup.appendChild(deleteBtn);

        footerRow.appendChild(variantsTag);
        footerRow.appendChild(buttonGroup);

        item.appendChild(headerRow);
        item.appendChild(resultLine);
        item.appendChild(footerRow);
        listEl.appendChild(item);
      });
    } catch (err) {
      listEl.replaceChildren();
      const errorMsg = document.createElement('div');
      errorMsg.style.color = 'var(--danger-hover)';
      errorMsg.style.textAlign = 'center';
      errorMsg.style.fontSize = '0.8rem';
      errorMsg.style.padding = '20px';
      errorMsg.textContent = `Failed to load: ${err.message}`;
      listEl.appendChild(errorMsg);
    }
  },

  reviewPastGame(g) {
    if (!g.pgn) {
      alert("This game has no PGN moves recorded.");
      return;
    }

    this.localReset();
    
    if (g.variants) {
      window.variants.diceChessEnabled = g.variants.diceChessEnabled || false;
      window.variants.fogOfWarEnabled = g.variants.fogOfWarEnabled || false;
      window.variants.draftEnabled = g.variants.draftEnabled || false;
      window.variants.identityTheftEnabled = g.variants.identityTheftEnabled || false;
	  window.variants.handAndBrainEnabled = g.variants.handAndBrainEnabled || false;
		
    } else if (g.variant) {
      window.variants.diceChessEnabled = g.variant.includes('Dice');
      window.variants.fogOfWarEnabled = g.variant.includes('Fog');
      window.variants.draftEnabled = g.variant.includes('Draft');
      window.variants.identityTheftEnabled = g.variant.includes('Identity');
	  window.variants.handAndBrainEnabled = g.variant.includes('Hand and Brain');
    }
    
    window.variants.init();
    importPgn(g.pgn);
    
    this.gameState = 'playing';
    over = true;
    this.isReviewMode = true;
    viewIndex = moveHistory.length;
    liveState = null;
    
    // Set result banner texts
    const rTitleEl = document.getElementById('resultTitle');
    const rSubEl = document.getElementById('resultSub');
    if (rTitleEl) rTitleEl.textContent = g.result || 'Game Over';
    if (rSubEl) rSubEl.textContent = g.variant || 'Review Mode';
    
    window.ui.showStep('stepGame');
    this.renderAll();
  },

  rematch() {
    if (multi.active) {
      const targetUser = multi.opponentId;
      if (!targetUser) return;

      const variants = multi.lastMatchVariants || {
        diceChessEnabled: window.variants.diceChessEnabled,
        fogOfWarEnabled: window.variants.fogOfWarEnabled,
        draftEnabled: window.variants.draftEnabled,
        identityTheftEnabled: window.variants.identityTheftEnabled,
        identityTheftMode: window.variants.identityTheftMode,
		handAndBrainEnabled: window.variants.handAndBrainEnabled
      };
      const clockConfig = multi.lastClockConfig || {
        wTime: window.timer ? Math.round(window.timer.whiteTime / 1000) : 0,
        bTime: window.timer ? Math.round(window.timer.blackTime / 1000) : 0,
        wInc: window.timer ? Math.round(window.timer.whiteInc / 1000) : 0,
        bInc: window.timer ? Math.round(window.timer.blackInc / 1000) : 0
      };
      const oppositeColor = multi.myColor === 'w' ? 'b' : 'w';

      const rematchBtn = document.getElementById('rematchBtnStatus');
      const bannerBtn = document.getElementById('rematchBtn');
      [rematchBtn, bannerBtn].forEach(btn => {
        if (btn) {
          btn.disabled = true;
          if (btn.textContent.includes('Rematch')) btn.textContent = 'Request Sent...';
        }
      });

      multi.sendChallenge(targetUser, variants, oppositeColor, clockConfig);
    } else {
      // Offline can restart immediately
      newGame();
      this.localReset();
      this.gameState = 'playing';
      window.variants.init();
      if (window.variants.diceChessEnabled && !window.variants.draftEnabled) window.variants.rollDice('w');
	  if (window.variants.handAndBrainEnabled && !window.variants.draftEnabled) window.variants.requestBrainMove('w');
      this.renderAll();
    }
  },

  resignGame() {
    if (this.gameState !== 'playing' || over) return;
    const isAbort = moveHistory.length < 2;
    if (!confirm(isAbort ? 'Abort the game?' : 'Are you sure you want to resign?')) return;

    over = true;
	if (window.timer) window.timer.stop();
    if (isAbort) {
      document.getElementById('resultTitle').textContent = 'Game Aborted';
      document.getElementById('resultSub').textContent = 'No result recorded.';
      if (multi.active) {
        multi.sendSignal('abort');
        multi.saveGameResult('Aborted');
      }
    } else {
      const isWhite = multi.active ? (multi.myColor === 'w') : (turn === 'w');
      let myName = (isWhite ? 'White' : 'Black');
      if (multi.active && multi.peerId) {
        myName = multi.peerId.charAt(0).toUpperCase() + multi.peerId.slice(1);
      }
      document.getElementById('resultTitle').textContent = 'Opponent wins!';
      document.getElementById('resultSub').textContent = myName + ' Resigned';
      if (multi.active) {
        multi.sendSignal('resign');
        multi.saveGameResult(myName + ' Resigned');
      }
      this.saveGameToHistory(myName + ' Resigned');
      this.isReviewMode = true;
    }
    document.getElementById('resultBanner').classList.add('show');
    window.audio.playSound('end');
	if (multi.active) multi.detachListeners();
    this.renderAll();
  },

  offerDraw() {
    if (this.gameState !== 'playing' || over) return;
    if (multi.active) {
      if (confirm('Offer a draw to opponent?')) {
        multi.sendSignal('propose-draw');
      }
    } else {
      if (confirm('Agree to a draw?')) {
        over = true;
		if (window.timer) window.timer.stop();
        this.isReviewMode = true;
        document.getElementById('resultTitle').textContent = 'Draw';
        document.getElementById('resultSub').textContent = 'By agreement';
        document.getElementById('resultBanner').classList.add('show');
        window.audio.playSound('end');
        this.saveGameToHistory('Draw');
        this.clearSessionState();
        this.renderAll();
      }
    }
  },

  onDrawAccepted() {
    over = true;
	if (window.timer) window.timer.stop();
    this.isReviewMode = true;
    document.getElementById('resultTitle').textContent = 'Draw';
    document.getElementById('resultSub').textContent = 'By agreement';
    document.getElementById('resultBanner').classList.add('show');
    window.audio.playSound('end');
    this.saveGameToHistory('Draw');
    this.clearSessionState();
	if (multi.active) multi.detachListeners();
    this.renderAll();
  },

  onDrawDeclined() {
    alert('Opponent declined the draw offer.');
  },

  goToMenu() {
    this.localReset();
    this.clearSessionState();
    if (multi.active) {
      multi.cleanupGame();
    }
    window.ui.showStep('stepMode');
  },

  handleTimeOut(color, isRemote = false) {
    if (over) return;
    over = true;
    let winnerName = color === 'w' ? 'Black' : 'White';
    if (multi.active) {
      const winnerColor = color === 'w' ? 'b' : 'w';
      const winnerUser = (winnerColor === 'w') ? multi.peerId : multi.opponentId;
      if (winnerUser) {
        winnerName = winnerUser.charAt(0).toUpperCase() + winnerUser.slice(1);
      }
    }
    document.getElementById('resultTitle').textContent = `${winnerName} Wins!`;
    document.getElementById('resultSub').textContent = 'Won on time';
    if (multi.active) {
       multi.saveGameResult(`${winnerName} won on time`);
    }
    this.saveGameToHistory(`${winnerName} won on time`);
    document.getElementById('resultBanner').classList.add('show');
    window.audio.playSound('end');
    
    if (window.timer) window.timer.stop();
    
    if (multi.active && !isRemote) {
      multi.sendSignal('timeout', { color: color });
    }
	if (multi.active) multi.detachListeners();
    this.renderAll();
  },

  startGameNormal() {
    const isDraft = document.getElementById('draftModeToggleOffline')?.checked || false;
    if (!isDraft) {
      importFen(INIT_FEN, true);
    }
    this.startGame();
  },

  startGameFromCurrent() {
    const currentFen = boardToFen(board, turn, castling, enPassantSquare);
    importFen(currentFen, true);
    this.branches = null;
    this.currentBranchId = 'main';
    this.startGame();
  }
};

// â”€â”€â”€ IMPORT / EXPORT TRIGGERS (called from index.html) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function triggerImport() {
  if (multi.active) {
    alert("Importing FEN/PGN is disabled during active multiplayer sessions.");
    return;
  }
  const val = document.getElementById('fenPgnInput').value.trim();
  if (!val) { alert("Please paste a FEN or PGN first!"); return; }
  
  window.app.branches = null;
  window.app.currentBranchId = 'main';
  
  if (isValidFen(val)) {
    importFen(val);
    window.app.gameState = 'setup';
    over = false;
  } else {
	window.app.gameState = 'playing';
    importPgn(val);
    over = true;
    window.app.isReviewMode = true;

    // Parse PGN Result header
    const resultMatch = val.match(/\[Result\s+"(.*?)"]/i);
    let resultTitle = 'Game Over';
    let resultSub = 'Imported Game';
    if (resultMatch) {
      const res = resultMatch[1].trim();
      if (res === '1-0') {
        resultTitle = 'White Wins';
        resultSub = '1-0';
      } else if (res === '0-1') {
        resultTitle = 'Black Wins';
        resultSub = '0-1';
      } else if (res === '1/2-1/2') {
        resultTitle = 'Draw';
        resultSub = '1/2-1/2';
      } else if (res === '*') {
        resultTitle = 'Review Mode';
        resultSub = 'Game in progress / unfinished';
      } else {
        resultTitle = 'Game Over';
        resultSub = res;
      }
    }
    const rTitleEl = document.getElementById('resultTitle');
    const rSubEl = document.getElementById('resultSub');
    if (rTitleEl) rTitleEl.textContent = resultTitle;
    if (rSubEl) rSubEl.textContent = resultSub;
  }
  
  viewIndex = moveHistory.length;
  liveState = null;
  
  window.app.renderAll();
}

function triggerExportFen() {
  const isIdentityTheft = window.variants && window.variants.isIdentityTheftActive;
  if (isIdentityTheft) {
    alert("FEN export is disabled in Identity Theft variant because of custom pieces.");
    return;
  }
  const fen = exportCurrentFen();
  document.getElementById('fenPgnInput').value = fen;
  navigator.clipboard.writeText(fen)
    .then(() => alert("FEN copied to clipboard!"))
    .catch((err) => {
      console.error("Clipboard FEN copy failed:", err);
      alert("Copying to clipboard blocked by browser. Please select and copy the FEN manually from the text box.");
    });
}

function triggerExportPgn() {
  const pgn = exportPgn();
  document.getElementById('fenPgnInput').value = pgn;
  navigator.clipboard.writeText(pgn)
    .then(() => alert("PGN copied to clipboard!"))
    .catch((err) => {
      console.error("Clipboard PGN copy failed:", err);
      alert("Copying to clipboard blocked by browser. Please select and copy the PGN manually from the text box.");
    });
}


function clearHints() {
  selectedSquare = null; legal = [];
}

function jumpTo(idx) {
  if (idx < 0 || idx > moveHistory.length) return;
  if (viewIndex === moveHistory.length) {
    liveState = cloneState();
  }
  viewIndex = idx;
  if (viewIndex === moveHistory.length) {
    if (liveState) {
      restoreState(liveState);
      liveState = null;
    }
  } else {
    restoreState(boardHistory[viewIndex]);
  }
  window.app.renderAll();
}

function undoMove() {
  if (multi.active) {
    multi.sendSignal('propose-undo');
    const undoBtn = document.getElementById('undoBtn');
    if (undoBtn) {
      undoBtn.disabled = true;
      undoBtn.textContent = "Waiting...";
    }
  } else {
    window.app.localUndo();
  }
}

function newGame() {
  if (multi.active) {
    multi.sendSignal('propose-reset');
    const buttons = document.querySelectorAll('.result-box button');
    buttons.forEach(btn => {
      if (btn.textContent.includes('Rematch')) {
        btn.disabled = true;
        btn.textContent = "Request Sent...";
      }
    });
  } else {
    window.app.localReset();
  }
}

let promotionCallback = null;
function showPromo(color, cb) {
  promotionCallback = cb;
  const row = document.getElementById('promoRow'); row.innerHTML = '';
  ['Q', 'R', 'B', 'N'].forEach(t => {
    const btn = document.createElement('button'); btn.className = 'pbtn';
    btn.innerHTML = SVG[color + t];
    btn.onclick = () => {
      document.getElementById('promoOv').classList.remove('show');
      promotionCallback(t);
    };
    row.appendChild(btn);
  });
  document.getElementById('promoOv').classList.add('show');
}

// Unified Pointer detection coordinates helper
let dragStartSquare = null, draggedElement = null, isDragging = false, dragStartX = 0, dragStartY = 0;
let pointerId = null;

const boardEl = document.getElementById('boardEl');

function sqFromXY(x, y) {
  const rect = boardEl.getBoundingClientRect();
  const col = Math.floor((x - rect.left) / (rect.width / 8));
  const row = Math.floor((y - rect.top) / (rect.height / 8));
  if (col < 0 || col > 7 || row < 0 || row > 7) return null;
  const isPerspectiveFlipped = (window.multi && window.multi.active) ? (multi.myColor === 'b') : flipped;
  const r = isPerspectiveFlipped ? 7 - row : row;
  const c = isPerspectiveFlipped ? 7 - col : col;
  return { r, c };
}

function hlDropXY(x, y) {
  document.querySelectorAll('.sq.dov').forEach(el => el.classList.remove('dov'));
  const sq = sqFromXY(x, y);
  if (sq && legal.some(m => m.r === sq.r && m.c === sq.c)) {
    const el = boardEl.querySelector(`.sq[data-r="${sq.r}"][data-c="${sq.c}"]`);
    if (el) el.classList.add('dov');
  }
}

