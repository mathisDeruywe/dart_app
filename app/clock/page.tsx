"use client";
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

// Les couleurs classiques pour différencier les joueurs
const PLAYER_COLORS = [
  { text: 'text-blue-400', fill: 'bg-blue-500', btn: 'bg-blue-600 active:bg-blue-500', border: 'border-blue-500/30', headBg: 'bg-blue-900/40' },
  { text: 'text-green-400', fill: 'bg-green-500', btn: 'bg-green-600 active:bg-green-500', border: 'border-green-500/30', headBg: 'bg-green-900/40' },
  { text: 'text-yellow-400', fill: 'bg-yellow-500', btn: 'bg-yellow-600 active:bg-yellow-500', border: 'border-yellow-500/30', headBg: 'bg-yellow-900/40' },
  { text: 'text-red-400', fill: 'bg-red-500', btn: 'bg-red-600 active:bg-red-500', border: 'border-red-500/30', headBg: 'bg-red-900/40' },
];

// L'ordre des cibles à toucher (de 1 à 20, puis Bull)
const SEQUENCE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25];

type Player = { id: number; name: string; targetIndex: number };

function ClockLogic() {
  const searchParams = useSearchParams();
  const numPlayers = parseInt(searchParams.get('players') || '2');
  const clockMode = searchParams.get('mode') || 'normal'; // 'normal', 'double', 'triple'
  
  const namesParam = searchParams.get('names');
  const customNames = namesParam ? namesParam.split(',').map(n => decodeURIComponent(n)) : [];

  const [players, setPlayers] = useState<Player[]>(() => 
    Array.from({ length: numPlayers }, (_, i) => ({
      id: i,
      name: customNames[i] || `Joueur ${i + 1}`,
      targetIndex: 0, 
    }))
  );
  
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [dartsThrown, setDartsThrown] = useState(0);
  const [multiplier, setMultiplier] = useState<1 | 2 | 3>(1);
  const [currentThrows, setCurrentThrows] = useState<string[]>([]);
  
  const [winnerId, setWinnerId] = useState<number | null>(null);
  const winner = winnerId !== null ? players[winnerId] : null;

  // ==========================================
  // SYSTÈME AUDIO & GESTION DES VOIX
  // ==========================================
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');

  useEffect(() => {
    const loadVoices = () => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      const availableVoices = window.speechSynthesis.getVoices();
      let frVoices = availableVoices.filter(v => v.lang.startsWith('fr'));
      if (frVoices.length === 0) frVoices = availableVoices; 
      setVoices(frVoices);
      if (frVoices.length > 0 && !selectedVoiceURI) setSelectedVoiceURI(frVoices[0].voiceURI);
    };
    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.onvoiceschanged = loadVoices;
  }, [selectedVoiceURI]);

  const announce = (text: string) => {
    if (!voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = 'fr-FR'; 
    msg.rate = 1.1; 
    if (selectedVoiceURI) {
      const chosenVoice = voices.find(v => v.voiceURI === selectedVoiceURI);
      if (chosenVoice) msg.voice = chosenVoice;
    }
    window.speechSynthesis.speak(msg);
  };
  // ==========================================

  const resetGame = () => {
    setPlayers(Array.from({ length: numPlayers }, (_, i) => ({
      id: i,
      name: customNames[i] || `Joueur ${i + 1}`,
      targetIndex: 0,
    })));
    setCurrentPlayerIndex(0);
    setDartsThrown(0);
    setMultiplier(1);
    setCurrentThrows([]);
    setWinnerId(null);
  };

  const handleScore = (val: number) => {
    if (winnerId !== null || dartsThrown >= 3) return;

    if (val === 25 && multiplier === 3) {
      alert("Le Triple Bull (3x25) n'existe pas !");
      setMultiplier(1);
      return;
    }

    const currentPlayer = players[currentPlayerIndex];
    const targetToHit = SEQUENCE[currentPlayer.targetIndex];
    let isHit = false;

    if (val === targetToHit) {
      if (clockMode === 'normal') {
        isHit = true;
      } else if (clockMode === 'double') {
        isHit = (multiplier === 2);
      } else if (clockMode === 'triple') {
        if (val === 25) isHit = (multiplier === 2);
        else isHit = (multiplier === 3);
      }
    }

    let didWin = false;
    let newIndex = currentPlayer.targetIndex;
    
    if (isHit) {
      newIndex += 1;
      if (newIndex >= SEQUENCE.length) didWin = true;
    }

    const hitStr = val === 0 ? '0' : (multiplier === 3 ? `T${val}` : multiplier === 2 ? `D${val}` : `${val}`);
    setCurrentThrows((prev) => [...prev, isHit ? `${hitStr} ✔` : hitStr]);

    const newPlayers = JSON.parse(JSON.stringify(players));
    newPlayers[currentPlayerIndex].targetIndex = newIndex;
    
    setPlayers(newPlayers);
    setMultiplier(1);

    const newCount = dartsThrown + 1;
    setDartsThrown(newCount);

    if (didWin) {
      setWinnerId(currentPlayerIndex);
      announce(`Victoire de ${newPlayers[currentPlayerIndex].name} !`);
      return;
    }

    if (newCount >= 3) {
      const nextPlayerIdx = (currentPlayerIndex + 1) % players.length;
      const nextTarget = SEQUENCE[newPlayers[nextPlayerIdx].targetIndex];
      const targetName = nextTarget === 25 ? 'Centre' : nextTarget;
      
      announce(`Au tour de ${newPlayers[nextPlayerIdx].name}. Vise le ${targetName}`);
      
      setTimeout(() => {
        setCurrentPlayerIndex(nextPlayerIdx);
        setDartsThrown(0);
        setCurrentThrows([]);
      }, 1200);
    } else {
      if (isHit) {
        const nextTarget = SEQUENCE[newIndex];
        const targetName = nextTarget === 25 ? 'Centre' : nextTarget;
        announce(`Vise le ${targetName}`);
      }
    }
  };

  const toggleMultiplier = (mod: 2 | 3) => {
    setMultiplier((prev) => (prev === mod ? 1 : mod));
  };

  const currentPlayer = players[currentPlayerIndex];
  const currentTheme = PLAYER_COLORS[currentPlayerIndex % PLAYER_COLORS.length];
  const targetNumber = SEQUENCE[currentPlayer.targetIndex];

  return (
    <div className="w-full max-w-md flex flex-col items-center relative pb-6 overflow-hidden">
      
      {/* OVERLAY DE VICTOIRE */}
      {winner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md ${PLAYER_COLORS[winner.id % PLAYER_COLORS.length].headBg} border-2 ${PLAYER_COLORS[winner.id % PLAYER_COLORS.length].border} rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-300`}>
            <div className="absolute top-0 left-0 w-full h-full bg-white/5 animate-pulse pointer-events-none" />
            <h1 className="text-5xl font-black text-white mb-2 relative z-10 drop-shadow-md">VICTOIRE !</h1>
            <h2 className={`text-3xl font-bold mb-8 ${PLAYER_COLORS[winner.id % PLAYER_COLORS.length].text} relative z-10`}>{winner.name}</h2>
            
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

      {/* EN-TÊTE ET SÉLECTEUR DE VOIX */}
      <div className="w-full flex justify-between items-center mb-2 px-2 shrink-0">
        <Link href="/" className="text-gray-400 px-3 py-2 font-bold text-sm bg-gray-800 hover:bg-gray-700 transition-all rounded-lg">← Quitter</Link>
        <div className="flex flex-col items-center">
          <h1 className="text-xl font-bold text-white tracking-widest uppercase">HORLOGE</h1>
          <span className="text-[10px] font-black text-teal-400 uppercase tracking-widest bg-teal-900/30 px-2 py-0.5 rounded-full mt-1">
            Mode {clockMode}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          {voiceEnabled && voices.length > 0 && (
            <select 
              value={selectedVoiceURI} 
              onChange={(e) => setSelectedVoiceURI(e.target.value)}
              className="bg-gray-800 text-gray-300 text-[10px] rounded-lg border border-gray-700 p-1 w-20 truncate focus:outline-none"
            >
              {voices.map(v => (
                <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>
              ))}
            </select>
          )}
          <button 
            onClick={() => setVoiceEnabled(!voiceEnabled)} 
            className="text-gray-300 px-2 py-1 bg-gray-800 hover:bg-gray-700 transition-all rounded-lg text-lg border border-gray-700"
            title={voiceEnabled ? "Désactiver la voix" : "Activer la voix"}
          >
            {voiceEnabled ? '🔊' : '🔇'}
          </button>
        </div>
      </div>

      {/* CARTE DU JOUEUR ACTIF */}
      <div className={`w-full rounded-3xl p-5 mb-4 shadow-2xl relative overflow-hidden border-2 transition-all duration-500 ${currentTheme.headBg} ${currentTheme.border}`}>
        <div className="absolute top-0 left-0 w-full h-full bg-white/5 pointer-events-none" />
        
        <div className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-1 text-center relative z-10">
          Au tour de
        </div>
        <h2 className={`text-4xl font-black text-center uppercase tracking-widest mb-6 transition-colors duration-300 ${currentTheme.text} drop-shadow-md relative z-10`}>
          {currentPlayer.name}
        </h2>
        
        <div className="flex flex-col items-center mb-6 relative z-10">
           <span className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Cible à viser</span>
           <div className="text-7xl font-black text-white drop-shadow-lg">
             {targetNumber === 25 ? 'BULL' : targetNumber}
           </div>
           <span className="text-xs font-bold text-gray-500 mt-2">
             Progression : {currentPlayer.targetIndex} / 21
           </span>
        </div>
        
        <div className="flex justify-center gap-4 w-full mx-auto relative z-10">
           {[0, 1, 2].map((idx) => {
             const isHitStr = currentThrows[idx]?.includes('✔');
             return (
               <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                 <div className={`w-4 h-4 rounded-full shadow-md transition-colors duration-300 ${idx < dartsThrown ? currentTheme.fill : 'bg-gray-800 border-2 border-gray-600'}`} />
                 <div className={`w-full text-center text-sm font-bold bg-gray-900/60 rounded-lg py-1.5 h-8 flex items-center justify-center border shadow-inner ${isHitStr ? 'text-green-400 border-green-500/50' : 'text-gray-200 border-gray-700/50'}`}>
                   {currentThrows[idx] ? currentThrows[idx].replace(' ✔', '') : '-'}
                 </div>
               </div>
             );
           })}
        </div>
      </div>

      {/* ADVERSAIRES */}
      {players.length > 1 && (
        <div className="flex gap-2 w-full mb-4 overflow-x-auto px-1">
          {players.map((p, idx) => {
            if (idx === currentPlayerIndex) return null; 
            return (
              <div key={p.id} className="flex-1 bg-gray-800/80 rounded-2xl p-2 text-center border border-gray-700/50 relative">
                <div className="text-[11px] text-gray-400 font-bold truncate uppercase mt-1">{p.name}</div>
                <div className="text-lg font-black text-gray-300 mt-1">Cible : <span className="text-white">{SEQUENCE[p.targetIndex] === 25 ? 'BULL' : SEQUENCE[p.targetIndex]}</span></div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* NOUVEAU CLAVIER SIMPLIFIÉ */}
      <div className="w-full mb-2 px-1">
        
        {/* Ligne des multiplicateurs (utile pour les modes Double et Triple) */}
        {(clockMode === 'double' || clockMode === 'triple') && (
          <div className="flex gap-2 w-full mb-3">
            <button onClick={() => toggleMultiplier(2)} className={`flex-1 py-3 rounded-2xl text-lg font-bold transition-all ${multiplier === 2 ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/50' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>Double</button>
            <button onClick={() => toggleMultiplier(3)} className={`flex-1 py-3 rounded-2xl text-lg font-bold transition-all ${multiplier === 3 ? 'bg-red-500 text-white shadow-lg shadow-red-900/50' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>Triple</button>
          </div>
        )}

        <div className="flex gap-3 w-full">
           <button 
             onClick={() => handleScore(targetNumber)} 
             className={`flex-[2] py-6 rounded-2xl text-2xl font-black active:scale-95 transition-all text-white shadow-xl border border-white/10 ${currentTheme.btn}`}
           >
             ✅ {targetNumber === 25 ? "CENTRE" : targetNumber}
           </button>
           <button 
             onClick={() => handleScore(0)} 
             className="flex-1 bg-gray-900 border-2 border-gray-600 py-6 rounded-2xl text-xl font-bold active:bg-gray-800 text-gray-400 shadow-sm active:scale-95 transition-all"
           >
             ❌ RATÉ
           </button>
        </div>
      </div>
    </div>
  );
}

export default function ClockGame() {
  return (
    <main 
      className="flex flex-col items-center justify-center min-h-screen text-white p-2 select-none bg-cover bg-center bg-fixed"
      style={{ backgroundImage: "url('/fond.jpeg')" }}
    >
      <Suspense fallback={<div className="text-xl font-bold text-teal-400 animate-pulse">Chargement de la partie...</div>}>
        <ClockLogic />
      </Suspense>
    </main>
  );
}