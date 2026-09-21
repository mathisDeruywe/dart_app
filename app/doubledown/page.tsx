"use client";
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const PLAYER_COLORS = [
  { text: 'text-pink-400', fill: 'bg-pink-500', btn: 'bg-pink-600 active:bg-pink-500', border: 'border-pink-500/30', headBg: 'bg-pink-900/40' },
  { text: 'text-blue-400', fill: 'bg-blue-500', btn: 'bg-blue-600 active:bg-blue-500', border: 'border-blue-500/30', headBg: 'bg-blue-900/40' },
  { text: 'text-green-400', fill: 'bg-green-500', btn: 'bg-green-600 active:bg-green-500', border: 'border-green-500/30', headBg: 'bg-green-900/40' },
  { text: 'text-yellow-400', fill: 'bg-yellow-500', btn: 'bg-yellow-600 active:bg-yellow-500', border: 'border-yellow-500/30', headBg: 'bg-yellow-900/40' },
];

const TARGETS = ['15', '16', 'Double', '17', '18', 'Triple', '19', '20', 'Bull'];
const NUMBERS = [20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 25];

type Player = { id: number; name: string; score: number };

function DoubleDownLogic() {
  const searchParams = useSearchParams();
  const numPlayers = parseInt(searchParams.get('players') || '2');
  const namesParam = searchParams.get('names');
  const customNames = namesParam ? namesParam.split(',').map(n => decodeURIComponent(n)) : [];

  const [players, setPlayers] = useState<Player[]>(() => 
    Array.from({ length: numPlayers }, (_, i) => ({
      id: i,
      name: customNames[i] || `Joueur ${i + 1}`,
      score: 40, // Au Double Down, on commence avec 40 points
    }))
  );
  
  const [currentTurn, setCurrentTurn] = useState(0);
  const [dartsThrown, setDartsThrown] = useState(0);
  const [multiplier, setMultiplier] = useState<1 | 2 | 3>(1);
  const [currentThrows, setCurrentThrows] = useState<string[]>([]);
  const [turnScore, setTurnScore] = useState(0); // Score accumulé pendant les 3 fléchettes
  
  const currentPlayerIndex = currentTurn % numPlayers;
  const currentRound = Math.floor(currentTurn / numPlayers);
  const isGameOver = currentRound >= TARGETS.length;

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
    msg.rate = 1; 
    if (selectedVoiceURI) {
      const chosenVoice = voices.find(v => v.voiceURI === selectedVoiceURI);
      if (chosenVoice) msg.voice = chosenVoice;
    }
    window.speechSynthesis.speak(msg);
  };
  // ==========================================

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const winner = isGameOver ? sortedPlayers[0] : null;

  const resetGame = () => {
    setPlayers(Array.from({ length: numPlayers }, (_, i) => ({
      id: i,
      name: customNames[i] || `Joueur ${i + 1}`,
      score: 40,
    })));
    setCurrentTurn(0);
    setDartsThrown(0);
    setMultiplier(1);
    setCurrentThrows([]);
    setTurnScore(0);
  };

  const handleScore = (val: number) => {
    if (isGameOver || dartsThrown >= 3) return;

    if (val === 25 && multiplier === 3) {
      alert("Le Triple Bull n'existe pas !");
      setMultiplier(1);
      return;
    }

    const currentTarget = TARGETS[currentRound];
    let isValid = false;
    let pointsEarned = 0;

    // Logique de validation selon la cible en cours
    if (currentTarget === 'Double') {
      if (multiplier === 2 && val !== 0) {
        isValid = true;
        pointsEarned = val * 2;
      }
    } else if (currentTarget === 'Triple') {
      if (multiplier === 3 && val !== 0) {
        isValid = true;
        pointsEarned = val * 3;
      }
    } else if (currentTarget === 'Bull') {
      if (val === 25) {
        isValid = true;
        pointsEarned = 25 * multiplier; // Simple (25) ou Double (50)
      }
    } else {
      // Cible numérique standard (ex: '15')
      if (val.toString() === currentTarget) {
        isValid = true;
        pointsEarned = val * multiplier;
      }
    }

    const hitStr = val === 0 ? '0' : (multiplier === 3 ? `T${val}` : multiplier === 2 ? `D${val}` : `${val}`);
    setCurrentThrows((prev) => [...prev, isValid ? `${hitStr} ✔` : hitStr]);

    const newTurnScore = turnScore + pointsEarned;
    setTurnScore(newTurnScore);
    setMultiplier(1);

    const newCount = dartsThrown + 1;
    setDartsThrown(newCount);

    if (newCount >= 3) {
      const newPlayers = JSON.parse(JSON.stringify(players));
      const p = newPlayers[currentPlayerIndex];
      
      let finalScore = 0;
      let isHalved = false;
      
      // Si 0 point marqué, le score total est divisé par deux
      if (newTurnScore === 0) {
        finalScore = Math.floor(p.score / 2);
        isHalved = true;
      } else {
        finalScore = p.score + newTurnScore;
      }
      
      p.score = finalScore;
      setPlayers(newPlayers);
      
      // Vérification de la fin de partie pour l'annonce
      const nextTurn = currentTurn + 1;
      const nextRound = Math.floor(nextTurn / numPlayers);
      const gameIsEnding = nextRound >= TARGETS.length;

      if (gameIsEnding) {
        const finalSorted = [...newPlayers].sort((a: Player, b: Player) => b.score - a.score);
        announce(`Fin du jeu ! Victoire de ${finalSorted[0].name} !`);
      } else {
        if (isHalved) {
          announce(`Moitié ! Il te reste ${finalScore}`);
        } else {
          announce(`${newTurnScore} points. Total ${finalScore}`);
        }
      }

      setTimeout(() => {
        setCurrentTurn(nextTurn);
        setDartsThrown(0);
        setCurrentThrows([]);
        setTurnScore(0);
      }, 1200);
    }
  };

  const toggleMultiplier = (mod: 2 | 3) => {
    setMultiplier((prev) => (prev === mod ? 1 : mod));
  };

  const currentPlayer = players[currentPlayerIndex] || players[0];
  const currentTheme = PLAYER_COLORS[currentPlayerIndex % PLAYER_COLORS.length] || PLAYER_COLORS[0];
  const currentTarget = TARGETS[currentRound];
  const isInDanger = dartsThrown > 0 && turnScore === 0;

  return (
    <div className="w-full max-w-md flex flex-col items-center relative pb-6 overflow-hidden">
      
      {/* OVERLAY DE VICTOIRE */}
      {isGameOver && winner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md ${PLAYER_COLORS[winner.id % PLAYER_COLORS.length].headBg} border-2 ${PLAYER_COLORS[winner.id % PLAYER_COLORS.length].border} rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-300`}>
            <div className="absolute top-0 left-0 w-full h-full bg-white/5 animate-pulse pointer-events-none" />
            <h1 className="text-5xl font-black text-white mb-2 relative z-10 drop-shadow-md">FIN DU JEU !</h1>
            <h2 className={`text-4xl font-bold mb-8 ${PLAYER_COLORS[winner.id % PLAYER_COLORS.length].text} relative z-10 uppercase tracking-wider`}>{winner.name}</h2>
            
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
        <h1 className="text-xl font-bold text-white tracking-widest uppercase">Double Down</h1>
        
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
        <h2 className={`text-4xl font-black text-center uppercase tracking-widest mb-2 transition-colors duration-300 ${currentTheme.text} drop-shadow-md relative z-10`}>
          {currentPlayer.name}
        </h2>
        
        <div className="flex justify-center mb-4 relative z-10 h-6">
          {isInDanger && <span className="text-red-400 font-bold bg-red-900/60 px-3 py-0.5 rounded-full uppercase tracking-wider text-xs border border-red-500/50 shadow-inner animate-pulse">⚠️ Danger : Moitié !</span>}
          {turnScore > 0 && dartsThrown < 3 && <span className="text-green-400 font-bold bg-green-900/60 px-3 py-0.5 rounded-full uppercase tracking-wider text-xs border border-green-500/50 shadow-inner">✅ Sécurisé !</span>}
        </div>
        
        {/* Affichage de la Cible Actuelle */}
        <div className="flex flex-col items-center mb-6 relative z-10">
           <span className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Cible à viser</span>
           <div className={`text-6xl font-black text-white drop-shadow-lg uppercase`}>
             {currentTarget}
           </div>
        </div>
        
        {/* Fléchettes et Historique */}
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
        
        {/* Score en direct de ce tour */}
        <div className="text-center mt-4">
           <div className="text-4xl font-black text-white">{currentPlayer.score + turnScore}</div>
           <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Total actuel</div>
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
                <div className="text-lg font-black text-gray-300 mt-1">{p.score}</div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* CLAVIER DE JEU */}
      <div className="w-full mb-2 px-1">
        <div className="flex gap-2 w-full mb-3">
          <button onClick={() => toggleMultiplier(2)} className={`flex-1 py-3 rounded-2xl text-lg font-bold transition-all ${multiplier === 2 ? 'bg-orange-500 text-white scale-105 shadow-lg shadow-orange-900/50' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>Double</button>
          <button onClick={() => toggleMultiplier(3)} className={`flex-1 py-3 rounded-2xl text-lg font-bold transition-all ${multiplier === 3 ? 'bg-red-500 text-white scale-105 shadow-lg shadow-red-900/50' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>Triple</button>
        </div>
        
        <div className="grid grid-cols-4 gap-2 w-full">
           {NUMBERS.map((target) => (
             <button key={target} onClick={() => handleScore(target)} className={`py-3 rounded-xl text-xl font-bold active:scale-95 transition-colors duration-300 text-white shadow-sm border border-gray-600/50 ${currentTheme.btn}`}>
               {target === 25 ? "25 (B)" : target}
             </button>
           ))}
           <button onClick={() => handleScore(0)} className="bg-gray-900 border border-gray-600 py-3 rounded-xl text-lg font-bold active:bg-gray-800 text-gray-400 shadow-sm col-span-3">
             Miss (0)
           </button>
        </div>
      </div>
    </div>
  );
}

export default function DoubleDownGame() {
  return (
    <main 
      className="flex flex-col items-center justify-center min-h-screen text-white p-2 select-none bg-cover bg-center bg-fixed"
      style={{ backgroundImage: "url('/fond.jpeg')" }}
    >
      <Suspense fallback={<div className="text-xl font-bold text-pink-400 animate-pulse">Chargement de la partie...</div>}>
        <DoubleDownLogic />
      </Suspense>
    </main>
  );
}