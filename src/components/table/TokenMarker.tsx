"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { moveTokenTo, toggleTokenVisibility, removeTokenDoc } from "@/lib/tokens";
import { tokenVisible } from "@/hooks/useTokens";
import type { MapToken } from "@/lib/types";

interface TokenMarkerProps {
  campaignId: string;
  token: MapToken;
  draggable: boolean;
  isGM: boolean;
  boardRef: RefObject<HTMLDivElement | null>;
  onNotice: (msg: string) => void;
}

const PERSIST_THROTTLE_MS = 250;

function toPercent(
  board: HTMLDivElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const rect = board.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * 100,
    y: ((clientY - rect.top) / rect.height) * 100,
  };
}

/** Um token no tabuleiro: arrasto por Pointer Events (mouse + touch). */
export function TokenMarker({
  campaignId,
  token,
  draggable,
  isGM,
  boardRef,
  onNotice,
}: TokenMarkerProps) {
  const [pos, setPos] = useState({ x: token.x, y: token.y });
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);
  const lastPersistRef = useRef(0);
  const visible = tokenVisible(token);

  // Sincroniza com o servidor quando não estamos arrastando.
  useEffect(() => {
    if (!draggingRef.current) setPos({ x: token.x, y: token.y });
  }, [token.x, token.y]);

  const persist = (x: number, y: number) => {
    lastPersistRef.current = Date.now();
    void moveTokenTo(campaignId, token.id, x, y).catch((e) => {
      console.error("Erro ao mover token:", e);
      onNotice("Erro ao mover token.");
    });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggable || e.button !== 0) return;
    const board = boardRef.current;
    if (!board) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    setDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const board = boardRef.current;
    if (!board) return;
    const { x, y } = toPercent(board, e.clientX, e.clientY);
    const clamped = {
      x: Math.min(100, Math.max(0, x)),
      y: Math.min(100, Math.max(0, y)),
    };
    setPos(clamped);
    // Persiste throttled durante o arrasto; posição final vai no pointerup.
    if (Date.now() - lastPersistRef.current > PERSIST_THROTTLE_MS) {
      persist(clamped.x, clamped.y);
    }
  };

  const handlePointerUp = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    setPos((p) => {
      persist(p.x, p.y);
      return p;
    });
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    void toggleTokenVisibility(campaignId, token.id, !visible).catch((err) => {
      console.error("Erro ao revelar/esconder:", err);
      onNotice("Erro ao alternar visibilidade.");
    });
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    void removeTokenDoc(campaignId, token.id).catch((err) => {
      console.error("Erro ao remover token:", err);
      onNotice("Erro ao remover token.");
    });
  };

  return (
    <div
      className="mtoken-wrap"
      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
    >
      <div
        className={
          `mtoken ${token.type}` +
          (!visible ? " hidden-token" : "") +
          (dragging ? " dragging" : "") +
          (draggable ? " can-drag" : " locked")
        }
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        title={draggable ? "Arraste para mover" : token.name}
      >
        {token.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={token.imageUrl} alt={token.name} draggable={false} />
        ) : (
          <div>{token.icon}</div>
        )}
        <span className="nm">
          {token.name}
          {!visible && <b className="gm-flag">👁️‍🗨️</b>}
        </span>
        {isGM && (
          <>
            <button
              className="token-eye"
              title={visible ? "Esconder dos jogadores" : "Revelar para jogadores"}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={handleToggle}
            >
              {visible ? "👁️" : "👁️‍🗨️"}
            </button>
            <button
              className="token-remove"
              title="Remover token"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={handleRemove}
            >
              ✕
            </button>
          </>
        )}
      </div>
    </div>
  );
}
