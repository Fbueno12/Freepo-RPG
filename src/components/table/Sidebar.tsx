"use client";

import Image from "next/image";

export type SidebarTab = "map" | "init" | "sheets";

interface SidebarProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
}

const TABS: { id: SidebarTab; icon: string; label: string }[] = [
  { id: "map", icon: "📍", label: "Mapa" },
  { id: "init", icon: "⚔️", label: "Combate" },
];

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="g-side">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={activeTab === tab.id ? "tab on" : "tab"}
        >
          <span>{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}

      <div className="spacer" />

      <button
        onClick={() => onTabChange("sheets")}
        className={activeTab === "sheets" ? "tab on" : "tab"}
      >
        <span>🎹</span>
        <span>Fichas</span>
      </button>
      <div className="mini">
        <Image src="/Freepo.jpeg" alt="Freepo" width={40} height={40} />
      </div>
    </aside>
  );
}