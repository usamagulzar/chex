// --- CHESSOLOGY VARIANTS ENGINE ----------------------------------------------
const PIECE_COSTS = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 };

window.variants = {
  // Dice Chess
  diceChessEnabled: false,
  allowedDiceTypes: [],

  // Fog of War
  fogOfWarEnabled: false,

  // Salary Cap (The Draft)
  DRAFT_BUDGET: 39,
  draftEnabled: false,
  draftLocked: { w: false, b: false },
  draftPointsLeft: { w: 39, b: 39 },
  draftActivePieceType: 'P', // Default to Pawn so users can immediately place pieces
  draftActiveColor: 'w',      // client side placing color

  // Identity Theft
  identityTheftEnabled: false,
  identityTheftMode: 'steal', // 'steal' or 'append'

  // Hand and Brain
  handAndBrainEnabled: false,
  brainSuggestedPiece: null, // 'P', 'N', 'B', 'R', 'Q', 'K'

  init() {
    this.allowedDiceTypes = [];
    this.brainSuggestedPiece = null;
    this.draftLocked = { w: false, b: false };
    this.draftPointsLeft = { w: this.DRAFT_BUDGET, b: this.DRAFT_BUDGET };
    this.draftActivePieceType = 'P';

    if (this.draftEnabled) {
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          board[r][c] = null;
        }
      }
    }
  },

  get isDiceChessActive() {
    return (window.app && window.app.gameState !== 'setup') && this.diceChessEnabled && !this.isDraftActive; // Draft phase suspends variants until game start
  },

  get isFogOfWarActive() {
    return (window.app && window.app.gameState !== 'setup') && this.fogOfWarEnabled && !this.isDraftActive;
  },

  // draftEnabled is the lobby rule setting. isDraftActive is the temporal phase.
  // We need both because Draft Mode is "on" for the whole match, but the actual drafting 
  // only happens before both players lock in. Once they lock, the variant is still enabled 
  // but the drafting phase is dead. RIP drafting phase.
  get isDraftActive() {
    return (window.app && window.app.gameState === 'playing' && !over) && this.draftEnabled && (!this.draftLocked.w || !this.draftLocked.b);
  },

  get isIdentityTheftActive() {
    return (window.app && window.app.gameState !== 'setup') && this.identityTheftEnabled;
  },

  get isHandAndBrainActive() {
    return (window.app && window.app.gameState !== 'setup') && this.handAndBrainEnabled && !this.isDraftActive;
  },

requestBrainMove(color) {
  if (!this.handAndBrainEnabled) return;

  // Same rule as dice: only compute if it's offline, or actively our turn.
  // Otherwise wait for the mover's client to push it via Firebase.
  if (window.multi && window.multi.active && window.multi.myColor !== color) {
    this.brainSuggestedPiece = null;
    if (window.app && window.app.renderAll) window.app.renderAll();
    return;
  }

  this.brainSuggestedPiece = null; // show "Thinking..." while it searches
  if (window.app && window.app.renderAll) window.app.renderAll();

  const fen = boardToFen(board, color, castling, enPassantSquare);

  window.brainEngine.requestMove(fen, (moveStr) => {
    const col = moveStr.charCodeAt(0) - 'a'.charCodeAt(0);
    const row = '8'.charCodeAt(0) - moveStr.charCodeAt(1);
    const piece = board[row][col];
    if (!piece) return;

    this.brainSuggestedPiece = piece.type;
    if (window.app && window.app.renderAll) window.app.renderAll();

    // Same pattern as dice: whoever just computed it pushes to Firebase.
    if (window.multi && window.multi.active && window.multi.gameId) {
      rtdb.ref('games/' + window.multi.gameId).update({
        brainSuggestedPiece: piece.type
      });
    }
  });
},

