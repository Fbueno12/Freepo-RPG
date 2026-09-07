"use client";

import { useEffect, useState } from "react";
import {
  subscribeMap,
  setMapBackground,
  addToken,
  moveToken,
  removeToken,
  DEFAULT_MAP_BACKGROUND,
} from "@/lib/map";
import type { MapState, MapToken } from "@/lib/types";

interface MapViewProps {
  campaignId: string;
  isGM: boolean;
}

export function MapView({ campaignId, isGM }: MapViewProps) {
  const [map, setMapState] = useState<MapState | null>(null);
  const [bgUrl, setBgUrl] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeMap(campaignId, setMapState);
    return () => unsub();
  }, [campaignId]);

  const handleDragEnd = (
    e: React.DragEvent<HTMLDivElement>,
    token: MapToken,
  ) => {
    if (!isGM || !map) return;
    const bounds = e.currentTarget.closest(".g-main") as HTMLDivElement | null;
    const container = e.currentTarget.parentElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    void bounds;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    void moveToken(campaignId, map, token.id, x, y);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isGM || !map) return;
    const tokenId = e.dataTransfer.getData("text/plain");
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    if (tokenId) {
      void moveToken(campaignId, map, tokenId, x, y);
    }
  };

  const applyBackground = async () => {
    const url = bgUrl.trim();
    try {
      await setMapBackground(campaignId, url || DEFAULT_MAP_BACKGROUND);
      setNotice(
        `Fundo ${url ? "aplicado" : "padrão restaurado"} ✓`,
      );
      setTimeout(() => setNotice(null), 3000);
    } catch (e) {
      console.error("Erro ao aplicar fundo:", e);
      const msg = (e as { message?: string }).message ?? String(e);
      setNotice(`Erro: ${msg}`);
    }
  };

  const handleAddToken = async (
    token: { icon: string; name: string; type: MapToken["type"] },
  ) => {
    try {
      await addToken(campaignId, map, {
        ...token,
        x: 45 + Math.random() * 10,
        y: 40 + Math.random() * 10,
      });
    } catch (e) {
      console.error("Erro ao adicionar token:", e);
      const msg = (e as { message?: string }).message ?? String(e);
      setNotice(`Erro ao criar token: ${msg}`);
    }
  };

  const rawBackground = map?.backgroundImage || DEFAULT_MAP_BACKGROUND;
  const backgroundImage =
    rawBackground.startsWith("url(") ||
    rawBackground.includes("gradient")
      ? rawBackground
      : `url("${rawBackground}")`;

  return (
    <div
      className="relative h-full overflow-hidden"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(122,140,82,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(122,140,82,.04) 1px, transparent 1px), " +
            backgroundImage,
          backgroundSize: "44px 44px, 44px 44px, 100% 100%",
        }}
      />

      {(map?.tokens ?? []).map((token) => {
        const hidden = token.type !== "pc" && !isGM;
        return (
          <div
            key={token.id}
            draggable={isGM}
            onDragEnd={(e) => handleDragEnd(e, token)}
            className="absolute z-10"
            style={{ left: `${token.x}%`, top: `${token.y}%` }}
          >
            <div
              className={`w-[52px] h-[52px] rounded-full flex items-center justify-center text-[22px] cursor-grab border-3 bg-panel3 shadow-[0_4px_16px_rgba(0,0,0,.55),inset_0_-6px_12px_rgba(0,0,0,.3)] -translate-x-1/2 -translate-y-1/2 ${
                token.type === "pc"
                  ? "border-glow shadow-[0_0_14px_rgba(95,212,208,.2)]"
                  : token.type === "npc"
                    ? "border-danger shadow-[0_0_10px_rgba(199,91,42,.15)]"
                    : "border-gold"
              }`}
            >
              <div>{hidden ? "❓" : token.icon}</div>
              <span className="absolute -bottom-[22px] left-1/2 -translate-x-1/2 text-[11px] font-bold whitespace-nowrap bg-[rgba(17,15,12,.9)] px-[7px] py-0.5 rounded-md border border-border-light">
                {hidden ? "???" : token.name}
                {token.type === "npc" && isGM && (
                  <b className="absolute -top-1.5 -right-1.5 text-[11px] bg-gold text-[#1a1205] rounded-lg px-[5px] font-extrabold">
                    GM
                  </b>
                )}
              </span>
              {isGM && (
                <button
                  className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-bg border border-border-light text-muted text-[10px] leading-none"
                  title="Remover token"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (map) void removeToken(campaignId, map, token.id);
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        );
      })}

      <MapTools
        isGM={isGM}
        bgUrl={bgUrl}
        setBgUrl={setBgUrl}
        notice={notice}
        onApplyBackground={applyBackground}
        onAddToken={handleAddToken}
      />
    </div>
  );
}

