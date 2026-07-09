import { useState, useRef, useEffect } from 'react';
import { Chess, type Square } from 'chess.js';
import { RotateCcw } from 'lucide-react';

// Move legality/check/checkmate/castling/en passant/promotion all come from
// chess.js - those rules have too many edge cases to safely hand-roll for a
// casual arcade game. Everything else (board rendering, the AI opponent,
// styling) is built here to match the site's other games.

const PIECE_GLYPH: Record<string, string> = {
  wp: '♙', wn: '♘', wb: '♗', wr: '♖', wq: '♕', wk: '♔',
  bp: '♟', bn: '♞', bb: '♝', br: '♜', bq: '♛', bk: '♚',
};

const VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
// Depth 3 with alpha-beta: measured up to ~450ms worst case on an opening
// position - noticeable but tolerable with a "thinking" delay, same idea as
// the fixed delay on the Tic-Tac-Toe AI. Depth 4 measured 8+ seconds, which
// would freeze the tab (this runs synchronously on the main thread), so it's
// off the table without moving the search to a worker.
const AI_DEPTH = 3;

function evaluate(game: Chess): number {
  let score = 0;
  for (const row of game.board()) {
    for (const sq of row) {
      if (!sq) continue;
      score += sq.color === 'w' ? VALUES[sq.type] : -VALUES[sq.type];
    }
  }
  return score;
}

function minimax(game: Chess, depth: number, alpha: number, beta: number, maximizing: boolean): number {
  if (depth === 0 || game.isGameOver()) {
    if (game.isCheckmate()) return maximizing ? -1000 - depth : 1000 + depth;
    if (game.isDraw() || game.isStalemate()) return 0;
    return evaluate(game);
  }
  const moves = game.moves();
  if (maximizing) {
    let best = -Infinity;
    for (const m of moves) {
      game.move(m);
      best = Math.max(best, minimax(game, depth - 1, alpha, beta, false));
      game.undo();
      alpha = Math.max(alpha, best);
      if (alpha >= beta) break;
    }
    return best;
  }
  let best = Infinity;
  for (const m of moves) {
    game.move(m);
    best = Math.min(best, minimax(game, depth - 1, alpha, beta, true));
    game.undo();
    beta = Math.min(beta, best);
    if (alpha >= beta) break;
  }
  return best;
}

