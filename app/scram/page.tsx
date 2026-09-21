"use client";
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const TARGETS = [20, 19, 18, 17, 16, 15, 25];

const PLAYER_COLORS = [
  { text: 'text-blue-400', fill: 'bg-blue-500', btn: 'bg-blue-600 active:bg-blue-500', headBg: 'bg-blue-900/60', cellBg: 'bg-blue-900/20', border: 'border-blue-500/30', winBg: 'bg-blue-900/40' },
  { text: 'text-green-400', fill: 'bg-green-500', btn: 'bg-green-600 active:bg-green-500', headBg: 'bg-green-900/60', cellBg: 'bg-green-900/20', border: 'border-green-500/30', winBg: 'bg-green-900/40' },
  { text: 'text-yellow-400', fill: 'bg-yellow-500', btn: 'bg-yellow-600 active:bg-yellow-500', headBg: 'bg-yellow-900/60', cellBg: 'bg-yellow-900/20', border: 'border-yellow-500/30', winBg: 'bg-yellow-900/40' },
  { text: 'text-red-400', fill: 'bg-red-500', btn: 'bg-red-600 active:bg-red-500', headBg: 'bg-red-900/60', cellBg: 'bg-red-900/20', border: 'border-red-500/30', winBg: 'bg-red-900/40' },
];

type Player = { id: number; name: string; score: number };