const TOKEN_ICONS = ["🎹", "⚔️", "🧙", "🏹", "🗡️", "🛡️", "📜", "🐺", "🐗", "👹", "🧟"];

function MapTools({
  isGM,
  bgUrl,
  setBgUrl,
  notice,
  onApplyBackground,
  onAddToken,
}: {
  isGM: boolean;
  bgUrl: string;
  setBgUrl: (v: string) => void;
  notice: string | null;
  onApplyBackground: () => void;
  onAddToken: (token: { icon: string; name: string; type: MapToken["type"] }) => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [tokenName, setTokenName] = useState("");
  const [tokenIcon, setTokenIcon] = useState("🐺");
  const [tokenType, setTokenType] = useState<MapToken["type"]>("npc");
  const [bgOpen, setBgOpen] = useState(false);

  return (
    <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-1.5">
      {(addOpen || bgOpen) && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => {
            setAddOpen(false);
            setBgOpen(false);
          }}
        />
      )}
      {notice && (
        <div className="bg-panel2 border border-border-light rounded-lg px-3 py-2 text-xs text-text shadow-[0_10px_30px_rgba(0,0,0,.5)] max-w-[260px]">
          {notice}
        </div>
      )}
      {isGM && (
        <>
          <button
            className="icon-btn"
            title="Adicionar token"
            onClick={() => setAddOpen(!addOpen)}
          >
            ＋
          </button>
          <button
            className="icon-btn"
            title="Imagem de fundo"
            onClick={() => setBgOpen(!bgOpen)}
          >
            🖼
          </button>
        </>
      )}
      <button className="icon-btn" title="Zoom (placeholder)">
        ⤢
      </button>

      {addOpen && (
        <div className="absolute right-0 top-0 z-20 w-56 bg-panel2 border border-border-light rounded-xl p-3 flex flex-col gap-2 shadow-[0_12px_36px_rgba(0,0,0,.5)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text">Novo token</span>
            <button
              className="text-muted hover:text-text text-xs"
              onClick={() => setAddOpen(false)}
            >
              ✕
            </button>
          </div>
          <input
            type="text"
            value={tokenName}
            onChange={(e) => setTokenName(e.target.value)}
            placeholder="Nome do token"
            className="px-2.5 py-1.5 rounded-md bg-bg border border-border-light text-text text-sm focus:outline-none focus:border-glow-dark"
            autoFocus
          />
          <div className="flex flex-wrap gap-1">
            {TOKEN_ICONS.map((i) => (
              <button
                key={i}
                onClick={() => setTokenIcon(i)}
                className={`w-7 h-7 rounded-md flex items-center justify-center text-sm border ${
                  tokenIcon === i ? "border-glow-dark bg-panel3" : "border-border bg-bg"
                }`}
              >
                {i}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            {(["pc", "npc", "gm"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTokenType(t)}
                className={`flex-1 text-[10px] font-bold px-1.5 py-1 rounded-md border uppercase ${
                  tokenType === t
                    ? "border-glow-dark bg-panel3 text-glow"
                    : "border-border bg-bg text-muted"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <button
            className="btn"
            disabled={!tokenName.trim()}
            onClick={() => {
              onAddToken({
                icon: tokenIcon,
                name: tokenName.trim(),
                type: tokenType,
              });
              setTokenName("");
              setAddOpen(false);
            }}
          >
            Adicionar
          </button>
        </div>
      )}

      {bgOpen && (
        <div className="absolute right-0 top-0 z-20 w-64 bg-panel2 border border-border-light rounded-xl p-3 flex flex-col gap-2 shadow-[0_12px_36px_rgba(0,0,0,.5)]">
          <div className="flex items-center justify-between">
            <label className="text-[11px] text-muted font-semibold">
              URL da imagem de fundo
            </label>
            <button
              className="text-muted hover:text-text text-xs"
              onClick={() => setBgOpen(false)}
            >
              ✕
            </button>
          </div>
          <input
            type="url"
            value={bgUrl}
            onChange={(e) => setBgUrl(e.target.value)}
            placeholder="https://…"
            className="px-2.5 py-1.5 rounded-md bg-bg border border-border-light text-text text-sm focus:outline-none focus:border-glow-dark"
          />
          <button
            className="btn"
            onClick={() => {
              onApplyBackground();
              setBgOpen(false);
            }}
          >
            Aplicar fundo
          </button>
        </div>
      )}
    </div>
  );
}