// AI plays Black (minimizing). Ties broken randomly so it doesn't play the
// exact same line every time against the same opening.
function bestAiMove(game: Chess): string | null {
  const moves = game.moves();
  if (!moves.length) return null;
  let bestScore = Infinity;
  let bestMoves: string[] = [];
  for (const m of moves) {
    game.move(m);
    const score = minimax(game, AI_DEPTH - 1, -Infinity, Infinity, true);
    game.undo();
    if (score < bestScore) { bestScore = score; bestMoves = [m]; }
    else if (score === bestScore) bestMoves.push(m);
  }
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

export default function ChessGame() {
  const gameRef = useRef(new Chess());
  const [tick, setTick] = useState(0);
  const [selected, setSelected] = useState<Square | null>(null);
  const [scores, setScores] = useState({ you: 0, ai: 0, draw: 0 });
  const [thinking, setThinking] = useState(false);
  const bump = () => setTick(t => t + 1);

  const game = gameRef.current;
  const turn = game.turn();
  const gameOver = game.isGameOver();
  const inCheck = game.isCheck();

  const legalTargets = selected
    ? (game.moves({ square: selected, verbose: true }) as { to: Square }[]).map(m => m.to)
    : [];
  const historyVerbose = game.history({ verbose: true }) as { from: Square; to: Square }[];
  const lastMove = historyVerbose[historyVerbose.length - 1];
  const checkedKingSquare = inCheck
    ? game.board().flat().find(p => p && p.type === 'k' && p.color === turn)?.square ?? null
    : null;

  // AI's turn - runs after every move (human or AI), bails immediately if
  // it isn't actually Black's turn or the game already ended.
  useEffect(() => {
    if (game.turn() !== 'b' || game.isGameOver()) return;
    setThinking(true);
    const id = setTimeout(() => {
      const mv = bestAiMove(game);
      if (mv) game.move(mv);
      setThinking(false);
      bump();
    }, 320);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  // Tally the result exactly once, right when a move ends the game.
  useEffect(() => {
    if (!game.isGameOver()) return;
    setScores(s => {
      if (game.isCheckmate()) {
        // The side to move is the one with no legal moves while in check.
        return game.turn() === 'b' ? { ...s, you: s.you + 1 } : { ...s, ai: s.ai + 1 };
      }
      return { ...s, draw: s.draw + 1 };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  function reset() {
    gameRef.current = new Chess();
    setSelected(null);
    setThinking(false);
    bump();
  }

  function squareClick(sq: Square) {
    if (turn !== 'w' || gameOver || thinking) return;
    const piece = game.get(sq);

    if (selected) {
      if (selected === sq) { setSelected(null); return; }
      const target = (game.moves({ square: selected, verbose: true }) as { to: Square; flags: string }[])
        .find(m => m.to === sq);
      if (target) {
        try {
          // Auto-promotes to queen - the overwhelmingly common choice, and
          // skipping an underpromotion picker keeps this a casual game
          // rather than a full chess client.
          game.move({ from: selected, to: sq, promotion: target.flags.includes('p') ? 'q' : undefined });
          setSelected(null);
          bump();
        } catch {
          setSelected(null);
        }
        return;
      }
      setSelected(piece && piece.color === 'w' ? sq : null);
      return;
    }
    if (piece && piece.color === 'w') setSelected(sq);
  }

  const statusText = gameOver
    ? game.isCheckmate()
      ? turn === 'b' ? 'Checkmate — you win!' : 'Checkmate — AI wins'
      : game.isStalemate() ? 'Stalemate'
      : 'Draw'
    : thinking ? 'AI thinking...'
    : inCheck ? (turn === 'w' ? 'Check! Your move' : 'Check!')
    : turn === 'w' ? 'Your move' : "AI's move";

  const statusColor = gameOver
    ? game.isCheckmate()
      ? turn === 'b' ? 'var(--accent)' : '#FF6B6B'
      : 'var(--text-dim)'
    : inCheck ? '#FF6B6B'
    : 'var(--text-muted)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '100%' }}>
      {/* Score row */}
      <div style={{ display: 'flex', gap: '6px', width: '100%', maxWidth: '380px', alignItems: 'center' }}>
        <GameStat label="you" value={scores.you} color="var(--accent)" />
        <GameStat label="draw" value={scores.draw} />
        <GameStat label="ai" value={scores.ai} color="#FF6B6B" />
        <button onClick={reset} className="game-btn" style={{ marginLeft: 'auto' }}>
          <RotateCcw size={13} /> reset
        </button>
      </div>

      {/* Status */}
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '0.8rem',
        color: statusColor,
        height: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'color 0.2s',
      }}>
        {thinking && (
          <span style={{ display: 'inline-flex', gap: '3px' }}>
            {[0, 1, 2].map(i => (
              <span key={i} style={{
                width: '4px', height: '4px', borderRadius: '50%',
                background: 'var(--text-dim)', display: 'inline-block',
                animation: `chessDot 0.9s ease-in-out ${i * 0.15}s infinite`,
              }} />
            ))}
          </span>
        )}
        {statusText}
      </div>

      {/* Board */}
      <div style={{
        display: 'grid',
        // minmax(0, 1fr) on BOTH axes, not bare 1fr - a bare 1fr track
        // won't shrink below its content's min-content size, so a square
        // holding a piece glyph stayed a bit wider/taller than an empty
        // one, and moving a piece to a new row visibly resized that row.
        gridTemplateColumns: 'repeat(8, minmax(0, 1fr))',
        gridTemplateRows: 'repeat(8, minmax(0, 1fr))',
        width: 'min(360px, 90vw)',
        aspectRatio: '1',
        borderRadius: '10px',
        overflow: 'hidden',
        border: '1px solid var(--border-2)',
        boxShadow: 'var(--shadow-sm)',
      }}>
        {game.board().map((row, rIdx) => row.map((cell, cIdx) => {
          const sq = `${FILES[cIdx]}${8 - rIdx}` as Square;
          const dark = (rIdx + cIdx) % 2 === 1;
          const isSelected = selected === sq;
          const isTarget = legalTargets.includes(sq);
          const isLastMove = lastMove && (lastMove.from === sq || lastMove.to === sq);
          const isCheckSquare = checkedKingSquare === sq;
          const canClick = turn === 'w' && !gameOver && !thinking;

          return (
            <button
              key={sq}
              onClick={() => squareClick(sq)}
              disabled={!canClick && !isSelected}
              style={{
                position: 'relative',
                background: isSelected
                  ? 'var(--accent-glow-strong)'
                  : isCheckSquare
                    ? 'rgba(255,107,107,0.28)'
                    : isLastMove
                      ? 'var(--accent-glow)'
                      : dark ? 'var(--surface-2)' : 'var(--surface)',
                border: 'none',
                cursor: canClick ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 'clamp(1.3rem, 6vw, 1.8rem)',
                lineHeight: 1,
                color: cell?.color === 'w' ? 'var(--text)' : 'var(--text-muted)',
                transition: 'background 0.12s',
              }}
            >
              {cell && PIECE_GLYPH[cell.color + cell.type]}
              {isTarget && !cell && (
                <span style={{
                  position: 'absolute', width: '24%', height: '24%',
                  borderRadius: '50%', background: 'var(--accent-dim)', opacity: 0.55,
                }} />
              )}
              {isTarget && cell && (
                <span style={{
                  position: 'absolute', inset: '6%',
                  borderRadius: '6px', border: '2.5px solid var(--accent)', opacity: 0.7,
                }} />
              )}
            </button>
          );
        }))}
      </div>

      {gameOver && (
        <button onClick={reset} className="game-btn">
          <RotateCcw size={13} /> play again
        </button>
      )}

      <style>{`
        @keyframes chessDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function GameStat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{
      background: color ? `${color}12` : 'var(--surface-2)',
      border: `1px solid ${color ? `${color}30` : 'var(--border)'}`,
      borderRadius: '10px', padding: '7px 14px', textAlign: 'center', minWidth: '64px',
    }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: '0.55rem',
        color: color ?? 'var(--text-dim)',
        textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px',
      }}>{label}</div>
      <div style={{
        // Syne's digits at heavy weight render as an odd wide pill shape at
        // this size - JetBrains Mono (already used for the label above)
        // gives crisp, legible numerals instead.
        fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '1.15rem',
        color: color ?? 'var(--text)', lineHeight: 1,
      }}>{value}</div>
    </div>
  );
}
