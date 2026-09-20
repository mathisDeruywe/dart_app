"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [gameMode, setGameMode] = useState<'x01' | 'cricket'>('x01');
  const [numPlayers, setNumPlayers] = useState<number>(2);
  const [startingScore, setStartingScore] = useState<number>(501);

  const startGame = () => {
    if (gameMode === 'x01') {
      router.push(`/x01?players=${numPlayers}&score=${startingScore}`);
    } else {
      router.push(`/cricket?players=${numPlayers}`);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-6 select-none">
      <h1 className="text-5xl font-black mb-12 text-blue-500 tracking-tight">Darts Score</h1>
      
      <div className="w-full max-w-md bg-gray-800 p-8 rounded-3xl shadow-xl">
        
        {/* Choix du mode de jeu */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 text-gray-300 text-center">Mode de jeu</h2>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => setGameMode('x01')}
              className={`px-8 py-3 rounded-2xl text-xl font-bold transition-all ${gameMode === 'x01' ? 'bg-blue-600 text-white scale-105' : 'bg-gray-700 text-gray-400'}`}
            >
              x01
            </button>
            <button
              onClick={() => setGameMode('cricket')}
              className={`px-8 py-3 rounded-2xl text-xl font-bold transition-all ${gameMode === 'cricket' ? 'bg-green-600 text-white scale-105' : 'bg-gray-700 text-gray-400'}`}
            >
              Cricket
            </button>
          </div>
        </div>

        {/* Choix du nombre de joueurs */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 text-gray-300 text-center">Joueurs</h2>
          <div className="flex gap-3 justify-center">
            {[1, 2, 3, 4].map((num) => (
              <button
                key={num}
                onClick={() => setNumPlayers(num)}
                className={`w-14 h-14 rounded-full text-xl font-bold transition-all ${numPlayers === num ? (gameMode === 'x01' ? 'bg-blue-600' : 'bg-green-600') : 'bg-gray-700 text-gray-400'}`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Options spécifiques au x01 */}
        {gameMode === 'x01' && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 text-gray-300 text-center">Score de départ</h2>
            <div className="grid grid-cols-2 gap-3">
              {[301, 501, 701, 1001].map(score => (
                <button
                  key={score}
                  onClick={() => setStartingScore(score)}
                  className={`py-3 rounded-xl font-bold transition-all ${startingScore === score ? 'bg-blue-600' : 'bg-gray-700 text-gray-400'}`}
                >
                  {score}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bouton Jouer */}
        <button 
          onClick={startGame}
          className={`w-full p-5 rounded-2xl text-2xl font-black transition-all active:scale-95 ${gameMode === 'x01' ? 'bg-blue-500 hover:bg-blue-400' : 'bg-green-500 hover:bg-green-400'}`}
        >
          JOUER
        </button>
      </div>
    </main>
  );
}