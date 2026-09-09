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
    const container = e.currentTarget.parentElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
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
      setNotice(`Fundo ${url ? "aplicado" : "padrão restaurado"} ✓`);
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
    rawBackground.startsWith("url(") || rawBackground.includes("gradient")
      ? rawBackground
      : `url("${rawBackground}")`;

  return (
    <div
      className="map"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <div
        className="map-bg"
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
            className="mtoken-wrap"
            style={{ left: `${token.x}%`, top: `${token.y}%` }}
          >
            <div className={`mtoken ${token.type}`}>
              <div>{hidden ? "❓" : token.icon}</div>
              <span className="nm">
                {hidden ? "???" : token.name}
                {token.type === "npc" && isGM && (
                  <b className="gm-flag">GM</b>
                )}
              </span>
              {isGM && (
                <button
                  className="token-remove"
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
    <div className="map-tools">
      {(addOpen || bgOpen) && (
        <div
          className="map-backdrop"
          onClick={() => {
            setAddOpen(false);
            setBgOpen(false);
          }}
        />
      )}
      {notice && <div className="notice">{notice}</div>}
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
        <div className="pop-menu">
          <div className="pop-head">
            <span className="pop-title">Novo token</span>
            <button className="pop-close" onClick={() => setAddOpen(false)}>
              ✕
            </button>
          </div>
          <input
            type="text"
            value={tokenName}
            onChange={(e) => setTokenName(e.target.value)}
            placeholder="Nome do token"
            className="input"
            autoFocus
          />
          <div className="icon-grid">
            {TOKEN_ICONS.map((i) => (
              <button
                key={i}
                onClick={() => setTokenIcon(i)}
                className={tokenIcon === i ? "icon-cell on" : "icon-cell"}
              >
                {i}
              </button>
            ))}
          </div>
          <div className="seg">
            {(["pc", "npc", "gm"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTokenType(t)}
                className={tokenType === t ? "seg-btn on" : "seg-btn"}
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
        <div className="pop-menu wide">
          <div className="pop-head">
            <label className="pop-title">URL da imagem de fundo</label>
            <button className="pop-close" onClick={() => setBgOpen(false)}>
              ✕
            </button>
          </div>
          <input
            type="url"
            value={bgUrl}
            onChange={(e) => setBgUrl(e.target.value)}
            placeholder="https://…"
            className="input"
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