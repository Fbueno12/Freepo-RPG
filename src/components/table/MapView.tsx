"use client";

import { useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { setMapBackground, DEFAULT_MAP_BACKGROUND } from "@/lib/map";
import { canDragToken, tokenVisible, useTokens } from "@/hooks/useTokens";
import { TokenMarker } from "./TokenMarker";
import { TokenCreator } from "./TokenCreator";
import { TokenList } from "./TokenList";

interface MapViewProps {
  campaignId: string;
  isGM: boolean;
}

export function MapView({ campaignId, isGM }: MapViewProps) {
  const { user } = useAuth();
  const uid = user?.uid;
  const boardRef = useRef<HTMLDivElement | null>(null);
  const { tokens, background } = useTokens(campaignId, { isGM, uid });

  const [bgUrl, setBgUrl] = useState("");
  const [bgOpen, setBgOpen] = useState(false);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  const applyBackground = async () => {
    const url = bgUrl.trim();
    try {
      await setMapBackground(campaignId, url || DEFAULT_MAP_BACKGROUND);
      flash(`Fundo ${url ? "aplicado" : "padrão restaurado"} ✓`);
      setBgOpen(false);
    } catch (e) {
      console.error("Erro ao aplicar fundo:", e);
      flash("Erro ao aplicar fundo.");
    }
  };

  const rawBackground = background || DEFAULT_MAP_BACKGROUND;
  const backgroundImage =
    rawBackground.startsWith("url(") || rawBackground.includes("gradient")
      ? rawBackground
      : `url("${rawBackground}")`;

  // Jogadores nunca veem escondidos (query já filtra; dupla garantia aqui).
  const shown = tokens.filter((t) =>
    isGM ? true : tokenVisible(t) || (!!uid && t.ownerId === uid),
  );
  const hiddenCount = isGM ? tokens.length - shown.length : 0;

  return (
    <div className="map">
      <div
        className="map-bg"
        style={{
          backgroundImage:
            "linear-gradient(rgba(122,140,82,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(122,140,82,.04) 1px, transparent 1px), " +
            backgroundImage,
          backgroundSize: "44px 44px, 44px 44px, 100% 100%",
        }}
      />

      <div className="map-tokens" ref={boardRef}>
        {shown.map((token) => (
          <TokenMarker
            key={token.id}
            campaignId={campaignId}
            token={token}
            draggable={canDragToken(token, { isGM, uid })}
            isGM={isGM}
            boardRef={boardRef}
            onNotice={flash}
          />
        ))}
      </div>

      <div className="map-tools">
        {(creatorOpen || bgOpen || listOpen) && (
          <div
            className="map-backdrop"
            onClick={() => {
              setBgOpen(false);
              setListOpen(false);
            }}
          />
        )}
        {notice && <div className="notice">{notice}</div>}
        {isGM && (
          <>
            <button
              className="icon-btn"
              title="Adicionar token"
              onClick={() => setCreatorOpen(true)}
            >
              ＋
            </button>
            <button
              className="icon-btn"
              title={`Gerenciar tokens${hiddenCount > 0 ? ` (${hiddenCount} escondidos)` : ""}`}
              onClick={() => setListOpen(!listOpen)}
            >
              👥
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

        {listOpen && isGM && (
          <TokenList
            campaignId={campaignId}
            tokens={tokens}
            onClose={() => setListOpen(false)}
            onNotice={flash}
          />
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
            <button className="btn" onClick={applyBackground}>
              Aplicar fundo
            </button>
          </div>
        )}
      </div>

      {creatorOpen && isGM && (
        <TokenCreator
          campaignId={campaignId}
          onClose={() => setCreatorOpen(false)}
          onNotice={flash}
        />
      )}
    </div>
  );
}
