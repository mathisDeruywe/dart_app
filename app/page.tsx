"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const PREDEFINED_NAMES = ["Mathis", "Rémi", "Maman", "Papa", "Invité"];

export default function Home() {
  const router = useRouter();
  
  const [gameMode, setGameMode] = useState<'x01' | 'cricket' | 'century' | 'scram' | 'clock'>('x01');
  const [numPlayers, setNumPlayers] = useState<number>(2);
  const [startingScore, setStartingScore] = useState<number>(501);
  const [clockMode, setClockMode] = useState<'normal' | 'double' | 'triple'>('normal'); // NOUVEAU : Option de l'Horloge
  const [playerNames, setPlayerNames] = useState<string[]>(['Joueur 1', 'Joueur 2', 'Joueur 3', 'Joueur 4']);
  const [step, setStep] = useState<number>(1);

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
    } else if (gameMode === 'scram') {
      router.push(`/scram?players=${numPlayers}&names=${activeNames}`);
    } else if (gameMode === 'century') {
      router.push(`/century?players=${numPlayers}&names=${activeNames}`);
    } else {
      // Redirection pour l'horloge avec la difficulté choisie
      router.push(`/clock?players=${numPlayers}&mode=${clockMode}&names=${activeNames}`);
    }
  };

  const getTitleColor = () => {
    if (gameMode === 'x01') return 'text-blue-500';
    if (gameMode === 'cricket') return 'text-green-500';
    if (gameMode === 'scram') return 'text-orange-500';
    if (gameMode === 'clock') return 'text-teal-500';
    return 'text-purple-500';
  };

  const getThemeBgColor = () => {
    if (gameMode === 'x01') return 'bg-blue-600';
    if (gameMode === 'cricket') return 'bg-green-600';
    if (gameMode === 'scram') return 'bg-orange-600';
    if (gameMode === 'clock') return 'bg-teal-600';
    return 'bg-purple-600';
  };

  const getPlayerBtnColor = (num: number) => {
    if (numPlayers !== num) return 'bg-gray-700 text-gray-400 border border-gray-600';
    if (gameMode === 'x01') return 'bg-blue-600 shadow-lg shadow-blue-900/50 text-white';
    if (gameMode === 'cricket') return 'bg-green-600 shadow-lg shadow-green-900/50 text-white';
    if (gameMode === 'scram') return 'bg-orange-600 shadow-lg shadow-orange-900/50 text-white';
    if (gameMode === 'clock') return 'bg-teal-600 shadow-lg shadow-teal-900/50 text-white';
    return 'bg-purple-600 shadow-lg shadow-purple-900/50 text-white';
  };

  return (
    <main 
      className="flex flex-col items-center justify-center min-h-screen text-white p-4 sm:p-6 select-none overflow-y-auto bg-cover bg-center bg-fixed"
      style={{ backgroundImage: "url('/fond.jpeg')" }}
    >
      <h1 className={`text-5xl font-black mb-6 tracking-tight transition-colors duration-500 ${getTitleColor()}`}>
        Fléchettes
      </h1>
      
      <div className="w-full max-w-md bg-gray-800 p-6 sm:p-8 rounded-3xl shadow-2xl border border-gray-700/50 relative overflow-hidden">
        
        <div className="flex justify-between gap-2 mb-8">
          <div className={`h-2 flex-1 rounded-full transition-all duration-500 ${step >= 1 ? getThemeBgColor() : 'bg-gray-700'}`} />
          <div className={`h-2 flex-1 rounded-full transition-all duration-500 ${step >= 2 ? getThemeBgColor() : 'bg-gray-700'}`} />
          <div className={`h-2 flex-1 rounded-full transition-all duration-500 ${step >= 3 ? getThemeBgColor() : 'bg-gray-700'}`} />
        </div>

        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-2xl font-bold mb-6 text-gray-200 text-center">Choisissez votre jeu</h2>
            
            <div className="flex gap-3 justify-center flex-wrap mb-2">
              <button onClick={() => setGameMode('x01')} className={`px-5 py-3 rounded-2xl text-lg font-bold transition-all ${gameMode === 'x01' ? 'bg-blue-600 text-white scale-105 shadow-lg shadow-blue-900/50' : 'bg-gray-700 text-gray-400 border border-gray-600'}`}>x01</button>
              <button onClick={() => setGameMode('cricket')} className={`px-5 py-3 rounded-2xl text-lg font-bold transition-all ${gameMode === 'cricket' ? 'bg-green-600 text-white scale-105 shadow-lg shadow-green-900/50' : 'bg-gray-700 text-gray-400 border border-gray-600'}`}>Cricket</button>
              <button onClick={() => setGameMode('scram')} className={`px-5 py-3 rounded-2xl text-lg font-bold transition-all ${gameMode === 'scram' ? 'bg-orange-600 text-white scale-105 shadow-lg shadow-orange-900/50' : 'bg-gray-700 text-gray-400 border border-gray-600'}`}>Scram</button>
              <button onClick={() => setGameMode('century')} className={`px-5 py-3 rounded-2xl text-lg font-bold transition-all ${gameMode === 'century' ? 'bg-purple-600 text-white scale-105 shadow-lg shadow-purple-900/50' : 'bg-gray-700 text-gray-400 border border-gray-600'}`}>Century</button>
              <button onClick={() => setGameMode('clock')} className={`px-5 py-3 rounded-2xl text-lg font-bold transition-all ${gameMode === 'clock' ? 'bg-teal-600 text-white scale-105 shadow-lg shadow-teal-900/50' : 'bg-gray-700 text-gray-400 border border-gray-600'}`}>Horloge</button>
            </div>

            {gameMode === 'x01' && (
              <div className="mt-8 animate-in fade-in zoom-in duration-300">
                <h3 className="text-sm uppercase tracking-widest font-bold mb-4 text-gray-400 text-center">Score de départ</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[301, 501, 701, 1001].map(score => (
                    <button key={score} onClick={() => setStartingScore(score)} className={`py-3 rounded-xl font-bold transition-all ${startingScore === score ? 'bg-blue-600 shadow-lg shadow-blue-900/50 text-white' : 'bg-gray-700 text-gray-400 border border-gray-600'}`}>{score}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Options spécifiques à l'Horloge */}
            {gameMode === 'clock' && (
              <div className="mt-8 animate-in fade-in zoom-in duration-300">
                <h3 className="text-sm uppercase tracking-widest font-bold mb-4 text-gray-400 text-center">Difficulté</h3>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => setClockMode('normal')} className={`py-3 rounded-xl font-bold transition-all ${clockMode === 'normal' ? 'bg-teal-600 shadow-lg shadow-teal-900/50 text-white' : 'bg-gray-700 text-gray-400 border border-gray-600'}`}>Normal</button>
                  <button onClick={() => setClockMode('double')} className={`py-3 rounded-xl font-bold transition-all ${clockMode === 'double' ? 'bg-teal-600 shadow-lg shadow-teal-900/50 text-white' : 'bg-gray-700 text-gray-400 border border-gray-600'}`}>Double</button>
                  <button onClick={() => setClockMode('triple')} className={`py-3 rounded-xl font-bold transition-all ${clockMode === 'triple' ? 'bg-teal-600 shadow-lg shadow-teal-900/50 text-white' : 'bg-gray-700 text-gray-400 border border-gray-600'}`}>Triple</button>
                </div>
              </div>
            )}

            <button onClick={() => setStep(2)} className={`w-full p-4 mt-8 rounded-xl text-xl font-bold transition-all active:scale-95 shadow-lg ${getThemeBgColor()} hover:opacity-90`}>
              Continuer ➔
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <button onClick={() => setStep(1)} className="text-gray-400 mb-6 text-sm font-bold bg-gray-900/50 px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-all">← Retour</button>
            <h2 className="text-2xl font-bold mb-8 text-gray-200 text-center">Nombre de joueurs</h2>
            
            <div className="flex gap-4 justify-center mb-8">
              {[1, 2, 3, 4].map((num) => (
                <button key={num} onClick={() => setNumPlayers(num)} className={`w-16 h-16 rounded-full text-2xl font-bold transition-all ${getPlayerBtnColor(num)}`}>{num}</button>
              ))}
            </div>

            <button onClick={() => setStep(3)} className={`w-full p-4 rounded-xl text-xl font-bold transition-all active:scale-95 shadow-lg ${getThemeBgColor()} hover:opacity-90`}>
              Continuer ➔
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <button onClick={() => setStep(2)} className="text-gray-400 mb-4 text-sm font-bold bg-gray-900/50 px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-all">← Retour</button>
            <h2 className="text-2xl font-bold mb-6 text-gray-200 text-center">Noms des joueurs</h2>
            
            <div className="flex flex-col gap-4 mb-8">
              {Array.from({ length: numPlayers }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2 bg-gray-900/30 p-3 rounded-2xl border border-gray-700/50">
                  <input type="text" value={playerNames[i]} onChange={(e) => handleNameChange(i, e.target.value)} placeholder={`Joueur ${i + 1}`} maxLength={10} className={`w-full bg-gray-800 text-white px-4 py-3 rounded-xl border-2 transition-colors focus:outline-none ${gameMode === 'x01' ? 'focus:border-blue-500 border-gray-700' : gameMode === 'cricket' ? 'focus:border-green-500 border-gray-700' : gameMode === 'scram' ? 'focus:border-orange-500 border-gray-700' : gameMode === 'clock' ? 'focus:border-teal-500 border-gray-700' : 'focus:border-purple-500 border-gray-700'}`} />
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {PREDEFINED_NAMES.map(name => (
                      <button key={name} onClick={() => handleNameChange(i, name)} className="whitespace-nowrap px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-bold rounded-lg active:scale-95 transition-all">{name}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button onClick={startGame} className={`w-full p-5 rounded-2xl text-2xl font-black transition-all active:scale-95 shadow-xl ${getThemeBgColor()} hover:opacity-90`}>
              JOUER !
            </button>
          </div>
        )}
      </div>
    </main>
  );
}