function ScramLogic() {
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

  const [inning, setInning] = useState(0); 
  const [turnInInning, setTurnInInning] = useState(0); 
  const [dartsThrown, setDartsThrown] = useState(0);
  const [multiplier, setMultiplier] = useState<1 | 2 | 3>(1);
  const [currentThrows, setCurrentThrows] = useState<string[]>([]);
  
  const [boardMarks, setBoardMarks] = useState<Record<number, number>>({ 20: 0, 19: 0, 18: 0, 17: 0, 16: 0, 15: 0, 25: 0 });
  const [isGameOver, setIsGameOver] = useState(false);

  // NOUVEAU : États pour le système audio
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [turnStartScore, setTurnStartScore] = useState(0);

  const stopperId = inning;
  const activePlayerIndex = (inning + turnInInning) % numPlayers;
  const isStopper = activePlayerIndex === stopperId;

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const winner = isGameOver ? sortedPlayers[0] : null;

  // NOUVEAU : Fonction d'annonce audio
  const announce = (text: string) => {
    if (!voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = 'fr-FR'; 
    msg.rate = 1.1; 
    window.speechSynthesis.speak(msg);
  };

  const resetGame = () => {
    setPlayers(Array.from({ length: numPlayers }, (_, i) => ({
      id: i,
      name: customNames[i] || `Joueur ${i + 1}`,
      score: 0,
    })));
    setInning(0);
    setTurnInInning(0);
    setDartsThrown(0);
    setMultiplier(1);
    setCurrentThrows([]);
    setBoardMarks({ 20: 0, 19: 0, 18: 0, 17: 0, 16: 0, 15: 0, 25: 0 });
    setIsGameOver(false);
    setTurnStartScore(0);
  };

  const handleScore = (val: number) => {
    if (isGameOver || dartsThrown >= 3) return;

    if (val === 25 && multiplier === 3) {
      alert("Le Triple Bull n'existe pas !");
      setMultiplier(1);
      return;
    }

    // Capture le score du joueur actif au début de son tour
    const actualStartScore = dartsThrown === 0 ? players[activePlayerIndex].score : turnStartScore;
    if (dartsThrown === 0) setTurnStartScore(actualStartScore);

    const hitStr = val === 0 ? '0' : (multiplier === 3 ? `T${val}` : multiplier === 2 ? `D${val}` : `${val}`);
    setCurrentThrows((prev) => [...prev, hitStr]);

    let inningEnded = false;
    let announcement = "";
    
    const localBoardMarks = { ...boardMarks };
    const newPlayers = JSON.parse(JSON.stringify(players));

    if (val !== 0) {
      if (isStopper) {
        // LE BLOQUEUR ferme les cibles
        const currentMarks = localBoardMarks[val];
        if (currentMarks < 3) {
          const marksToAdd = Math.min(3 - currentMarks, multiplier);
          localBoardMarks[val] += marksToAdd;
          
          // Vérification de la fermeture pour l'audio
          if (localBoardMarks[val] === 3) {
            const targetName = val === 25 ? "Bull" : val.toString();
            announcement = `Fermeture du ${targetName}`;
          }
          
          if (TARGETS.every(t => localBoardMarks[t] === 3)) {
            inningEnded = true;
          }
        }
      } else {
        // LES SCOREURS gagnent des points sur les cibles ouvertes
        if (localBoardMarks[val] < 3) {
          newPlayers[activePlayerIndex].score += val * multiplier;
        }
      }
    }

    setBoardMarks(localBoardMarks);
    setPlayers(newPlayers);
    setMultiplier(1);
    
    const newCount = dartsThrown + 1;
    setDartsThrown(newCount);

    const finalScore = newPlayers[activePlayerIndex].score;

    if (inningEnded) {
      // Si la manche est finie et que c'était la dernière
      if (inning + 1 >= numPlayers) {
        const sorted = [...newPlayers].sort((a: Player, b: Player) => b.score - a.score);
        announce(`Fin du jeu ! Victoire de ${sorted[0].name} !`);
      } else {
        let endAnnounce = announcement;
        if (endAnnounce) endAnnounce += ". ";
        endAnnounce += "Fin de la manche !";
        announce(endAnnounce);
      }

      setTimeout(() => {
        if (inning + 1 >= numPlayers) {
          setIsGameOver(true);
        } else {
          setInning(i => i + 1);
          setTurnInInning(0);
          setDartsThrown(0);
          setCurrentThrows([]);
          setBoardMarks({ 20: 0, 19: 0, 18: 0, 17: 0, 16: 0, 15: 0, 25: 0 });
        }
      }, 1200);

    } else if (newCount >= 3) {
      let endAnnouncement = announcement;
      
      // Si c'est un scoreur et qu'il a marqué, on annonce son score à la fin de ses 3 flèches
      if (!isStopper && finalScore > actualStartScore) {
        if (endAnnouncement) endAnnouncement += ". ";
        endAnnouncement += `${finalScore} points`;
      }
      
      if (endAnnouncement) announce(endAnnouncement);

      setTimeout(() => {
        setTurnInInning(t => t + 1);
        setDartsThrown(0);
        setCurrentThrows([]);
      }, 1200);
      
    } else {
      // Annonce la fermeture de cible en direct pendant le tour du bloqueur
      if (announcement) announce(announcement);
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

  const currentPlayer = players[activePlayerIndex];
  const currentTheme = PLAYER_COLORS[activePlayerIndex % PLAYER_COLORS.length];

  return (
    <div className="w-full max-w-md flex flex-col items-center relative pb-6 overflow-hidden">
      
      {/* =========================================
          OVERLAY DE VICTOIRE
          ========================================= */}
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
                {sortedPlayers.map((p, index) => {
                  const pTheme = PLAYER_COLORS[p.id % PLAYER_COLORS.length];
                  return (
                    <div key={p.id} className="flex justify-between items-center text-lg bg-gray-800/50 px-3 py-2 rounded-lg">
                      <span className={`font-bold ${pTheme.text}`}>
                        <span className="text-gray-500 mr-2 text-sm">{index + 1}.</span> {p.name}
                      </span>
                      <span className="font-black text-white">{p.score} <span className="text-xs font-normal text-gray-400">pts</span></span>
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

      {/* EN-TÊTE ET BOUTON SON */}
      <div className="w-full flex justify-between items-center mb-4 px-1">
        <Link href="/" className="text-gray-400 px-3 py-2 font-bold text-sm bg-gray-800 hover:bg-gray-700 transition-all rounded-lg">← Quitter</Link>
        <div className="flex flex-col items-center">
          <h1 className="text-xl font-bold text-white tracking-widest uppercase">SCRAM</h1>
          <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest bg-orange-900/30 px-2 py-0.5 rounded-full mt-1">
            Manche {inning + 1}/{numPlayers}
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
         <h2 className={`text-2xl font-bold mb-2 transition-colors duration-300 ${currentTheme.text}`}>{currentPlayer.name}</h2>
         
         <div className="mb-4">
           {isStopper ? (
               <span className="text-red-400 font-bold bg-red-900/30 px-3 py-1 rounded-full uppercase tracking-wider text-xs border border-red-500/30 shadow-inner">🎯 Bloqueur</span>
           ) : (
               <span className="text-green-400 font-bold bg-green-900/30 px-3 py-1 rounded-full uppercase tracking-wider text-xs border border-green-500/30 shadow-inner">📈 Scoreur</span>
           )}
         </div>
         
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
      </div>

      {/* GRILLE DES CIBLES COMMUNES */}
      <div className="w-full bg-gray-800 rounded-2xl p-3 mb-3 shadow-lg border border-gray-700">
        <div className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">État des cibles</div>
        
        <div className="grid grid-cols-4 gap-2 mb-2">
          {[20, 19, 18, 17].map(t => {
             const isClosed = boardMarks[t] === 3;
             return (
               <div key={t} className={`flex flex-col items-center p-1.5 rounded-xl border transition-colors ${isClosed ? 'bg-red-900/20 border-red-500/30' : 'bg-gray-900/50 border-gray-600/50'}`}>
                 <div className="text-[10px] font-bold text-gray-500">{t}</div>
                 <div className={`text-xl font-black h-7 flex items-center justify-center ${isClosed ? 'text-red-500' : 'text-gray-300'}`}>
                   {renderMark(boardMarks[t]) || '-'}
                 </div>
               </div>
             )
          })}
        </div>
        <div className="grid grid-cols-3 gap-2 w-3/4 mx-auto">
          {[16, 15, 25].map(t => {
             const isClosed = boardMarks[t] === 3;
             return (
               <div key={t} className={`flex flex-col items-center p-1.5 rounded-xl border transition-colors ${isClosed ? 'bg-red-900/20 border-red-500/30' : 'bg-gray-900/50 border-gray-600/50'}`}>
                 <div className="text-[10px] font-bold text-gray-500">{t === 25 ? 'BULL' : t}</div>
                 <div className={`text-xl font-black h-7 flex items-center justify-center ${isClosed ? 'text-red-500' : 'text-gray-300'}`}>
                   {renderMark(boardMarks[t]) || '-'}
                 </div>
               </div>
             )
          })}
        </div>
      </div>

      {/* ADVERSAIRES */}
      {players.length > 1 && (
        <div className="flex gap-2 w-full mb-4 overflow-x-auto px-1">
          {players.map((p, idx) => {
            if (idx === activePlayerIndex) return null; 
            const isPStopper = p.id === stopperId;
            return (
              <div key={p.id} className="flex-1 bg-gray-800/80 rounded-2xl p-2 text-center border border-gray-700/50 relative">
                {isPStopper && <div className="absolute top-1 right-2 text-[10px] bg-red-900/50 text-red-400 px-1 rounded">Bloqueur</div>}
                <div className="text-[11px] text-gray-400 font-bold truncate uppercase mt-2">{p.name}</div>
                <div className="text-lg font-black text-gray-300">{p.score}</div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* CLAVIER */}
      <div className="flex gap-2 w-full mb-2 px-1">
        <button onClick={() => toggleMultiplier(2)} className={`flex-1 py-3 rounded-2xl text-lg font-bold transition-all ${multiplier === 2 ? 'bg-orange-500 text-white scale-105 shadow-orange-900/50' : 'bg-gray-800 text-gray-400'}`}>Double</button>
        <button onClick={() => toggleMultiplier(3)} className={`flex-1 py-3 rounded-2xl text-lg font-bold transition-all ${multiplier === 3 ? 'bg-red-500 text-white scale-105 shadow-red-900/50' : 'bg-gray-800 text-gray-400'}`}>Triple</button>
      </div>

      <div className="grid grid-cols-4 gap-2 w-full px-1">
         {TARGETS.map((target) => (
           <button key={target} onClick={() => handleScore(target)} className={`py-3 rounded-xl text-xl font-bold active:scale-95 transition-colors duration-300 text-white shadow-sm border border-gray-600/50 ${currentTheme.btn}`}>
             {target === 25 ? "25 (B)" : target}
           </button>
         ))}
         <button onClick={() => handleScore(0)} className="bg-gray-900 border border-gray-600 py-3 rounded-xl text-xl font-bold col-span-3 text-gray-400 active:bg-gray-800 shadow-sm transition-all">
           Miss (0)
         </button>
      </div>
    </div>
  );
}

export default function ScramGame() {
  return (
    <main 
      className="flex flex-col items-center justify-center min-h-screen text-white p-2 select-none bg-cover bg-center bg-fixed"
      style={{ backgroundImage: "url('/fond.jpeg')" }}
    >
      <Suspense fallback={<div className="text-xl font-bold text-orange-400 animate-pulse">Chargement de la partie...</div>}>
        <ScramLogic />
      </Suspense>
    </main>
  );
}