rollDice(color) {
    if (!this.diceChessEnabled) return;
    
    // NEW LOGIC: Only roll if we are offline, OR if it is actively our turn.
    // If it's the opponent's turn, we skip rolling and wait for them to send it.
    if (window.multi && window.multi.active && window.multi.myColor !== color)
    {
      this.allowedDiceTypes = [];
      if (window.app && window.app.renderAll) window.app.renderAll();
      return;
    }

    let totalPieces = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.color === color) totalPieces++;
      }
    }

    const allMoves = this.getMovesIgnoringDice(color);
    const movableTypes = new Set();
    
    allMoves.forEach(m => {
      const p = board[m.from.r][m.from.c];
      if (p) p.types.forEach(t => movableTypes.add(t));
    });

    const movableArr = Array.from(movableTypes);

    if (totalPieces <= 2 || movableArr.length <= 2) {
      this.allowedDiceTypes = movableArr;
    } else {
      const shuffled = [...movableArr];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      this.allowedDiceTypes = [shuffled[0], shuffled[1]];
    }

    // NEW LOGIC: Whoever just rolled the dice sends it to Firebase.
    if (window.multi && window.multi.active) {
      window.multi.sendSignal('dice-roll', {
        allowedDiceTypes: this.allowedDiceTypes
      });
      
      if (window.multi.gameId) {
        rtdb.ref('games/' + window.multi.gameId).update({
          currentDice: this.allowedDiceTypes.join(',')
        });
      }
    }
  },

  getDraftFenForColor(color) {
    let fenResult = '';
    for (let r = 0; r < 8; r++) {
      let emptySquaresCount = 0;
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        // Only include pieces belonging to this specific color
        if (p && p.color === color) {
          if (emptySquaresCount) {
            fenResult += emptySquaresCount;
            emptySquaresCount = 0;
          }
          fenResult += p.color === 'w' ? p.type : p.type.toLowerCase();
        } else {
          emptySquaresCount++;
        }
      }
      if (emptySquaresCount) fenResult += emptySquaresCount;
      if (r < 7) fenResult += '/';
    }
    return fenResult;
  },

  getMovesIgnoringDice(color) {
    this.diceChessEnabled = false;
    const moves = allLegalMoves(color, board, enPassantSquare, castling);
    this.diceChessEnabled = true;
    return moves;
  },

  isDicePieceAllowed(piece) {
    if (this.isDiceChessActive && this.allowedDiceTypes.length > 0) {
      const pTypes = piece.types || [piece.type];
      if (!pTypes.some(t => this.allowedDiceTypes.includes(t))) return false;
    }
    if (this.isHandAndBrainActive) {
      if (!this.brainSuggestedPiece) return false;
      const pTypes = piece.types || [piece.type];
      if (!pTypes.includes(this.brainSuggestedPiece)) return false;
    }
    return true;
  },

  getVisibleSquares(playerColor, boardState) {
    return window.getVisibleSquares(playerColor);
  },

  // 3. Salary Cap Draft management
  getPieceCost(type) {
    return PIECE_COSTS[type] ?? 0;
  },

  handleDraftPlace(r, c, color) {
    const isRowValid = color === 'w' ? (r >= 4 && r <= 7) : (r >= 0 && r <= 3);
    if (!isRowValid) return false;

    const existing = board[r][c];

    // Click your own piece to remove it and get points back
    if (existing) {
      if (existing.color !== color) return false;
      this.draftPointsLeft[color] += this.getPieceCost(existing.type);
      board[r][c] = null;
      return true;
    }

    if (!this.draftActivePieceType) return false;

    const cost = this.getPieceCost(this.draftActivePieceType);
    if (this.draftPointsLeft[color] < cost) {
      alert('Not enough points!');
      return false;
    }

    // Only one King is allowed per player
    if (this.draftActivePieceType === 'K') {
      this.removeKingForColor(color);
    }

    board[r][c] = {
      color,
      type: this.draftActivePieceType,
      types: [this.draftActivePieceType]
    };
    this.draftPointsLeft[color] -= cost;
    return true;
  },

  removeKingForColor(color) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (board[r][c]?.type === 'K' && board[r][c]?.color === color) {
          board[r][c] = null;
        }
      }
    }
  },

  lockDraft(color) {
    const hasKing = this.findKingForColor(color) !== null;
    if (!hasKing) {
      alert('You must place your King before locking!');
      return false;
    }
    this.draftLocked[color] = true;
    return true;
  },

  findKingForColor(color) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (board[r][c]?.type === 'K' && board[r][c]?.color === color) {
          return { r, c };
        }
      }
    }
    return null;
  },

  // 4. Identity Theft morphs
handleIdentityTheft(attacker, captured) {
    if (!this.identityTheftEnabled) return;
    if (attacker.type === 'K') return; // Kings retain their royal status and do not steal identities

    const capTypes = captured.types || [captured.type];

    if (this.identityTheftMode === 'steal') {
      attacker.type = captured.type;
      attacker.types = [...capTypes];
    } else if (this.identityTheftMode === 'append') {
      if (!attacker.types) attacker.types = [attacker.type];

      capTypes.forEach(t => {
        if (!this.isTypeSubsumed(t, attacker.types)) {
          attacker.types.push(t);
        }
      });

      // A newly-added broad power (e.g. Queen) can retroactively make a power
      // the piece already held (e.g. its original Bishop) redundant. Prune
      // anything now covered by another type still in the list.
      const merged = [...attacker.types];
      attacker.types = merged.filter(t => !merged.some(other => other !== t && this.subsumes(other, t)));

      // Sort types by point value so the base type is always the strongest
      attacker.types.sort((a, b) => (PIECE_VALUES[b] || 0) - (PIECE_VALUES[a] || 0));
      attacker.type = attacker.types[0];
    }
  },

  // Does holding `holder` make `type` redundant on the same piece?
  subsumes(holder, type) {
    if (holder === 'Q' && (type === 'B' || type === 'R' || type === 'P')) return true;
    return false;
  },

  isTypeSubsumed(type, existingTypes) {
    if (existingTypes.includes(type)) return true;
    return existingTypes.some(h => this.subsumes(h, type));
  }
};
