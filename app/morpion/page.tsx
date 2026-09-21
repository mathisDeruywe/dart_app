"use client";
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

// P0 = Bleu (X), P1 = Rouge (O)
const PLAYER_COLORS = [
  { text: 'text-blue-400', fill: 'bg-blue-500', btn: 'bg-blue-600 active:bg-blue-500', border: 'border-blue-500/50', headBg: 'bg-blue-900/40', symbol: 'X' },
  { text: 'text-red-400', fill: 'bg-red-500', btn: 'bg-red-600 active:bg-red-500', border: 'border-red-500/50', headBg: 'bg-red-900/40', symbol: 'O' },
];

// Configuration exacte d'un jeu de fléchettes physique
const TARGETS = [
  12, 20, 18,
  11, 25, 6,
  7,  3,  2
];

const WINNING_LINES = [
  [12, 20, 18], [11, 25, 6], [7, 3, 2], // Lignes horizontales
  [12, 11, 7], [20, 25, 3], [18, 6, 2], // Lignes verticales
  [12, 25, 2], [18, 25, 7]              // Diagonales
];

type Player = { id: number; name: string };
type CellMarks = { 0: number; 1: number };

function MorpionLogic() {
  const searchParams = useSearchParams();
  const namesParam = searchParams.get('names');
  const customNames = namesParam ? namesParam.split(',').map(n => decodeURIComponent(n)) : [];

  const [players] = useState<Player[]>([
    { id: 0, name: customNames[0] || 'Joueur X' },
    { id: 1, name: customNames[1] || 'Joueur O' }
  ]);
  
  // État de la grille : Pour chaque nombre, on compte les marques (hits) de P0 et P1
  const [marks, setMarks] = useState<Record<number, CellMarks>>(() => {
    const init: Record<number, CellMarks> = {};
    TARGETS.forEach(t => init[t] = { 0: 0, 1: 0 });
    return init;
  });

  // Propriétaires définitifs des cases (0 = P0, 1 = P1, null = personne)
  const [owners, setOwners] = useState<Record<number, number | null>>(() => {
    const init: Record<number, number | null> = {};
    TARGETS.forEach(t => init[t] = null);
    return init;
  });

  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [dartsThrown, setDartsThrown] = useState(0);
  const [multiplier, setMultiplier] = useState<1 | 2 | 3>(1);
  const [currentThrows, setCurrentThrows] = useState<string[]>([]);
  
  const [winnerId, setWinnerId] = useState<number | null>(null);
  const [isDraw, setIsDraw] = useState(false);

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

  const resetGame = () => {
    const initMarks: Record<number, CellMarks> = {};
    const initOwners: Record<number, number | null> = {};
    TARGETS.forEach(t => { initMarks[t] = { 0: 0, 1: 0 }; initOwners[t] = null; });
    
    setMarks(initMarks);
    setOwners(initOwners);
    setCurrentPlayerIndex(0);
    setDartsThrown(0);
    setMultiplier(1);
    setCurrentThrows([]);
    setWinnerId(null);
    setIsDraw(false);
  };

  const checkWin = (currentOwners: Record<number, number | null>, playerId: number) => {
    return WINNING_LINES.some(line => line.every(target => currentOwners[target] === playerId));
  };

  const checkDraw = (currentOwners: Record<number, number | null>) => {
    return TARGETS.every(target => currentOwners[target] !== null);
  };

  const handleScore = (val: number) => {
    if (winnerId !== null || isDraw || dartsThrown >= 3) return;

    if (val === 25 && multiplier === 3) {
      alert("Le Triple Bull n'existe pas !");
      setMultiplier(1);
      return;
    }

    const hitStr = val === 0 ? '0' : (multiplier === 3 ? `T${val}` : multiplier === 2 ? `D${val}` : `${val}`);
    let announcement = "";
    let didCapture = false;
    let didWin = false;
    let didDraw = false;

    const newMarks = JSON.parse(JSON.stringify(marks));
    const newOwners = { ...owners };

    if (val !== 0) {
      // Si la case n'appartient à personne
      if (newOwners[val] === null) {
        const currentM = newMarks[val][currentPlayerIndex];
        const marksToAdd = multiplier;
        
        if (currentM < 3) {
          const newM = Math.min(3, currentM + marksToAdd);
          newMarks[val][currentPlayerIndex] = newM;
          
          if (newM === 3) {
            newOwners[val] = currentPlayerIndex;
            didCapture = true;
            announcement = `Case ${val === 25 ? 'Bull' : val} validée par ${players[currentPlayerIndex].name} !`;
            
            // On check la victoire après la capture
            if (checkWin(newOwners, currentPlayerIndex)) {
              didWin = true;
            } else if (checkDraw(newOwners)) {
              didDraw = true;
            }
          }
        }
      }
    }

    setCurrentThrows((prev) => [...prev, didCapture ? `${hitStr} ✔` : hitStr]);
    setMarks(newMarks);
    setOwners(newOwners);
    setMultiplier(1);

    const newCount = dartsThrown + 1;
    setDartsThrown(newCount);

    if (didWin) {
      setWinnerId(currentPlayerIndex);
      announce(`Victoire de ${players[currentPlayerIndex].name} !`);
      return;
    }

    if (didDraw) {
      setIsDraw(true);
      announce("Match nul ! Plus aucune case disponible.");
      return;
    }

    if (newCount >= 3) {
      if (!didCapture) announcement = ""; // Si rien capturé, pas d'annonce spéciale
      if (announcement) announce(announcement);

      setTimeout(() => {
        setCurrentPlayerIndex(prev => prev === 0 ? 1 : 0);
        setDartsThrown(0);
        setCurrentThrows([]);
      }, 1200);
    } else {
      if (announcement) announce(announcement);
    }
  };

  const toggleMultiplier = (mod: 2 | 3) => {
    setMultiplier((prev) => (prev === mod ? 1 : mod));
  };

  const renderCricketMark = (count: number) => {
    if (count === 1) return "/";
    if (count === 2) return "X";
    if (count === 3) return "Ⓧ";
    return "";
  };

  const currentPlayer = players[currentPlayerIndex];
  const currentTheme = PLAYER_COLORS[currentPlayerIndex];

  return (
    <div className="w-full max-w-md flex flex-col items-center relative pb-6 overflow-hidden">
      
      {/* OVERLAY DE FIN DE PARTIE */}
      {(winnerId !== null || isDraw) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md ${winnerId !== null ? PLAYER_COLORS[winnerId].headBg : 'bg-gray-800'} border-2 ${winnerId !== null ? PLAYER_COLORS[winnerId].border : 'border-gray-600'} rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-300`}>
            <div className="absolute top-0 left-0 w-full h-full bg-white/5 animate-pulse pointer-events-none" />
            
            {winnerId !== null ? (
              <>
                <h1 className="text-5xl font-black text-white mb-2 relative z-10 drop-shadow-md">VICTOIRE !</h1>
                <h2 className={`text-4xl font-bold mb-8 ${PLAYER_COLORS[winnerId].text} relative z-10 uppercase tracking-wider`}>{players[winnerId].name}</h2>
              </>
            ) : (
              <>
                <h1 className="text-5xl font-black text-gray-300 mb-2 relative z-10 drop-shadow-md">MATCH NUL</h1>
                <p className="text-xl text-gray-400 mb-8 relative z-10">Aucun alignement n&apos;est possible.</p>
              </>
            )}
            
            <div className="flex flex-col gap-4 relative z-10">
              <button onClick={resetGame} className={`w-full py-4 rounded-xl text-xl font-bold text-white shadow-lg active:scale-95 transition-transform ${winnerId !== null ? PLAYER_COLORS[winnerId].fill : 'bg-gray-600'}`}>
                Rejouer
              </button>
              <Link href="/" className="w-full py-4 rounded-xl text-xl font-bold bg-gray-900 text-gray-300 shadow-lg active:scale-95 transition-transform border border-gray-700 block text-center">
                Menu Principal
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* EN-TÊTE ET SÉLECTEUR DE VOIX */}
      <div className="w-full flex justify-between items-center mb-2 px-2 shrink-0">
        <Link href="/" className="text-gray-400 px-3 py-2 font-bold text-sm bg-gray-800 hover:bg-gray-700 transition-all rounded-lg">← Quitter</Link>
        <h1 className="text-xl font-bold text-white tracking-widest uppercase">Morpion</h1>
        
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

      {/* INFOS DU JOUEUR ACTIF */}
      <div className={`w-full rounded-2xl p-4 mb-4 shadow-lg flex justify-between items-center border-2 transition-all duration-500 ${currentTheme.headBg} ${currentTheme.border}`}>
         <div>
            <div className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-1">Au tour de</div>
            <h2 className={`text-2xl font-black uppercase tracking-widest transition-colors duration-300 ${currentTheme.text} drop-shadow-md`}>
              {currentPlayer.name} <span className="text-white">({currentTheme.symbol})</span>
            </h2>
         </div>
         <div className="flex gap-2">
           {[0, 1, 2].map((idx) => (
             <div key={idx} className={`w-8 h-8 rounded-full shadow-md flex items-center justify-center text-xs font-bold transition-colors duration-300 ${idx < dartsThrown ? 'bg-gray-900/60 text-gray-400 border border-gray-700/50' : currentTheme.fill + ' text-white'}`}>
                {idx < dartsThrown ? currentThrows[idx]?.replace(' ✔', '') || '-' : idx + 1}
             </div>
           ))}
         </div>
      </div>

      {/* GRILLE DU MORPION (3x3) JOUABLE DIRECTEMENT */}
      <div className="w-full aspect-square max-w-sm bg-gray-800 rounded-3xl p-3 mb-4 shadow-2xl border border-gray-700 grid grid-cols-3 gap-2">
         {TARGETS.map(target => {
            const ownerId = owners[target];
            const isOwned = ownerId !== null;
            const ownerTheme = isOwned ? PLAYER_COLORS[ownerId] : null;
            
            return (
              <button 
                key={target}
                onClick={() => handleScore(target)}
                // Si la case n'est pas possédée, elle s'éclaire légèrement à la couleur du joueur actuel lors du survol/clic
                className={`relative flex flex-col items-center justify-center rounded-2xl border-2 transition-all duration-300 overflow-hidden active:scale-95 focus:outline-none 
                ${isOwned ? `${ownerTheme?.headBg}${ownerTheme?.border}` : `bg-gray-900/50 border-gray-700/50 hover:border-gray-500`}`}
              >
                {/* Le numéro de la cible au centre (plus discret si la case est prise) */}
                <div className={`absolute font-black uppercase z-10 transition-all duration-500 ${isOwned ? 'opacity-20 text-4xl' : 'text-5xl text-gray-400'}`}>
                  {target === 25 ? 'B' : target}
                </div>
                
                {/* Le gros X ou O si la case est prise */}
                {isOwned && (
                  <div className={`z-20 text-7xl font-black drop-shadow-lg ${ownerTheme?.text} animate-in zoom-in duration-300`}>
                    {ownerTheme?.symbol}
                  </div>
                )}

                {/* Les petits indicateurs de progression si la case est libre */}
                {!isOwned && (
                  <>
                    <div className="absolute top-2 left-2 text-blue-400 font-bold text-sm">
                      {renderCricketMark(marks[target][0])}
                    </div>
                    <div className="absolute bottom-2 right-2 text-red-400 font-bold text-sm">
                      {renderCricketMark(marks[target][1])}
                    </div>
                  </>
                )}
              </button>
            );
         })}
      </div>
      
      {/* CLAVIER REDUIT (MULTIPLICATEURS + MISS) */}
      <div className="w-full mb-2 px-1">
        <div className="flex gap-2 w-full mb-3">
          <button onClick={() => toggleMultiplier(2)} className={`flex-1 py-4 rounded-2xl text-lg font-bold transition-all ${multiplier === 2 ? 'bg-orange-500 text-white shadow-lg shadow-orange-900/50' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>Double</button>
          <button onClick={() => toggleMultiplier(3)} className={`flex-1 py-4 rounded-2xl text-lg font-bold transition-all ${multiplier === 3 ? 'bg-red-500 text-white shadow-lg shadow-red-900/50' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>Triple</button>
        </div>
        
        <button onClick={() => handleScore(0)} className="w-full bg-gray-900 border border-gray-600 py-4 rounded-2xl text-xl font-bold active:bg-gray-800 text-gray-400 shadow-sm active:scale-95 transition-all">
          Miss (0)
        </button>
      </div>
    </div>
  );
}

export default function MorpionGame() {
  return (
    <main 
      className="flex flex-col items-center justify-center min-h-screen text-white p-2 select-none bg-cover bg-center bg-fixed"
      style={{ backgroundImage: "url('/fond.jpeg')" }}
    >
      <Suspense fallback={<div className="text-xl font-bold text-red-400 animate-pulse">Chargement de la partie...</div>}>
        <MorpionLogic />
      </Suspense>
    </main>
  );
}