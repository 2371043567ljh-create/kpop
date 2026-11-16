import { useCallback, useEffect, useMemo, useState } from 'react';
import { CharacterCreator } from './components/CharacterCreator';
import { PrologueFinale } from './components/PrologueFinale';
import { PrologueStage } from './components/PrologueStage';
import { SaveImportModal } from './components/SaveImportModal';
import { TitleScreen } from './components/TitleScreen';
import { TraineeHud } from './components/TraineeHud';
import { applyResolutionToState } from './game/prologueScript';
import {
  clearLocalStorageSave,
  createSaveData,
  loadFromLocalStorage,
  saveToLocalStorage,
} from './game/rules';
import type {
  ActResolution,
  GameScreenState,
  Keepsake,
  PlayerProfile,
  PlayerStats,
  SaveDataV1,
  TheqooPost,
} from './game/types';

export default function App() {
  const [screen, setScreen] = useState<GameScreenState>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        return 'creating';
      }
    }
    return 'title';
  });

  const [existingSave, setExistingSave] = useState<SaveDataV1 | null>(() =>
    loadFromLocalStorage()
  );

  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [keepsake, setKeepsake] = useState<Keepsake | null>(null);
  const [behaviorTags, setBehaviorTags] = useState<string[]>([]);
  const [theqooPost, setTheqooPost] = useState<TheqooPost | null>(null);
  const [currentAct, setCurrentAct] = useState<number>(1);
  const [history, setHistory] = useState<ActResolution[]>([]);
  const [currentResolution, setCurrentResolution] = useState<ActResolution | null>(null);

  const [modalMode, setModalMode] = useState<'import' | 'export' | null>(null);

  // Sync game state to document.body.dataset.state for clean verification & state hygiene
  useEffect(() => {
    const stateAttr =
      screen === 'title'
        ? 'title'
        : screen === 'finished'
          ? 'gameover'
          : 'playing';
    document.body.dataset.state = stateAttr;
  }, [screen]);

  const currentSaveData = useMemo<SaveDataV1 | null>(() => {
    if (!profile || !stats) return null;
    return createSaveData({
      player: profile,
      stats,
      keepsake,
      behaviorTags,
      theqooPost,
      currentAct,
      completed: screen === 'finished',
      history,
    });
  }, [profile, stats, keepsake, behaviorTags, theqooPost, currentAct, screen, history]);

  // Auto-persist whenever active game state progresses
  useEffect(() => {
    if (currentSaveData && (screen === 'playing' || screen === 'finished')) {
      saveToLocalStorage(currentSaveData);
      setExistingSave(currentSaveData);
    }
  }, [currentSaveData, screen]);

  const handleStartNew = useCallback(() => {
    setProfile(null);
    setStats(null);
    setKeepsake(null);
    setBehaviorTags([]);
    setTheqooPost(null);
    setCurrentAct(1);
    setHistory([]);
    setCurrentResolution(null);
    setScreen('creating');
  }, []);

  const handleLoadSaveIntoState = useCallback((save: SaveDataV1) => {
    setProfile(save.player);
    setStats(save.stats);
    setKeepsake(save.keepsake);
    setBehaviorTags(save.behaviorTags);
    setTheqooPost(save.theqooPost);
    setHistory(save.prologueProgress.history);
    setCurrentAct(save.prologueProgress.currentAct);
    setCurrentResolution(null);
    setScreen(save.prologueProgress.completed ? 'finished' : 'playing');
    saveToLocalStorage(save);
    setExistingSave(save);
  }, []);

  const handleCompleteSetup = useCallback(
    (newProfile: PlayerProfile, initialStats: PlayerStats) => {
      setProfile(newProfile);
      setStats(initialStats);
      setKeepsake(null);
      setBehaviorTags([]);
      setTheqooPost(null);
      setCurrentAct(1);
      setHistory([]);
      setCurrentResolution(null);
      setScreen('playing');
    },
    []
  );

  const handleResolveAct = useCallback(
    (resolution: ActResolution) => {
      if (!stats) return;
      const { nextStats, nextTags } = applyResolutionToState(
        stats,
        behaviorTags,
        resolution
      );
      setStats(nextStats);
      setBehaviorTags(nextTags);
      if (resolution.keepsakeAwarded) {
        setKeepsake(resolution.keepsakeAwarded);
      }
      if (resolution.theqooPost) {
        setTheqooPost(resolution.theqooPost);
      }
      setCurrentResolution(resolution);
      setHistory((prev) => [...prev, resolution]);
    },
    [stats, behaviorTags]
  );

  const handleNextAct = useCallback(() => {
    setCurrentResolution(null);
    if (currentAct >= 5) {
      setScreen('finished');
    } else {
      setCurrentAct((prev) => prev + 1);
    }
  }, [currentAct]);

  const handleRestartFromScratch = useCallback(() => {
    clearLocalStorageSave();
    setExistingSave(null);
    handleStartNew();
  }, [handleStartNew]);

  return (
    <>
      {screen === 'title' && (
        <TitleScreen
          existingSave={existingSave}
          onStartNew={handleStartNew}
          onContinueSave={() => {
            if (existingSave) handleLoadSaveIntoState(existingSave);
          }}
          onOpenImport={() => setModalMode('import')}
        />
      )}

      {screen === 'creating' && (
        <CharacterCreator
          onBackToTitle={() => setScreen('title')}
          onCompleteSetup={handleCompleteSetup}
        />
      )}

      {screen === 'playing' && profile && stats && (
        <div className="min-h-screen bg-[#09090F] text-slate-100">
          <div className="max-w-7xl mx-auto lg:px-8 lg:py-6 flex flex-col lg:flex-row gap-6 items-stretch lg:items-start">
            <TraineeHud
              profile={profile}
              stats={stats}
              keepsake={keepsake}
              behaviorTags={behaviorTags}
              currentAct={currentAct}
              onOpenExport={() => setModalMode('export')}
              onReturnTitle={() => setScreen('title')}
            />

            <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-0 pb-12">
              <PrologueStage
                currentAct={currentAct}
                profile={profile}
                stats={stats}
                currentResolution={currentResolution}
                onResolveAct={handleResolveAct}
                onNextAct={handleNextAct}
              />
            </main>
          </div>
        </div>
      )}

      {screen === 'finished' && currentSaveData && (
        <PrologueFinale
          saveData={currentSaveData}
          onRestart={handleRestartFromScratch}
          onOpenExportModal={() => setModalMode('export')}
        />
      )}

      <SaveImportModal
        isOpen={modalMode !== null}
        mode={modalMode ?? 'export'}
        currentSave={currentSaveData ?? existingSave}
        onClose={() => setModalMode(null)}
        onImportSuccess={(imported) => {
          setModalMode(null);
          handleLoadSaveIntoState(imported);
        }}
      />
    </>
  );
}
