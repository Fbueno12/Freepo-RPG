"use client";

import { useState } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Header, type AppScreen } from "@/components/layout/Header";
import { LoginScreen } from "@/components/screens/LoginScreen";
import { LobbyScreen } from "@/components/screens/LobbyScreen";
import { GameScreen } from "@/components/screens/GameScreen";

function AppContent() {
  const { user, loading } = useAuth();
  const [screen, setScreen] = useState<AppScreen>("login");
  const [campaignId, setCampaignId] = useState<string | null>(null);

  const activeScreen: AppScreen = !user
    ? "login"
    : screen === "login"
      ? "lobby"
      : screen;

  const openCampaign = (id: string) => {
    setCampaignId(id);
    setScreen("game");
  };

  if (loading) {
    return <div className="loading">Carregando…</div>;
  }

  return (
    <div className="app">
      <Header activeScreen={activeScreen} onNavigate={setScreen} />
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