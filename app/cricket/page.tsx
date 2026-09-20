"use client";
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const TARGETS = [20, 19, 18, 17, 16, 15, 25];

const PLAYER_COLORS = [
  { text: 'text-blue-400', fill: 'bg-blue-500', headBg: 'bg-blue-900/60', cellBg: 'bg-blue-900/20', border: 'border-blue-500/30', winBg: 'bg-blue-900/40' },
  { text: 'text-green-400', fill: 'bg-green-500', headBg: 'bg-green-900/60', cellBg: 'bg-green-900/20', border: 'border-green-500/30', winBg: 'bg-green-900/40' },
  { text: 'text-yellow-400', fill: 'bg-yellow-500', headBg: 'bg-yellow-900/60', cellBg: 'bg-yellow-900/20', border: 'border-yellow-500/30', winBg: 'bg-yellow-900/40' },
  { text: 'text-red-400', fill: 'bg-red-500', headBg: 'bg-red-900/60', cellBg: 'bg-red-900/20', border: 'border-red-500/30', winBg: 'bg-red-900/40' },
];

type Player = { id: number; name: string; score: number; marks: Record<number, number>; };

function CricketLogic() {
  const searchParams = useSearchParams();
  const numPlayers = parseInt(searchParams.get('players') || '2');

  const namesParam = searchParams.get('names');
  const customNames = namesParam ? namesParam.split(',').map(n => decodeURIComponent(n)) : [];

  const [players, setPlayers] = useState<Player[]>(() => {
    const initialMarks = TARGETS.reduce((acc, target) => ({ ...acc, [target]: 0 }), {});
    return Array.from({ length: numPlayers }, (_, i) => ({
      id: i,
      name: customNames[i] || `Joueur ${i + 1}`,
      score: 0,
      marks: { ...initialMarks },
    }));
  });

  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [dartsThrown, setDartsThrown] = useState(0);
  const [multiplier, setMultiplier] = useState<1 | 2 | 3>(1);
  const [currentThrows, setCurrentThrows] = useState<string[]>([]); // Restauré : Historique des lancers

  const winner = players.find(p => {
    const allClosed = TARGETS.every(t => p.marks[t] === 3);
    const highestScore = players.every(other => other.id === p.id || p.score >= other.score);
    return allClosed && highestScore;
  }) || null;

  const resetGame = () => {
    const initialMarks = TARGETS.reduce((acc, target) => ({ ...acc, [target]: 0 }), {});
    setPlayers(Array.from({ length: numPlayers }, (_, i) => ({
      id: i,
      name: customNames[i] || `Joueur ${i + 1}`,
      score: 0,
      marks: { ...initialMarks },
    })));
    setCurrentPlayerIndex(0);
    setDartsThrown(0);
    setMultiplier(1);
    setCurrentThrows([]);
  };

  const handleHit = (target: number) => {
    if (winner || dartsThrown >= 3) return;

    if (target !== 0) {
      if (target === 25 && multiplier === 3) {
        alert("Le Triple Bull n'existe pas !");
        setMultiplier(1);
        return;
      }

      // Enregistrement visuel du lancer (ex: T20, D15, 25)
      const hitStr = multiplier === 3 ? `T${target}` : multiplier === 2 ? `D${target}` : `${target}`;
      setCurrentThrows((prev) => [...prev, hitStr]);

      setPlayers((prev) => {
        const newPlayers = JSON.parse(JSON.stringify(prev));
        const current = newPlayers[currentPlayerIndex];

        let marksToAdd = multiplier;
        const currentMarks = current.marks[target];

        if (currentMarks < 3) {
          const spacesLeft = 3 - currentMarks;
          const marksTaken = Math.min(spacesLeft, marksToAdd);
          current.marks[target] += marksTaken;
          marksToAdd -= marksTaken;
        }

        if (marksToAdd > 0) {
          const closedByAll = newPlayers.every((p: Player) => p.marks[target] === 3);
          if (!closedByAll) {
            current.score += (target * marksToAdd);
          }
        }
        return newPlayers;
      });
    } else {
      // Cas du Miss (0)
      setCurrentThrows((prev) => [...prev, '0']);
    }

    setMultiplier(1); 
    
    const newCount = dartsThrown + 1;
    setDartsThrown(newCount);

    if (newCount >= 3) {
      setTimeout(() => {
        setCurrentPlayerIndex((i) => (i + 1) % players.length);
        setDartsThrown(0);
        setCurrentThrows([]);
      }, 1200);
    }
  };

  const toggleMultiplier = (mod: 2 | 3) => {
    setMultiplier((prev) => (prev === mod ? 1 : mod));
  };

  const renderMark = (count: number) => {
    if (count === 1) return "/";
    if (count === 2) return "X";
    if (count === 3) return "Ⓧ";
    return "";
  };

  const currentPlayer = players[currentPlayerIndex];
  const currentTheme = PLAYER_COLORS[currentPlayerIndex % PLAYER_COLORS.length];

  return (
    <div className="w-full max-w-md flex flex-col items-center relative pb-6 overflow-hidden">
      
      {/* =========================================
          OVERLAY DE VICTOIRE EN POP-UP
          ========================================= */}
      {winner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md ${PLAYER_COLORS[winner.id % PLAYER_COLORS.length].headBg} border-2 ${PLAYER_COLORS[winner.id % PLAYER_COLORS.length].border} rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-300`}>
            <div className="absolute top-0 left-0 w-full h-full bg-white/5 animate-pulse pointer-events-none" />
            <h1 className="text-5xl font-black text-white mb-2 relative z-10 drop-shadow-md">VICTOIRE !</h1>
            <h2 className={`text-4xl font-bold mb-4 ${PLAYER_COLORS[winner.id % PLAYER_COLORS.length].text} relative z-10 uppercase tracking-wider`}>{winner.name}</h2>
            <div className="text-2xl font-bold text-gray-200 mb-8 relative z-10">Avec {winner.score} pts</div>
            
            <div className="flex flex-col gap-4 relative z-10">
              <button onClick={resetGame} className={`w-full py-4 rounded-xl text-xl font-bold text-white shadow-lg active:scale-95 transition-transform ${PLAYER_COLORS[winner.id % PLAYER_COLORS.length].fill}`}>
                Rejouer
              </button>
              <Link href="/" className="w-full py-4 rounded-xl text-xl font-bold bg-gray-800 text-gray-300 shadow-lg active:scale-95 transition-transform border border-gray-700 block text-center">
                Menu Principal
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* EN-TÊTE ET BOUTON QUITTER */}
      <div className="w-full flex justify-between items-center mb-2 px-2 shrink-0">
        <Link href="/" className="text-gray-400 px-3 py-2 font-bold text-sm bg-gray-800 hover:bg-gray-700 transition-all rounded-lg">← Quitter</Link>
        <h1 className="text-xl font-bold text-white tracking-widest uppercase">Cricket</h1>
      </div>

      {/* =========================================
          NOUVEAU : CARTE DU JOUEUR ACTIF EN GROS
          ========================================= */}
      <div className={`w-full rounded-3xl p-5 mb-4 shadow-2xl relative overflow-hidden border-2 transition-all duration-500 ${currentTheme.headBg} ${currentTheme.border}`}>
        {/* Petit effet de brillance de fond */}
        <div className="absolute top-0 left-0 w-full h-full bg-white/5 pointer-events-none" />
        
        <div className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-1 text-center relative z-10">
          Au tour de
        </div>
        <h2 className={`text-4xl font-black text-center uppercase tracking-widest mb-4 transition-colors duration-300 ${currentTheme.text} drop-shadow-md relative z-10`}>
          {currentPlayer.name}
        </h2>
        
        {/* Fléchettes et Historique */}
        <div className="flex justify-center gap-4 w-full mx-auto relative z-10">
           {[0, 1, 2].map((idx) => (
             <div key={idx} className="flex-1 flex flex-col items-center gap-2">
               {/* Rond de fléchette */}
               <div className={`w-4 h-4 rounded-full shadow-md transition-colors duration-300 ${idx < dartsThrown ? currentTheme.fill : 'bg-gray-800 border-2 border-gray-600'}`} />
               {/* Score cliqué */}
               <div className="w-full text-center text-sm font-bold text-gray-200 bg-gray-900/60 rounded-lg py-1.5 h-8 flex items-center justify-center border border-gray-700/50 shadow-inner">
                 {currentThrows[idx] || '-'}
               </div>
             </div>
           ))}
        </div>
      </div>

      {/* TABLEAU DES SCORES */}
      <div className="w-full bg-gray-800 rounded-2xl p-2 mb-4 shadow-lg overflow-y-auto shrink border border-gray-700">
        <table className="w-full text-center table-fixed">
          <thead>
            <tr>
              <th className="w-1/5 pb-2 text-gray-500 font-bold text-sm uppercase">Cible</th>
              {players.map((p, idx) => {
                const isActive = idx === currentPlayerIndex;
                const pTheme = PLAYER_COLORS[idx % PLAYER_COLORS.length];
                return (
                  <th key={p.id} className={`pb-2 transition-colors duration-300 ${isActive ? `${pTheme.text}${pTheme.headBg} rounded-t-lg` : 'text-gray-400'}`}>
                    <div className="font-black text-sm">{p.name.replace('Joueur ', 'J')}</div>
                    <div className="text-xs font-normal">{p.score} pt</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {TARGETS.map(target => (
              <tr key={target} className="border-t border-gray-700/50">
                <td className="py-2 text-gray-300 font-bold bg-gray-900/30 rounded-l-lg">{target === 25 ? 'BULL' : target}</td>
                {players.map((p, idx) => {
                  const isActive = idx === currentPlayerIndex;
                  const pTheme = PLAYER_COLORS[idx % PLAYER_COLORS.length];
                  const isClosed = p.marks[target] === 3;
                  return (
                    <td key={p.id} className={`py-1 text-2xl font-black transition-colors duration-300 ${isActive ? pTheme.cellBg : ''} ${isClosed ? pTheme.text : 'text-gray-400'}`}>
                      {renderMark(p.marks[target])}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CLAVIER DE JEU */}
      <div className="w-full mb-2 px-1">
        <div className="flex gap-2 w-full mb-3">
          <button onClick={() => toggleMultiplier(2)} className={`flex-1 py-3 rounded-2xl text-lg font-bold transition-all ${multiplier === 2 ? 'bg-orange-500 text-white scale-105 shadow-lg shadow-orange-900/50' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>Double</button>
          <button onClick={() => toggleMultiplier(3)} className={`flex-1 py-3 rounded-2xl text-lg font-bold transition-all ${multiplier === 3 ? 'bg-red-500 text-white scale-105 shadow-lg shadow-red-900/50' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>Triple</button>
        </div>
        
        <div className="grid grid-cols-4 gap-2 w-full">
           {TARGETS.map((target) => (
             <button key={target} onClick={() => handleHit(target)} className="bg-gray-700 py-4 rounded-xl text-xl font-bold active:bg-gray-600 active:scale-95 text-white shadow-sm border border-gray-600/50">
               {target === 25 ? "25 (B)" : target}
             </button>
           ))}
           <button onClick={() => handleHit(0)} className="bg-gray-900 border border-gray-600 py-4 rounded-xl text-lg font-bold active:bg-gray-800 text-gray-400 shadow-sm">
             Miss (0)
           </button>
        </div>
      </div>
    </div>
  );
}

export default function CricketGame() {
  return (
    <main 
      className="flex flex-col items-center justify-center min-h-screen text-white p-2 select-none bg-cover bg-center bg-fixed"
      style={{ backgroundImage: "url('/fond.jpeg')" }}
    >
      <Suspense fallback={<div className="text-xl font-bold text-green-900 animate-pulse">Chargement du Cricket...</div>}>
        <CricketLogic />
      </Suspense>
    </main>
  );
}