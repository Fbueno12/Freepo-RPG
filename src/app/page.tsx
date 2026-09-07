"use client";

import { useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { LoginScreen } from "@/components/screens/LoginScreen";
import { LobbyScreen } from "@/components/screens/LobbyScreen";
import { GameScreen } from "@/components/screens/GameScreen";

type Screen = "login" | "lobby" | "game";

function AppContent() {
  const { user, loading } = useAuth();
  const [screen, setScreen] = useState<Screen>("login");
  const [campaignId, setCampaignId] = useState<string | null>(null);

  const activeScreen: Screen = !user
    ? "login"
    : screen === "login"
      ? "lobby"
      : screen;

  const openCampaign = (id: string) => {
    setCampaignId(id);
    setScreen("game");
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-muted">Carregando…</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <Header
        activeScreen={activeScreen}
        onNavigate={(s) => {
          const target = s as Screen;
          setScreen(target);
        }}
      />
      {!user && (
        <LoginScreen onSuccess={() => setScreen("lobby")} />
      )}
      {user && activeScreen === "lobby" && (
        <LobbyScreen onOpenCampaign={openCampaign} />
      )}
      {user && activeScreen === "game" && campaignId && (
        <GameScreen
          campaignId={campaignId}
          onLeave={() => setScreen("lobby")}
        />
      )}
    </div>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}