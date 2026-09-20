"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

// La liste de tes joueurs réguliers (tu peux la modifier comme tu veux !)
const PREDEFINED_NAMES = ["Mathis", "Rémi", "Papa", "Maman", "Invité"];

export default function Home() {
  const router = useRouter();
  const [gameMode, setGameMode] = useState<'x01' | 'cricket'>('x01');
  const [numPlayers, setNumPlayers] = useState<number>(2);
  const [startingScore, setStartingScore] = useState<number>(301);
  
  // État pour stocker les noms des 4 joueurs possibles
  const [playerNames, setPlayerNames] = useState<string[]>(['Joueur 1', 'Joueur 2', 'Joueur 3', 'Joueur 4']);

  const handleNameChange = (index: number, newName: string) => {
    const newNames = [...playerNames];
    newNames[index] = newName;
    setPlayerNames(newNames);
  };

  const startGame = () => {
    // On récupère uniquement les noms des joueurs actifs et on les encode pour l'URL
    const activeNames = playerNames
      .slice(0, numPlayers)
      .map((n, i) => encodeURIComponent(n.trim() || `Joueur ${i + 1}`))
      .join(',');

    if (gameMode === 'x01') {
      router.push(`/x01?players=${numPlayers}&score=${startingScore}&names=${activeNames}`);
    } else {
      router.push(`/cricket?players=${numPlayers}&names=${activeNames}`);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4 sm:p-6 select-none overflow-y-auto">
      <h1 className={`text-5xl font-black mb-8 tracking-tight transition-colors duration-500 ${gameMode === 'x01' ? 'text-blue-500' : 'text-green-500'}`}>
        Fléchettes Score
      </h1>
      
      <div className="w-full max-w-md bg-gray-800 p-6 sm:p-8 rounded-3xl shadow-xl border border-gray-700/50">
        
        {/* Choix du mode de jeu */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 text-gray-300 text-center">Mode de jeu</h2>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => setGameMode('x01')}
              className={`px-8 py-3 rounded-2xl text-xl font-bold transition-all ${gameMode === 'x01' ? 'bg-blue-600 text-white scale-105 shadow-lg shadow-blue-900/50' : 'bg-gray-700 text-gray-400'}`}
            >
              x01
            </button>
            <button
              onClick={() => setGameMode('cricket')}
              className={`px-8 py-3 rounded-2xl text-xl font-bold transition-all ${gameMode === 'cricket' ? 'bg-green-600 text-white scale-105 shadow-lg shadow-green-900/50' : 'bg-gray-700 text-gray-400'}`}
            >
              Cricket
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
                className={`w-14 h-14 rounded-full text-xl font-bold transition-all ${numPlayers === num ? (gameMode === 'x01' ? 'bg-blue-600 shadow-lg shadow-blue-900/50' : 'bg-green-600 shadow-lg shadow-green-900/50') : 'bg-gray-700 text-gray-400'}`}
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
                  className={`w-full bg-gray-800 text-white px-4 py-3 rounded-xl border-2 transition-colors focus:outline-none ${gameMode === 'x01' ? 'focus:border-blue-500 border-gray-700' : 'focus:border-green-500 border-gray-700'}`}
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

        {/* Options spécifiques au x01 */}
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
          className={`w-full p-5 rounded-2xl text-2xl font-black transition-all active:scale-95 shadow-xl ${gameMode === 'x01' ? 'bg-blue-500 hover:bg-blue-400 shadow-blue-900/50' : 'bg-green-500 hover:bg-green-400 shadow-green-900/50'}`}
        >
          JOUER
        </button>
      </div>
    </main>
  );
}