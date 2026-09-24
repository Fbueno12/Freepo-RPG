"use client";

import {
  removeTokenDoc,
  revealAllTokens,
  toggleTokenVisibility,
  defaultVisibility,
} from "@/lib/tokens";
import type { MapToken } from "@/lib/types";

interface TokenListProps {
  campaignId: string;
  tokens: MapToken[];
  onClose: () => void;
  onNotice: (msg: string) => void;
}

/** Painel do mestre: gerenciar visibilidade e remover tokens. */
export function TokenList({ campaignId, tokens, onClose, onNotice }: TokenListProps) {
  const hidden = tokens.filter((t) => !(t.visible ?? defaultVisibility(t.type)));
  const sorted = [...tokens].sort((a, b) => a.name.localeCompare(b.name));

  const toggle = (token: MapToken) => {
    const next = !(token.visible ?? defaultVisibility(token.type));
    void toggleTokenVisibility(campaignId, token.id, next).catch(() =>
      onNotice("Erro ao alternar visibilidade."),
    );
  };

  const remove = (token: MapToken) => {
    void removeTokenDoc(campaignId, token.id).catch(() =>
      onNotice("Erro ao remover token."),
    );
  };

  const revealAll = () => {
    void revealAllTokens(campaignId, tokens)
      .then(() => onNotice("Todos os tokens revelados 👁️"))
      .catch(() => onNotice("Erro ao revelar tokens."));
  };

  return (
    <div className="token-list">
      <div className="pop-head">
        <span className="pop-title">
          Tokens ({tokens.length}
          {hidden.length > 0 ? ` · ${hidden.length} escondidos` : ""})
        </span>
        <button className="pop-close" onClick={onClose}>
          ✕
        </button>
      </div>
      {hidden.length > 0 && (
        <button className="btn btn-sm btn-block" onClick={revealAll}>
          👁️ Revelar todos
        </button>
      )}
      <div className="token-list-rows">
        {sorted.length === 0 && (
          <p className="text-muted text-sm">Nenhum token no mapa.</p>
        )}
        {sorted.map((t) => {
          const vis = t.visible ?? defaultVisibility(t.type);
          return (
            <div key={t.id} className="token-row">
              <span className="token-row-ico">
                {t.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.imageUrl} alt="" />
                ) : (
                  t.icon
                )}
              </span>
              <span className="grow">
                <div className="text-text" style={{ fontSize: 13, fontWeight: 600 }}>
                  {t.name} {!vis && "👁️‍🗨️"}
                </div>
                <small className="text-muted text-xs">
                  {t.type}
                  {t.ownerId ? " · tem dono" : ""}
                </small>
              </span>
              <button
                className="icon-btn micro"
                title={vis ? "Esconder" : "Revelar"}
                onClick={() => toggle(t)}
              >
                {vis ? "👁️" : "👁️‍🗨️"}
              </button>
              <button
                className="icon-btn micro"
                title="Remover"
                onClick={() => remove(t)}
              >
                🗑
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
