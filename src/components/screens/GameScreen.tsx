"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Sidebar, type SidebarTab } from "@/components/table/Sidebar";
import { MapView } from "@/components/table/MapView";
import { InitiativeView } from "@/components/table/InitiativeView";
import { RightPanel } from "@/components/table/RightPanel";
import { CharacterPanel } from "@/components/table/CharacterPanel";
import { getCampaign, getMemberRole } from "@/lib/campaigns";
import {
  subscribePresence,
  setOnline,
  setOffline,
  type OnlineUser,
} from "@/lib/presence";
import type { Campaign } from "@/lib/types";

interface GameScreenProps {
  campaignId: string;
  onLeave: () => void;
}

export function GameScreen({ campaignId, onLeave }: GameScreenProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SidebarTab>("map");
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isGM, setIsGM] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    let active = true;
    const uid = user?.uid;
    getCampaign(campaignId).then((c) => {
      if (!active) return;
      setCampaign(c);
      if (uid && c) {
        getMemberRole(c.id, uid).then((role) => {
          if (active) setIsGM(role === "gm");
        });
      }
    });
    return () => {
      active = false;
    };
  }, [campaignId, user?.uid]);

  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    const name = user.email?.split("@")[0] ?? "jogador";
    void setOnline(campaignId, uid, name);

    const handleBeforeUnload = () => {
      void setOffline(campaignId, uid);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      void setOffline(campaignId, uid);
    };
  }, [campaignId, user?.uid, user?.email]);

  useEffect(() => {
    return subscribePresence(campaignId, setOnlineUsers);
  }, [campaignId]);

  return (
    <div className="game">
      <div className="game-top">
        <button className="icon-btn" onClick={onLeave} title="Voltar">
          ←
        </button>
        <div className="cm">{campaign?.name ?? "Carregando…"}</div>
        <div className="game-sep" />
        <span className="game-meta">
          {campaign ? `${campaign.system} · Nível ${campaign.level}` : ""}
        </span>
        <div className="game-sep" />
        <span className="gm-badge">{isGM ? "MESTRE" : "JOGADOR"}</span>
        <div className="game-sep" />
        <div className="game-online">
          {onlineUsers.map((u) => (
            <span key={u.uid} className="online-user">
              <span className="dot" />
              {u.name}
            </span>
          ))}
          {onlineUsers.length === 0 && <span className="text-muted">Nenhum online</span>}
        </div>
        <div className="game-sep" />
        <button
          className="game-code"
          onClick={() => void navigator.clipboard?.writeText(campaignId)}
          title="Código da campanha — envie para os jogadores entrarem (clique para copiar)"
        >
          <span>Código:</span>
          <span className="code">#{campaignId.slice(0, 8)}</span>
          <span>⧉</span>
        </button>
        <div className="row right">
          <button className="icon-btn" onClick={onLeave} title="Sair">
            ⏻
          </button>
        </div>
      </div>

      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="game-main">
        {activeTab === "map" && <MapView campaignId={campaignId} isGM={isGM} />}
        {activeTab === "init" && (
          <InitiativeView campaignId={campaignId} isGM={isGM} />
        )}
        {activeTab === "sheets" && (
          <CharacterPanel campaignId={campaignId} isGM={isGM} />
        )}
      </div>

      <RightPanel campaignId={campaignId} isGM={isGM} />
    </div>
  );
}