"use client";
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

// Palette de couleurs pour identifier les joueurs (jusqu'à 4)
const PLAYER_COLORS = [
  { text: 'text-blue-400', fill: 'bg-blue-500', btn: 'bg-blue-600 active:bg-blue-500', border: 'border-blue-500/30' },
  { text: 'text-green-400', fill: 'bg-green-500', btn: 'bg-green-600 active:bg-green-500', border: 'border-green-500/30' },
  { text: 'text-yellow-400', fill: 'bg-yellow-500', btn: 'bg-yellow-600 active:bg-yellow-500', border: 'border-yellow-500/30' },
  { text: 'text-red-400', fill: 'bg-red-500', btn: 'bg-red-600 active:bg-red-500', border: 'border-red-500/30' },
];

type Player = { id: number; name: string; score: number; turnBaseScore: number };

const NUMBERS = [20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 25];

function X01Logic() {
  const searchParams = useSearchParams();
  const numPlayers = parseInt(searchParams.get('players') || '2');
  const startingScore = parseInt(searchParams.get('score') || '501');

  const [players, setPlayers] = useState<Player[]>(() => 
    Array.from({ length: numPlayers }, (_, i) => ({
      id: i,
      name: `Joueur ${i + 1}`,
      score: startingScore,
      turnBaseScore: startingScore,
    }))
  );
  
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [dartsThrown, setDartsThrown] = useState(0);
  const [multiplier, setMultiplier] = useState<1 | 2 | 3>(1);

  const handleScore = (val: number) => {
    if (dartsThrown >= 3) return;

    if (val === 25 && multiplier === 3) {
      alert("Le Triple Bull (3x25) n'existe pas !");
      setMultiplier(1);
      return;
    }

    const points = val * multiplier; 
    let isBust = false;
    let isWin = false;

    setPlayers((prev) => {
      const newPlayers = [...prev];
      const p = newPlayers[currentPlayerIndex];
      
      if (p.score - points > 0) {
        p.score -= points;
      } else if (p.score - points === 0) {
        p.score = 0;
        isWin = true;
      } else {
        p.score = p.turnBaseScore; 
        isBust = true;
      }
      return newPlayers;
    });

    setMultiplier(1);

    if (isWin) {
      alert(`Bravo ! ${players[currentPlayerIndex].name} a gagné la partie !`);
      return;
    }

    const newCount = isBust ? 3 : dartsThrown + 1;
    setDartsThrown(newCount);

    if (newCount >= 3) {
      setTimeout(() => {
        setPlayers((currentPlayers) => 
          currentPlayers.map(p => ({ ...p, turnBaseScore: p.score }))
        );
        setCurrentPlayerIndex((i) => (i + 1) % players.length);
        setDartsThrown(0);
      }, 1200);
    }
  };

  const toggleMultiplier = (mod: 2 | 3) => {
    setMultiplier((prev) => (prev === mod ? 1 : mod));
  };

  const currentPlayer = players[currentPlayerIndex];
  // Récupération de la couleur du joueur actif
  const currentTheme = PLAYER_COLORS[currentPlayerIndex % PLAYER_COLORS.length];

  return (
    <div className="w-full max-w-md flex flex-col items-center">
      
      {/* En-tête (Titre neutre et majuscule comme le Cricket) */}
      <div className="w-full flex justify-between items-center mb-4 px-1">
        <Link href="/" className="text-gray-400 px-3 py-2 font-bold text-sm bg-gray-800 hover:bg-gray-700 transition-all rounded-lg">
          ← Quitter
        </Link>
        <h1 className="text-xl font-bold text-white tracking-widest uppercase">x01 - {startingScore}</h1>
      </div>

      {/* JOUEUR ACTUEL (La bordure, le texte et les fléchettes s'adaptent) */}
      <div className={`w-full bg-gray-800 rounded-3xl p-5 mb-3 text-center shadow-lg relative border-2 transition-colors duration-300 ${currentTheme.border}`}>
         <h2 className={`text-2xl font-bold mb-2 transition-colors duration-300 ${currentTheme.text}`}>
           {currentPlayer.name}
         </h2>
         <div className="flex justify-center gap-3 mb-2">
           {[1, 2, 3].map((dart) => (
             <div 
               key={dart} 
               className={`w-3 h-3 rounded-full transition-colors duration-300 ${dart <= dartsThrown ? currentTheme.fill : 'bg-gray-600'}`} 
             />
           ))}
         </div>
         <div className="text-7xl font-black mb-1 tracking-tighter text-white">
           {currentPlayer.score}
         </div>
      </div>

      {/* MINI-SCOREBOARD DES ADVERSAIRES */}
      {players.length > 1 && (
        <div className="flex gap-2 w-full mb-4 overflow-x-auto px-1">
          {players.map((p, idx) => {
            if (idx === currentPlayerIndex) return null; 
            return (
              <div key={p.id} className="flex-1 bg-gray-800/80 rounded-2xl p-2 text-center border border-gray-700/50">
                <div className="text-[11px] text-gray-400 font-bold truncate uppercase">{p.name}</div>
                <div className="text-lg font-black text-gray-300">{p.score}</div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Boutons Modificateurs (Double / Triple) */}
      <div className="flex gap-2 w-full mb-3 px-1">
        <button onClick={() => toggleMultiplier(2)} className={`flex-1 py-3 rounded-2xl text-lg font-bold transition-all ${multiplier === 2 ? 'bg-orange-500 text-white scale-105' : 'bg-gray-800 text-gray-400'}`}>
          Double
        </button>
        <button onClick={() => toggleMultiplier(3)} className={`flex-1 py-3 rounded-2xl text-lg font-bold transition-all ${multiplier === 3 ? 'bg-red-500 text-white scale-105' : 'bg-gray-800 text-gray-400'}`}>
          Triple
        </button>
      </div>

      {/* CLAVIER 1-20 (Les boutons prennent la couleur du joueur) */}
      <div className="grid grid-cols-4 gap-2 w-full mb-4 px-1">
         {NUMBERS.map((val) => (
           <button 
             key={val} 
             onClick={() => handleScore(val)} 
             className={`py-3 rounded-xl text-xl font-bold active:scale-95 transition-colors duration-300 text-white shadow-sm ${currentTheme.btn}`}
           >
             {val}
           </button>
         ))}
         {/* Bouton Miss reste gris/neutre */}
         <button onClick={() => handleScore(0)} className="bg-gray-800 border border-gray-600 py-3 rounded-xl text-xl font-bold col-span-3 text-gray-400 active:bg-gray-700 shadow-sm transition-all">
           Miss (0)
         </button>
      </div>
    </div>
  );
}

export default function X01Game() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-2 select-none overflow-hidden">
      <Suspense fallback={<div className="text-xl font-bold text-blue-400 animate-pulse">Chargement de la partie...</div>}>
        <X01Logic />
      </Suspense>
    </main>
  );
}