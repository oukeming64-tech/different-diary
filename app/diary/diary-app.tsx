"use client";

import { ActivityFlow } from "../activity-flow";
import { AIFlow } from "../ai-flow";
import { AmbientScene } from "../ambient-scene";
import { OnboardingGuide } from "../onboarding-guide";
import { PhotoFlow } from "../photo-flow";
import { TodayPoster } from "../today-poster";
import {
  BranchScreen,
  ReplyScreen,
  SavedScreen,
  WritingScreen,
} from "./conversation-screens";
import { HomeScreen } from "./home-screen";
import { DataScreen, DetailScreen, TimelineScreen } from "./memory-screens";
import { intentLabel } from "./model";
import { useDiaryController } from "./use-diary-controller";

export function DiaryApp() {
  const controller = useDiaryController();
  const {
    view,
    tone,
    ambientTone,
    surfaceRef,
    showOnboarding,
    activeBranch,
    currentResponse,
    selectedIntentId,
    photoPreviewUrl,
    photoError,
    storageError,
    todayPosterModel,
    isProcessingPhoto,
    isSaving,
    closeOnboarding,
    closeActivityFlow,
    rememberActivity,
    closePhotoFlow,
    preparePhoto,
    remember,
    goHome,
    setView,
  } = controller;

  return (
    <main className={`stage-shell motion-stage motion-stage--${view}`}>
      <AmbientScene tone={ambientTone} />
      <section
        className="app-surface motion-surface"
        data-tone={tone}
        data-view={view}
        aria-hidden={showOnboarding || undefined}
        aria-live="polite"
        ref={surfaceRef}
      >
        {view === "home" && <HomeScreen controller={controller} />}

        {view === "activity" && (
          <ActivityFlow
            busy={isSaving}
            error={storageError}
            onCancel={closeActivityFlow}
            onSave={rememberActivity}
          />
        )}

        {view === "photo" && activeBranch && currentResponse && (
          <PhotoFlow
            busy={isProcessingPhoto || isSaving}
            error={photoError ?? storageError}
            onCancel={closePhotoFlow}
            onFile={(file) => void preparePhoto(file)}
            onRecordOnly={() => void remember(null)}
            onWrite={() => setView("write")}
            previewUrl={photoPreviewUrl}
          />
        )}

        {view === "poster" && <TodayPoster model={todayPosterModel} onBack={goHome} />}

        {view === "ai" && activeBranch && currentResponse && (
          <AIFlow
            busySaving={isSaving}
            intentLabel={intentLabel(activeBranch.id, selectedIntentId ?? "")}
            localResponse={currentResponse}
            onCancel={() => setView("reply")}
            onSave={(userText, response) => void remember(userText, response)}
            state={activeBranch.id}
            stateLabel={activeBranch.shortLabel}
          />
        )}

        {view === "branch" && <BranchScreen controller={controller} />}
        {view === "reply" && <ReplyScreen controller={controller} />}
        {view === "write" && <WritingScreen controller={controller} />}
        {view === "saved" && <SavedScreen controller={controller} />}
        {view === "timeline" && <TimelineScreen controller={controller} />}
        {view === "detail" && <DetailScreen controller={controller} />}
        {view === "data" && <DataScreen controller={controller} />}
      </section>

      {showOnboarding && (
        <OnboardingGuide onClose={closeOnboarding} onComplete={closeOnboarding} open />
      )}
    </main>
  );
}
