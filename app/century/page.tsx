"use client";
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const PLAYER_COLORS = [
  { text: 'text-blue-400', fill: 'bg-blue-500', btn: 'bg-blue-600 active:bg-blue-500', border: 'border-blue-500/30', headBg: 'bg-blue-900/40' },
  { text: 'text-green-400', fill: 'bg-green-500', btn: 'bg-green-600 active:bg-green-500', border: 'border-green-500/30', headBg: 'bg-green-900/40' },
  { text: 'text-yellow-400', fill: 'bg-yellow-500', btn: 'bg-yellow-600 active:bg-yellow-500', border: 'border-yellow-500/30', headBg: 'bg-yellow-900/40' },
  { text: 'text-red-400', fill: 'bg-red-500', btn: 'bg-red-600 active:bg-red-500', border: 'border-red-500/30', headBg: 'bg-red-900/40' },
];

type Player = { id: number; name: string; score: number };
const NUMBERS = [20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 25];

function CenturyLogic() {
  const searchParams = useSearchParams();
  const numPlayers = parseInt(searchParams.get('players') || '2');
  const namesParam = searchParams.get('names');
  const customNames = namesParam ? namesParam.split(',').map(n => decodeURIComponent(n)) : [];

  const [players, setPlayers] = useState<Player[]>(() => 
    Array.from({ length: numPlayers }, (_, i) => ({
      id: i,
      name: customNames[i] || `Joueur ${i + 1}`,
      score: 0,
    }))
  );
  
  const [currentTurn, setCurrentTurn] = useState(0);
  const [dartsThrown, setDartsThrown] = useState(0);
  const [multiplier, setMultiplier] = useState<1 | 2 | 3>(1);
  const [currentThrows, setCurrentThrows] = useState<string[]>([]);
  
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [turnStartScore, setTurnStartScore] = useState(0);
  
  const currentPlayerIndex = currentTurn % numPlayers;
  const currentRound = Math.floor(currentTurn / numPlayers) + 1;
  const isGameOver = currentTurn >= numPlayers * 3;

  const announce = (text: string) => {
    if (!voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = 'fr-FR'; 
    msg.rate = 1; 
    window.speechSynthesis.speak(msg);
  };

  const sortedPlayersByClosest = [...players].sort((a, b) => {
    const aValid = a.score <= 100;
    const bValid = b.score <= 100;

    if (aValid && !bValid) return -1;
    if (!aValid && bValid) return 1;
    if (aValid && bValid) return b.score - a.score;
    return a.score - b.score;
  });
  
  const winner = isGameOver ? sortedPlayersByClosest[0] : null;

  const resetGame = () => {
    setPlayers(Array.from({ length: numPlayers }, (_, i) => ({
      id: i,
      name: customNames[i] || `Joueur ${i + 1}`,
      score: 0,
    })));
    setCurrentTurn(0);
    setDartsThrown(0);
    setMultiplier(1);
    setCurrentThrows([]);
    setTurnStartScore(0);
  };

  const handleScore = (val: number) => {
    if (isGameOver || dartsThrown >= 3) return;

    if (val === 25 && multiplier === 3) {
      alert("Le Triple Bull n'existe pas !");
      setMultiplier(1);
      return;
    }

    const actualStartScore = dartsThrown === 0 ? players[currentPlayerIndex].score : turnStartScore;
    if (dartsThrown === 0) setTurnStartScore(actualStartScore);

    const hitStr = val === 0 ? '0' : (multiplier === 3 ? `T${val}` : multiplier === 2 ? `D${val}` : `${val}`);
    setCurrentThrows((prev) => [...prev, hitStr]);

    const points = val * multiplier; 
    
    const newPlayers = JSON.parse(JSON.stringify(players));
    const p = newPlayers[currentPlayerIndex];
    const newScore = p.score + points; 
    
    p.score = newScore;
    
    setPlayers(newPlayers);
    setMultiplier(1);

    const newCount = dartsThrown + 1;
    setDartsThrown(newCount);

    if (newCount >= 3) {
      const isNowGameOver = currentTurn + 1 >= numPlayers * 3;
      
      if (isNowGameOver) {
        const finalSorted = [...newPlayers].sort((a, b) => {
          const aValid = a.score <= 100;
          const bValid = b.score <= 100;
          if (aValid && !bValid) return -1;
          if (!aValid && bValid) return 1;
          if (aValid && bValid) return b.score - a.score;
          return a.score - b.score;
        });
        announce(`Fin du jeu ! Victoire de ${finalSorted[0].name} !`);
      } else {
        if (newScore > actualStartScore) {
          if (newScore > 100) {
            announce(`${newScore} points. Dépassé !`);
          } else if (newScore === 100) {
            announce(`100 points ! Parfait !`);
          } else {
            // AJOUT ICI : Annonce du score et de ce qu'il reste
            const remaining = 100 - newScore;
            announce(`${newScore} points. Reste ${remaining}.`);
          }
        }
      }

      setTimeout(() => {
        setCurrentTurn(prev => prev + 1);
        setDartsThrown(0);
        setCurrentThrows([]);
      }, 1200);
    }
  };

  const toggleMultiplier = (mod: 2 | 3) => {
    setMultiplier((prev) => (prev === mod ? 1 : mod));
  };

  const currentPlayer = players[currentPlayerIndex] || players[0];
  const currentTheme = PLAYER_COLORS[currentPlayerIndex % PLAYER_COLORS.length] || PLAYER_COLORS[0];
  const displayRound = Math.min(currentRound, 3);

  return (
    <div className="w-full max-w-md flex flex-col items-center relative pb-6 overflow-hidden">
      
      {/* OVERLAY DE VICTOIRE / FIN DE PARTIE */}
      {isGameOver && winner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md ${PLAYER_COLORS[winner.id % PLAYER_COLORS.length].headBg} border-2 ${PLAYER_COLORS[winner.id % PLAYER_COLORS.length].border} rounded-3xl p-6 text-center shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-300`}>
            <div className="absolute top-0 left-0 w-full h-full bg-white/5 animate-pulse pointer-events-none" />
            
            <h1 className="text-4xl font-black text-white mb-2 relative z-10 drop-shadow-md">FIN DU JEU !</h1>
            <h2 className={`text-3xl font-bold mb-2 ${PLAYER_COLORS[winner.id % PLAYER_COLORS.length].text} relative z-10`}>
              {winner.name} gagne !
            </h2>
            <div className="text-xl font-bold text-gray-300 mb-6 relative z-10">Avec {winner.score} pts</div>
            
            <div className="bg-gray-900/60 rounded-xl p-4 mb-6 relative z-10 border border-gray-700/50">
              <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-widest">Classement Final</h3>
              <div className="flex flex-col gap-3">
                {sortedPlayersByClosest.map((p, index) => {
                  const pTheme = PLAYER_COLORS[p.id % PLAYER_COLORS.length];
                  const isWinner = winner.id === p.id;
                  const diff = Math.abs(p.score - 100);
                  
                  let diffText = "";
                  if (p.score === 100) diffText = "Pile 100 !";
                  else if (p.score < 100) diffText = `Il te reste : ${diff}`;
                  else diffText = `Dépassé de : ${diff}`;
                  
                  return (
                    <div key={p.id} className="flex justify-between items-center text-lg bg-gray-800/50 px-3 py-2 rounded-lg">
                      <span className={`font-bold ${pTheme.text}`}>
                        <span className="text-gray-500 mr-2 text-sm">{index + 1}.</span> {p.name}
                      </span>
                      <span className={`font-black flex flex-col items-end leading-none ${isWinner ? 'text-white' : 'text-gray-300'}`}>
                        {p.score} 
                        <span className={`text-[10px] font-bold mt-1 uppercase tracking-wider ${p.score > 100 ? 'text-red-400/80' : 'text-gray-400'}`}>
                          ({diffText})
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="flex flex-col gap-3 relative z-10">
              <button onClick={resetGame} className={`w-full py-4 rounded-xl text-xl font-bold text-white shadow-lg active:scale-95 transition-transform ${PLAYER_COLORS[winner.id % PLAYER_COLORS.length].fill}`}>Rejouer</button>
              <Link href="/" className="w-full py-4 rounded-xl text-xl font-bold bg-gray-800 text-gray-300 shadow-lg active:scale-95 transition-transform border border-gray-700 block text-center">Menu Principal</Link>
            </div>
          </div>
        </div>
      )}

      {/* EN-TÊTE DU JEU ET BOUTON SON */}
      <div className="w-full flex justify-between items-center mb-4 px-1">
        <Link href="/" className="text-gray-400 px-3 py-2 font-bold text-sm bg-gray-800 hover:bg-gray-700 transition-all rounded-lg">← Quitter</Link>
        <div className="flex flex-col items-center">
          <h1 className="text-xl font-bold text-white tracking-widest uppercase">CENTURY</h1>
          <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest bg-purple-900/30 px-2 py-0.5 rounded-full mt-1">
            Round {displayRound}/3
          </span>
        </div>
        <button 
          onClick={() => setVoiceEnabled(!voiceEnabled)} 
          className="text-gray-300 px-3 py-1 bg-gray-800 hover:bg-gray-700 transition-all rounded-lg text-lg border border-gray-700"
          title={voiceEnabled ? "Désactiver la voix" : "Activer la voix"}
        >
          {voiceEnabled ? '🔊' : '🔇'}
        </button>
      </div>

      {/* JOUEUR ACTIF */}
      <div className={`w-full bg-gray-800 rounded-3xl p-5 mb-3 text-center shadow-lg relative border-2 transition-colors duration-300 ${currentTheme.border}`}>
         <h2 className={`text-2xl font-bold mb-4 transition-colors duration-300 ${currentTheme.text}`}>{currentPlayer.name}</h2>
         
         <div className="flex justify-center gap-4 w-3/4 mx-auto mb-4">
             {[0, 1, 2].map((idx) => (
               <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                 <div className={`w-3 h-3 rounded-full transition-colors duration-300 ${idx < dartsThrown ? currentTheme.fill : 'bg-gray-600'}`} />
                 <div className="w-full text-center text-sm font-bold text-gray-300 bg-gray-900/40 rounded-md py-1 h-7 flex items-center justify-center border border-gray-700/30 shadow-inner">
                   {currentThrows[idx] || '-'}
                 </div>
               </div>
             ))}
         </div>

         <div className="text-7xl font-black mb-1 tracking-tighter text-white">{currentPlayer.score}</div>
         <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Objectif : 100 pts</div>
      </div>

      {/* ADVERSAIRES */}
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
      
      {/* CLAVIER */}
      <div className="flex gap-2 w-full mb-3 px-1">
        <button onClick={() => toggleMultiplier(2)} className={`flex-1 py-3 rounded-2xl text-lg font-bold transition-all ${multiplier === 2 ? 'bg-orange-500 text-white scale-105' : 'bg-gray-800 text-gray-400'}`}>Double</button>
        <button onClick={() => toggleMultiplier(3)} className={`flex-1 py-3 rounded-2xl text-lg font-bold transition-all ${multiplier === 3 ? 'bg-red-500 text-white scale-105' : 'bg-gray-800 text-gray-400'}`}>Triple</button>
      </div>

      <div className="grid grid-cols-4 gap-2 w-full mb-4 px-1">
         {NUMBERS.map((val) => (
           <button key={val} onClick={() => handleScore(val)} className={`py-3 rounded-xl text-xl font-bold active:scale-95 transition-colors duration-300 text-white shadow-sm ${currentTheme.btn}`}>
             {val}
           </button>
         ))}
         <button onClick={() => handleScore(0)} className="bg-gray-800 border border-gray-600 py-3 rounded-xl text-xl font-bold col-span-3 text-gray-400 active:bg-gray-700 shadow-sm transition-all">
           Miss (0)
         </button>
      </div>
    </div>
  );
}

export default function CenturyGame() {
  return (
    <main 
      className="flex flex-col items-center justify-center min-h-screen text-white p-2 select-none overflow-hidden bg-cover bg-center bg-fixed"
      style={{ backgroundImage: "url('/fond.jpeg')" }}
    >
      <Suspense fallback={<div className="text-xl font-bold text-purple-900 animate-pulse">Chargement de la partie...</div>}>
        <CenturyLogic />
      </Suspense>
    </main>
  );
}