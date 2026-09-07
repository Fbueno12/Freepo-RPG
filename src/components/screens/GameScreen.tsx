"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Sidebar, type SidebarTab } from "@/components/table/Sidebar";
import { MapView } from "@/components/table/MapView";
import { DiceView } from "@/components/table/DiceView";
import { InitiativeView } from "@/components/table/InitiativeView";
import { RightPanel } from "@/components/table/RightPanel";
import { CharacterPanel } from "@/components/table/CharacterPanel";
import { getCampaign, getMemberRole } from "@/lib/campaigns";
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

  return (
    <div className="grid h-[calc(100vh-48px)] grid-cols-[66px_1fr_330px] grid-rows-[44px_1fr]">
      <div className="col-span-3 flex items-center gap-3 px-4 bg-bg2 border-b border-border">
        <button className="icon-btn" onClick={onLeave} title="Voltar">
          ←
        </button>
        <div className="font-cinzel font-bold text-accent">
          {campaign?.name ?? "Carregando…"}
        </div>
        <div className="w-px h-[22px] bg-border-light" />
        <span className="text-muted text-xs">
          {campaign ? `${campaign.system} · Nível ${campaign.level}` : ""}
        </span>
        <div className="w-px h-[22px] bg-border-light" />
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-[rgba(199,91,42,.12)] text-danger border border-[rgba(199,91,42,.35)]">
          {isGM ? "MESTRE" : "JOGADOR"}
        </span>
        <div className="w-px h-[22px] bg-border-light" />
        <button
          className="flex items-center gap-1.5 text-[11px] text-muted hover:text-glow transition-colors"
          onClick={() => void navigator.clipboard?.writeText(campaignId)}
          title="Código da campanha — envie para os jogadores entrarem (clique para copiar)"
        >
          <span>Código:</span>
          <span className="font-mono text-glow">
            #{campaignId.slice(0, 8)}
          </span>
          <span>⧉</span>
        </button>
        <div className="ml-auto flex items-center gap-2.5">
          <button className="icon-btn" onClick={onLeave} title="Sair">
            ⏻
          </button>
        </div>
      </div>

      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="bg-bg overflow-hidden relative">
        {activeTab === "map" && <MapView campaignId={campaignId} isGM={isGM} />}
        {activeTab === "dice" && <DiceView campaignId={campaignId} />}
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