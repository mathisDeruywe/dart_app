"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const PREDEFINED_NAMES = ["Mathis", "Rémi", "Maman", "Papa", "Invité"];

export default function Home() {
  const router = useRouter();
  const [gameMode, setGameMode] = useState<'x01' | 'cricket' | 'century'>('x01');
  const [numPlayers, setNumPlayers] = useState<number>(2);
  const [startingScore, setStartingScore] = useState<number>(501);
  const [playerNames, setPlayerNames] = useState<string[]>(['Joueur 1', 'Joueur 2', 'Joueur 3', 'Joueur 4']);

  const handleNameChange = (index: number, newName: string) => {
    const newNames = [...playerNames];
    newNames[index] = newName;
    setPlayerNames(newNames);
  };

  const startGame = () => {
    const activeNames = playerNames
      .slice(0, numPlayers)
      .map((n, i) => encodeURIComponent(n.trim() || `Joueur ${i + 1}`))
      .join(',');

    if (gameMode === 'x01') {
      router.push(`/x01?players=${numPlayers}&score=${startingScore}&names=${activeNames}`);
    } else if (gameMode === 'cricket') {
      router.push(`/cricket?players=${numPlayers}&names=${activeNames}`);
    } else {
      router.push(`/century?players=${numPlayers}&names=${activeNames}`);
    }
  };

  const getTitleColor = () => {
    if (gameMode === 'x01') return 'text-blue-500';
    if (gameMode === 'cricket') return 'text-green-500';
    return 'text-purple-500';
  };

  const getPlayerBtnColor = (num: number) => {
    if (numPlayers !== num) return 'bg-gray-700 text-gray-400';
    if (gameMode === 'x01') return 'bg-blue-600 shadow-lg shadow-blue-900/50';
    if (gameMode === 'cricket') return 'bg-green-600 shadow-lg shadow-green-900/50';
    return 'bg-purple-600 shadow-lg shadow-purple-900/50';
  };

  return (
    <main 
      className="flex flex-col items-center justify-center min-h-screen text-white p-4 sm:p-6 select-none overflow-y-auto bg-cover bg-center bg-fixed"
      style={{ backgroundImage: "url('/fond.jpeg')" }}
    >
      <h1 className={`text-5xl font-black mb-8 tracking-tight transition-colors duration-500 ${getTitleColor()}`}>
        Fléchettes Score
      </h1>
      
      <div className="w-full max-w-md bg-gray-800 p-6 sm:p-8 rounded-3xl shadow-xl border border-gray-700/50">
        
        {/* Choix du mode de jeu */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 text-gray-300 text-center">Mode de jeu</h2>
          <div className="flex gap-3 justify-center flex-wrap">
            <button
              onClick={() => setGameMode('x01')}
              className={`px-5 py-3 rounded-2xl text-lg font-bold transition-all ${gameMode === 'x01' ? 'bg-blue-600 text-white scale-105 shadow-lg shadow-blue-900/50' : 'bg-gray-700 text-gray-400'}`}
            >
              x01
            </button>
            <button
              onClick={() => setGameMode('cricket')}
              className={`px-5 py-3 rounded-2xl text-lg font-bold transition-all ${gameMode === 'cricket' ? 'bg-green-600 text-white scale-105 shadow-lg shadow-green-900/50' : 'bg-gray-700 text-gray-400'}`}
            >
              Cricket
            </button>
            <button
              onClick={() => setGameMode('century')}
              className={`px-5 py-3 rounded-2xl text-lg font-bold transition-all ${gameMode === 'century' ? 'bg-purple-600 text-white scale-105 shadow-lg shadow-purple-900/50' : 'bg-gray-700 text-gray-400'}`}
            >
              Century
            </button>
          </div>
        </div>

        {/* Choix du nombre de joueurs */}
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-4 text-gray-300 text-center">Nombre de joueurs</h2>
          <div className="flex gap-3 justify-center">
            {[1, 2, 3, 4].map((num) => (
              <button
                key={num}
                onClick={() => setNumPlayers(num)}
                className={`w-14 h-14 rounded-full text-xl font-bold transition-all ${getPlayerBtnColor(num)}`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Personnalisation des noms */}
        <div className="mb-8 bg-gray-900/50 p-4 rounded-2xl border border-gray-700/50">
          <h2 className="text-lg font-bold mb-4 text-gray-300 text-center">Noms des joueurs</h2>
          <div className="flex flex-col gap-4">
            {Array.from({ length: numPlayers }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <input 
                  type="text" 
                  value={playerNames[i]} 
                  onChange={(e) => handleNameChange(i, e.target.value)}
                  placeholder={`Joueur ${i + 1}`}
                  maxLength={10}
                  className={`w-full bg-gray-800 text-white px-4 py-3 rounded-xl border-2 transition-colors focus:outline-none border-gray-700 ${gameMode === 'x01' ? 'focus:border-blue-500' : gameMode === 'cricket' ? 'focus:border-green-500' : 'focus:border-purple-500'}`}
                />
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {PREDEFINED_NAMES.map(name => (
                    <button
                      key={name}
                      onClick={() => handleNameChange(i, name)}
                      className="whitespace-nowrap px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-bold rounded-lg active:scale-95 transition-all"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {gameMode === 'x01' && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 text-gray-300 text-center">Score de départ</h2>
            <div className="grid grid-cols-2 gap-3">
              {[301, 501, 701, 1001].map(score => (
                <button
                  key={score}
                  onClick={() => setStartingScore(score)}
                  className={`py-3 rounded-xl font-bold transition-all ${startingScore === score ? 'bg-blue-600 shadow-lg shadow-blue-900/50' : 'bg-gray-700 text-gray-400'}`}
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
          className={`w-full p-5 rounded-2xl text-2xl font-black transition-all active:scale-95 shadow-xl ${
            gameMode === 'x01' ? 'bg-blue-500 hover:bg-blue-400 shadow-blue-900/50' : 
            gameMode === 'cricket' ? 'bg-green-500 hover:bg-green-400 shadow-green-900/50' : 
            'bg-purple-500 hover:bg-purple-400 shadow-purple-900/50'
          }`}
        >
          JOUER
        </button>
      </div>
    </main>
  );
}