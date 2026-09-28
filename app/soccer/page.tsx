"use client";
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

// Thème de base pour Soccer
const PLAYER_COLORS = [
  { text: 'text-blue-400', fill: 'bg-blue-500', btn: 'bg-blue-600 active:bg-blue-500', border: 'border-blue-500/30', headBg: 'bg-blue-900/40' },
  { text: 'text-green-400', fill: 'bg-green-500', btn: 'bg-green-600 active:bg-green-500', border: 'border-green-500/30', headBg: 'bg-green-900/40' },
  { text: 'text-yellow-400', fill: 'bg-yellow-500', btn: 'bg-yellow-600 active:bg-yellow-500', border: 'border-yellow-500/30', headBg: 'bg-yellow-900/40' },
  { text: 'text-red-400', fill: 'bg-red-500', btn: 'bg-red-600 active:bg-red-500', border: 'border-red-500/30', headBg: 'bg-red-900/40' },
];

type Player = { id: number; name: string; score: number };

function SoccerLogic() {
  const searchParams = useSearchParams();
  const numPlayers = parseInt(searchParams.get('players') || '2');
  const targetScore = parseInt(searchParams.get('target') || '10');
  const namesParam = searchParams.get('names');
  const customNames = namesParam ? namesParam.split(',').map(n => decodeURIComponent(n)) : [];

  const [players, setPlayers] = useState<Player[]>(() => 
    Array.from({ length: numPlayers }, (_, i) => ({
      id: i,
      name: customNames[i] || `Joueur ${i + 1}`,
      score: 0,
    }))
  );
  
  // Phase de jeu : le coup d'envoi détermine qui commence
  const [gamePhase, setGamePhase] = useState<'kickoff' | 'playing'>('kickoff');
  
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [attackerId, setAttackerId] = useState(0); 
  const [dartsThrown, setDartsThrown] = useState(0);
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

  const handleKickoffWinner = (playerId: number) => {
    setAttackerId(playerId);
    setCurrentPlayerIndex(playerId); // Le gagnant du coup d'envoi commence la partie
    setGamePhase('playing');
    announce(`Coup d'envoi remporté par ${players[playerId].name}. C'est parti !`);
  };

  const resetGame = () => {
    setPlayers(Array.from({ length: numPlayers }, (_, i) => ({
      id: i,
      name: customNames[i] || `Joueur ${i + 1}`,
      score: 0,
    })));
    setGamePhase('kickoff');
    setCurrentPlayerIndex(0);
    setAttackerId(0);
    setDartsThrown(0);
    setCurrentThrows([]);
    setWinnerId(null);
  };

  const handleAction = (action: 'goal' | 'intercept' | 'miss') => {
    if (winnerId !== null || dartsThrown >= 3) return;

    let didWin = false;
    let announcement = "";
    let hitStr = "";

    const newPlayers = JSON.parse(JSON.stringify(players));
    const p = newPlayers[currentPlayerIndex];

    if (action === 'goal') {
      p.score += 1;
      hitStr = "BUT ✔";
      announcement = "But !";
      if (p.score >= targetScore) didWin = true;
    } else if (action === 'intercept') {
      setAttackerId(currentPlayerIndex);
      hitStr = "⚽ ✔";
      announcement = `Interception de ${p.name} !`;
    } else {
      hitStr = "0";
    }

    setCurrentThrows((prev) => [...prev, hitStr]);
    setPlayers(newPlayers);

    const newCount = dartsThrown + 1;
    setDartsThrown(newCount);

    if (didWin) {
      setWinnerId(currentPlayerIndex);
      announce(`Fin du match ! Victoire de ${p.name} avec ${p.score} buts !`);
      return;
    }

    if (newCount >= 3) {
      const nextPlayerIdx = (currentPlayerIndex + 1) % players.length;
      // On calcule dynamiquement qui sera le prochain attaquant pour l'annonce
      const currentFinalAttacker = action === 'intercept' ? currentPlayerIndex : attackerId;
      const nextRole = nextPlayerIdx === currentFinalAttacker ? "Attaquant" : "Défenseur";

      let finalAnnounce = announcement;
      if (finalAnnounce) finalAnnounce += ". ";
      finalAnnounce += `Au tour de ${newPlayers[nextPlayerIdx].name}. ${nextRole}`;
      
      announce(finalAnnounce);

      setTimeout(() => {
        setCurrentPlayerIndex(nextPlayerIdx);
        setDartsThrown(0);
        setCurrentThrows([]);
      }, 1200);
    } else {
      if (announcement) announce(announcement);
    }
  };

  // ÉCRAN DE COUP D'ENVOI
  if (gamePhase === 'kickoff') {
    return (
      <div className="w-full max-w-md flex flex-col items-center relative pb-6 overflow-hidden">
        {/* EN-TÊTE ET SÉLECTEUR DE VOIX */}
        <div className="w-full flex justify-between items-center mb-6 px-2 shrink-0">
          <Link href="/" className="text-gray-400 px-3 py-2 font-bold text-sm bg-gray-800 hover:bg-gray-700 transition-all rounded-lg">← Quitter</Link>
          <div className="flex flex-col items-center">
            <h1 className="text-xl font-bold text-white tracking-widest uppercase">COUP D&apos;ENVOI</h1>
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

        {/* CARTE DE SÉLECTION */}
        <div className="w-full bg-gray-800 rounded-3xl p-6 shadow-2xl border border-gray-700 text-center animate-in zoom-in duration-300">
          <div className="text-6xl mb-4 animate-bounce">🎯</div>
          <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-widest">Qui a le ballon ?</h2>
          <p className="text-gray-400 text-sm mb-6 px-2">
            Lancez une fléchette chacun vers le centre de la cible. 
            Le joueur le plus proche de la bulle gagne le coup d&apos;envoi et devient le premier Attaquant !
          </p>
          <div className="flex flex-col gap-3">
            {players.map((p) => {
              const theme = PLAYER_COLORS[p.id % PLAYER_COLORS.length];
              return (
                <button 
                  key={p.id} 
                  onClick={() => handleKickoffWinner(p.id)}
                  className={`w-full py-4 rounded-xl text-xl font-bold text-white shadow-lg active:scale-95 transition-transform ${theme.btn}`}
                >
                  {p.name} commence
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const currentPlayer = players[currentPlayerIndex];
  const currentTheme = PLAYER_COLORS[currentPlayerIndex % PLAYER_COLORS.length];
  const isAttacker = currentPlayerIndex === attackerId;

  return (
    <div className="w-full max-w-md flex flex-col items-center relative pb-6 overflow-hidden">
      
      {/* OVERLAY DE VICTOIRE */}
      {winner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md ${PLAYER_COLORS[winner.id % PLAYER_COLORS.length].headBg} border-2 ${PLAYER_COLORS[winner.id % PLAYER_COLORS.length].border} rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-300`}>
            <div className="absolute top-0 left-0 w-full h-full bg-white/5 animate-pulse pointer-events-none" />
            <h1 className="text-5xl font-black text-white mb-2 relative z-10 drop-shadow-md">VICTOIRE !</h1>
            <h2 className={`text-4xl font-bold mb-4 ${PLAYER_COLORS[winner.id % PLAYER_COLORS.length].text} relative z-10 uppercase tracking-wider`}>{winner.name}</h2>
            <div className="text-2xl font-bold text-gray-200 mb-8 relative z-10">Score : {winner.score} buts</div>
            
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
          <h1 className="text-xl font-bold text-white tracking-widest uppercase">SOCCER</h1>
          <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest bg-cyan-900/30 px-2 py-0.5 rounded-full mt-1">
            Objectif : {targetScore} Buts
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
      <div className={`w-full rounded-3xl p-5 mb-4 shadow-2xl relative overflow-hidden border-2 transition-all duration-500 ${isAttacker ? 'bg-cyan-900/40 border-cyan-500' : 'bg-gray-800 border-gray-600'}`}>
        <div className="absolute top-0 left-0 w-full h-full bg-white/5 pointer-events-none" />
        
        <div className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-1 text-center relative z-10">
          Au tour de
        </div>
        <h2 className={`text-4xl font-black text-center uppercase tracking-widest mb-4 transition-colors duration-300 ${currentTheme.text} drop-shadow-md relative z-10`}>
          {currentPlayer.name}
        </h2>
        
        {/* Affichage du Rôle */}
        <div className="flex flex-col items-center mb-6 relative z-10">
           {isAttacker ? (
             <>
               <span className="text-cyan-400 font-black bg-cyan-900/60 px-4 py-1.5 rounded-full uppercase tracking-wider text-sm border border-cyan-500/50 shadow-inner mb-2 animate-pulse flex items-center gap-2">
                 ⚽ Possession du Ballon
               </span>
               <span className="text-xs font-bold text-gray-400 uppercase">Cible : Un Double = 1 But</span>
             </>
           ) : (
             <>
               <span className="text-gray-300 font-bold bg-gray-700/60 px-4 py-1.5 rounded-full uppercase tracking-wider text-sm border border-gray-500/50 shadow-inner mb-2 flex items-center gap-2">
                 🛡️ Défenseur
               </span>
               <span className="text-xs font-bold text-gray-400 uppercase">Cible : Bull pour intercepter</span>
             </>
           )}
        </div>
        
        {/* Fléchettes et Historique */}
        <div className="flex justify-center gap-4 w-full mx-auto relative z-10">
           {[0, 1, 2].map((idx) => {
             const isHitStr = currentThrows[idx]?.includes('✔');
             return (
               <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                 <div className={`w-4 h-4 rounded-full shadow-md transition-colors duration-300 ${idx < dartsThrown ? currentTheme.fill : 'bg-gray-800 border-2 border-gray-600'}`} />
                 <div className={`w-full text-center text-xs font-bold bg-gray-900/60 rounded-lg py-1.5 h-8 flex items-center justify-center border shadow-inner ${isHitStr ? 'text-green-400 border-green-500/50' : 'text-gray-200 border-gray-700/50'}`}>
                   {currentThrows[idx] ? currentThrows[idx].replace(' ✔', '') : '-'}
                 </div>
               </div>
             );
           })}
        </div>

        {/* Score du joueur actif */}
        <div className="text-center mt-6">
           <div className="text-5xl font-black text-white">{currentPlayer.score} <span className="text-2xl text-gray-400">/ {targetScore}</span></div>
           <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-1">Buts Marqués</div>
        </div>
      </div>

      {/* ADVERSAIRES ET LEUR RÔLE */}
      {players.length > 1 && (
        <div className="flex gap-2 w-full mb-4 overflow-x-auto px-1">
          {players.map((p, idx) => {
            if (idx === currentPlayerIndex) return null; 
            const hasBall = idx === attackerId;
            return (
              <div key={p.id} className={`flex-1 bg-gray-800/80 rounded-2xl p-2 text-center border relative ${hasBall ? 'border-cyan-500/50' : 'border-gray-700/50'}`}>
                {hasBall && <div className="absolute -top-2 -right-2 text-lg animate-bounce">⚽</div>}
                <div className="text-[11px] text-gray-400 font-bold truncate uppercase mt-1">{p.name}</div>
                <div className="text-xl font-black text-gray-300 mt-1">{p.score}</div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* CLAVIER INTELLIGENT (S'adapte dynamiquement si interception au 1er tir !) */}
      <div className="w-full mb-2 px-1">
        <div className="flex gap-3 w-full">
           {isAttacker ? (
             <button 
               onClick={() => handleAction('goal')} 
               className="flex-[2] py-6 rounded-2xl text-xl font-black active:scale-95 transition-all text-white shadow-xl border border-white/10 bg-cyan-600 active:bg-cyan-500"
             >
               🥅 MARQUER (Double)
             </button>
           ) : (
             <button 
               onClick={() => handleAction('intercept')} 
               className="flex-[2] py-6 rounded-2xl text-xl font-black active:scale-95 transition-all text-white shadow-xl border border-white/10 bg-emerald-600 active:bg-emerald-500"
             >
               ⚽ INTERCEPTER (Bulle)
             </button>
           )}
           <button 
             onClick={() => handleAction('miss')} 
             className="flex-1 bg-gray-900 border-2 border-gray-600 py-6 rounded-2xl text-lg font-bold active:bg-gray-800 text-gray-400 shadow-sm active:scale-95 transition-all"
           >
             ❌ RATÉ
           </button>
        </div>
      </div>
    </div>
  );
}

export default function SoccerGame() {
  return (
    <main 
      className="flex flex-col items-center justify-center min-h-screen text-white p-2 select-none bg-cover bg-center bg-fixed"
      style={{ backgroundImage: "url('/fond.jpeg')" }}
    >
      <Suspense fallback={<div className="text-xl font-bold text-cyan-400 animate-pulse">Chargement de la partie...</div>}>
        <SoccerLogic />
      </Suspense>
    </main>
  );
}