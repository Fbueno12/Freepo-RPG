"use client";

import Image from "next/image";

export type SidebarTab = "map" | "dice" | "init" | "sheets";

interface SidebarProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
}

const TABS: { id: SidebarTab; icon: string; label: string }[] = [
  { id: "map", icon: "📍", label: "Mapa" },
  { id: "dice", icon: "🎲", label: "Dados" },
  { id: "init", icon: "⚔️", label: "Combate" },
];

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="bg-bg2 border-r border-border flex flex-col items-center py-2.5 gap-1.5">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`w-[46px] h-[46px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-[17px] transition-colors ${
            activeTab === tab.id
              ? "bg-panel2 text-glow border border-border-light"
              : "bg-transparent text-muted border border-transparent hover:text-text"
          }`}
        >
          <div>{tab.icon}</div>
          <span className="text-[9px] font-bold">{tab.label}</span>
        </button>
      ))}

      <div className="flex-1" />

      <button
        onClick={() => onTabChange("sheets")}
        className={`w-[46px] h-[46px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-[17px] transition-colors ${
          activeTab === "sheets"
            ? "bg-panel2 text-glow border border-border-light"
            : "bg-transparent text-muted border border-transparent hover:text-text"
        }`}
      >
        <div>🎹</div>
        <span className="text-[9px] font-bold">Fichas</span>
      </button>
      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-accent-dark shadow-[0_0_10px_rgba(95,212,208,.15)]">
        <Image
          src="/Freepo.jpeg"
          alt="Freepo"
          width={40}
          height={40}
          className="w-full h-full object-cover"
        />
      </div>
    </aside>
  );
}