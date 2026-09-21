"use client";
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const PLAYER_COLORS = [
  { text: 'text-blue-400', fill: 'bg-blue-500', btn: 'bg-blue-600 active:bg-blue-500', border: 'border-blue-500/30', headBg: 'bg-blue-900/40' },
  { text: 'text-green-400', fill: 'bg-green-500', btn: 'bg-green-600 active:bg-green-500', border: 'border-green-500/30', headBg: 'bg-green-900/40' },
  { text: 'text-yellow-400', fill: 'bg-yellow-500', btn: 'bg-yellow-600 active:bg-yellow-500', border: 'border-yellow-500/30', headBg: 'bg-yellow-900/40' },
  { text: 'text-red-400', fill: 'bg-red-500', btn: 'bg-red-600 active:bg-red-500', border: 'border-red-500/30', headBg: 'bg-red-900/40' },
];

type Player = { id: number; name: string; score: number; turnBaseScore: number };
const NUMBERS = [20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 25];

function X01Logic() {
  const searchParams = useSearchParams();
  const numPlayers = parseInt(searchParams.get('players') || '2');
  const startingScore = parseInt(searchParams.get('score') || '301');
  
  const namesParam = searchParams.get('names');
  const customNames = namesParam ? namesParam.split(',').map(n => decodeURIComponent(n)) : [];

  const [players, setPlayers] = useState<Player[]>(() => 
    Array.from({ length: numPlayers }, (_, i) => ({
      id: i,
      name: customNames[i] || `Joueur ${i + 1}`,
      score: startingScore,
      turnBaseScore: startingScore,
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
      
      if (frVoices.length > 0 && !selectedVoiceURI) {
        setSelectedVoiceURI(frVoices[0].voiceURI);
      }
    };

    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [selectedVoiceURI]);

  const announce = (text: string) => {
    if (!voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = 'fr-FR';
    msg.rate = 1; 
    
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
      score: startingScore,
      turnBaseScore: startingScore,
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

    const points = val * multiplier; 
    const currentPlayer = players[currentPlayerIndex];
    const remaining = currentPlayer.score - points;
    
    let newScore = currentPlayer.score;
    let isBust = false;
    let didWin = false;

    if (remaining > 1) {
      newScore = remaining;
    } else if (remaining === 0) {
      if (multiplier === 2) {
        newScore = 0;
        didWin = true;
      } else {
        isBust = true;
        newScore = currentPlayer.turnBaseScore;
      }
    } else {
      isBust = true;
      newScore = currentPlayer.turnBaseScore;
    }

    if (isBust && !didWin && remaining !== 0) {
      alert(`Bust ! Score dépassé. Retour à ${currentPlayer.turnBaseScore}.`);
    } else if (isBust && remaining === 0) {
      alert("Bust ! Tu dois obligatoirement finir par un Double.");
    } else if (isBust && remaining === 1) {
      alert("Bust ! Il te reste 1 point, c'est impossible de finir par un Double.");
    }

    const hitStr = val === 0 ? '0' : (multiplier === 3 ? `T${val}` : multiplier === 2 ? `D${val}` : `${val}`);
    setCurrentThrows((prev) => [...prev, hitStr]);

    setPlayers((prev) => {
      const newPlayers = JSON.parse(JSON.stringify(prev));
      newPlayers[currentPlayerIndex].score = newScore;
      return newPlayers;
    });

    setMultiplier(1);

    if (didWin) {
      setDartsThrown(dartsThrown + 1); 
      setWinnerId(currentPlayerIndex);
      announce(`${currentPlayer.name} a gagné la partie!`);
      return;
    }

    const newCount = isBust ? 3 : dartsThrown + 1;
    setDartsThrown(newCount);

    if (newCount >= 3) {
      if (isBust) {
        announce("Bust ! Il te reste " + currentPlayer.turnBaseScore);
      } else {
        announce("Il te reste " + newScore);
      }

      setTimeout(() => {
        setPlayers((currentPlayers) => {
           const updatedPlayers = JSON.parse(JSON.stringify(currentPlayers));
           return updatedPlayers.map((player: Player) => ({ ...player, turnBaseScore: player.score }));
        });
        setCurrentPlayerIndex((i) => (i + 1) % players.length);
        setDartsThrown(0);
        setCurrentThrows([]);
      }, 1200);
    }
  };

  const toggleMultiplier = (mod: 2 | 3) => {
    setMultiplier((prev) => (prev === mod ? 1 : mod));
  };

  const currentPlayer = players[currentPlayerIndex];
  const currentTheme = PLAYER_COLORS[currentPlayerIndex % PLAYER_COLORS.length];

  return (
    <div className="w-full max-w-md flex flex-col items-center relative">
      
      {/* OVERLAY DE VICTOIRE */}
      {winner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md ${PLAYER_COLORS[winner.id % PLAYER_COLORS.length].headBg} border-2 ${PLAYER_COLORS[winner.id % PLAYER_COLORS.length].border} rounded-3xl p-6 text-center shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-300`}>
            <div className="absolute top-0 left-0 w-full h-full bg-white/5 animate-pulse pointer-events-none" />
            <h1 className="text-4xl font-black text-white mb-2 relative z-10 drop-shadow-md">VICTOIRE !</h1>
            <h2 className={`text-3xl font-bold mb-6 ${PLAYER_COLORS[winner.id % PLAYER_COLORS.length].text} relative z-10`}>
              {winner.name}
            </h2>
            <div className="bg-gray-900/60 rounded-xl p-4 mb-6 relative z-10 border border-gray-700/50">
              <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-widest">Scores Finaux</h3>
              <div className="flex flex-col gap-3">
                {players.map((p, idx) => {
                  const pTheme = PLAYER_COLORS[idx % PLAYER_COLORS.length];
                  const isWinner = p.score === 0;
                  return (
                    <div key={p.id} className="flex justify-between items-center text-lg bg-gray-800/50 px-3 py-2 rounded-lg">
                      <span className={`font-bold ${pTheme.text}`}>{p.name}</span>
                      <span className={`font-black ${isWinner ? 'text-white' : 'text-gray-300'}`}>
                        {p.score} <span className="text-xs font-normal text-gray-500">pts</span>
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

      {/* EN-TÊTE DU JEU ET SÉLECTEUR DE VOIX */}
      <div className="w-full flex justify-between items-center mb-4 px-1">
        <Link href="/" className="text-gray-400 px-3 py-2 font-bold text-sm bg-gray-800 hover:bg-gray-700 transition-all rounded-lg">← Quitter</Link>
        <h1 className="text-xl font-bold text-white tracking-widest uppercase">x01 - {startingScore}</h1>
        
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
      </div>

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

export default function X01Game() {
  return (
    <main 
      className="flex flex-col items-center justify-center min-h-screen text-white p-2 select-none overflow-hidden bg-cover bg-center bg-fixed"
      style={{ backgroundImage: "url('/fond.jpeg')" }}
    >
      <Suspense fallback={<div className="text-xl font-bold text-blue-900 animate-pulse">Chargement de la partie...</div>}>
        <X01Logic />
      </Suspense>
    </main>
  );
}