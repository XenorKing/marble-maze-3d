import { useEffect, useRef, useState } from "react";
import BabylonGame from "./game/BabylonGame";

type GameState = "menu" | "playing" | "win" | "gameover";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<BabylonGame | null>(null);
  const [gameState, setGameState] = useState<GameState>("menu");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [gems, setGems] = useState(0);
  const [totalGems, setTotalGems] = useState(0);
  const [time, setTime] = useState(0);

  const startGame = () => {
    setGameState("playing");
    setScore(0);
    setLives(3);
    setGems(0);
    setTime(0);
  };

  const restartGame = () => {
    if (gameRef.current) {
      gameRef.current.restart();
    }
    setGameState("playing");
    setScore(0);
    setLives(3);
    setGems(0);
    setTime(0);
  };

  useEffect(() => {
    if (gameState !== "playing" || !canvasRef.current) return;

    const game = new BabylonGame(canvasRef.current, level, {
      onGemCollect: (count, total) => {
        setGems(count);
        setTotalGems(total);
        setScore((s) => s + 50);
      },
      onFall: (remainingLives) => {
        setLives(remainingLives);
        if (remainingLives <= 0) {
          setGameState("gameover");
        }
      },
      onWin: (finalScore) => {
        setScore(finalScore);
        setGameState("win");
      },
      onTimeUpdate: (t) => setTime(t),
    });

    gameRef.current = game;

    return () => {
      game.dispose();
      gameRef.current = null;
    };
  }, [gameState, level]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: gameState === "playing" ? "block" : "none", touchAction: "none" }}
      />

      {gameState === "playing" && (
        <div className="absolute top-4 left-0 right-0 flex justify-between px-6 pointer-events-none">
          <div className="flex gap-3">
            <div className="bg-black/60 backdrop-blur border border-cyan-500/40 rounded-xl px-4 py-2 text-white">
              <div className="text-xs text-cyan-400 font-mono uppercase tracking-widest">Score</div>
              <div className="text-2xl font-bold text-cyan-300">{score}</div>
            </div>
            <div className="bg-black/60 backdrop-blur border border-purple-500/40 rounded-xl px-4 py-2 text-white">
              <div className="text-xs text-purple-400 font-mono uppercase tracking-widest">Gems</div>
              <div className="text-2xl font-bold text-purple-300">{gems}/{totalGems}</div>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="bg-black/60 backdrop-blur border border-yellow-500/40 rounded-xl px-4 py-2 text-white">
              <div className="text-xs text-yellow-400 font-mono uppercase tracking-widest">Time</div>
              <div className="text-2xl font-bold text-yellow-300">{time}s</div>
            </div>
            <div className="bg-black/60 backdrop-blur border border-red-500/40 rounded-xl px-4 py-2 text-white">
              <div className="text-xs text-red-400 font-mono uppercase tracking-widest">Lives</div>
              <div className="text-2xl font-bold text-red-300">{"❤️".repeat(lives)}</div>
            </div>
          </div>
        </div>
      )}

      {gameState === "playing" && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
          <div className="bg-black/50 backdrop-blur border border-white/10 rounded-xl px-6 py-2 text-white/60 text-sm font-mono">
            WASD / Arrow Keys — Move &nbsp;|&nbsp; Avoid falling off &nbsp;|&nbsp; Collect all gems to win
          </div>
        </div>
      )}

      {gameState === "menu" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ background: "radial-gradient(ellipse at center, #0a0a2e 0%, #000 100%)" }}>
          <div className="text-center mb-12">
            <div className="text-7xl mb-4">🔮</div>
            <h1 className="text-6xl font-black text-transparent bg-clip-text"
              style={{ backgroundImage: "linear-gradient(135deg, #00f5ff, #a855f7, #f59e0b)" }}>
              MARBLE MAZE
            </h1>
            <p className="text-white/50 mt-3 text-lg font-mono tracking-widest uppercase">
              3D Ball Puzzle · Powered by Babylon.js
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 text-center max-w-xs">
            <p className="text-white/70 text-sm leading-relaxed">
              Roll the glowing marble through the maze.<br/>
              Collect all gems to open the exit portal.<br/>
              Don't fall off the edge!
            </p>
          </div>

          <div className="flex gap-4 mb-8">
            {[1, 2, 3].map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={`px-5 py-2 rounded-xl border font-bold transition-all ${
                  level === l
                    ? "bg-cyan-500 border-cyan-400 text-black"
                    : "border-white/20 text-white/50 hover:border-cyan-500/50 hover:text-white"
                }`}
              >
                Level {l}
              </button>
            ))}
          </div>

          <button
            onClick={startGame}
            className="px-12 py-4 rounded-2xl font-black text-xl text-black transition-all hover:scale-105 active:scale-95"
            style={{ background: "linear-gradient(135deg, #00f5ff, #a855f7)" }}>
            PLAY NOW
          </button>
        </div>
      )}

      {gameState === "win" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ background: "radial-gradient(ellipse at center, #0a2e0a 0%, #000 100%)" }}>
          <div className="text-8xl mb-6">🏆</div>
          <h2 className="text-5xl font-black text-green-400 mb-2">LEVEL CLEAR!</h2>
          <p className="text-white/60 mb-6 text-lg font-mono">
            Time: {time}s &nbsp;|&nbsp; Score: {score}
          </p>
          <div className="flex gap-4">
            {level < 3 && (
              <button
                onClick={() => { setLevel((l) => l + 1); startGame(); }}
                className="px-8 py-3 rounded-2xl font-black text-black text-lg"
                style={{ background: "linear-gradient(135deg, #00f5ff, #a855f7)" }}>
                NEXT LEVEL
              </button>
            )}
            <button
              onClick={() => setGameState("menu")}
              className="px-8 py-3 rounded-2xl font-black text-white text-lg border border-white/30 hover:bg-white/10">
              MENU
            </button>
          </div>
        </div>
      )}

      {gameState === "gameover" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ background: "radial-gradient(ellipse at center, #2e0a0a 0%, #000 100%)" }}>
          <div className="text-8xl mb-6">💀</div>
          <h2 className="text-5xl font-black text-red-400 mb-2">GAME OVER</h2>
          <p className="text-white/60 mb-6 text-lg font-mono">Score: {score}</p>
          <div className="flex gap-4">
            <button
              onClick={restartGame}
              className="px-8 py-3 rounded-2xl font-black text-black text-lg"
              style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}>
              TRY AGAIN
            </button>
            <button
              onClick={() => setGameState("menu")}
              className="px-8 py-3 rounded-2xl font-black text-white text-lg border border-white/30 hover:bg-white/10">
              MENU
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
