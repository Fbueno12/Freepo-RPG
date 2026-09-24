"use client";

import { useEffect, useState } from "react";
import { createToken, defaultVisibility } from "@/lib/tokens";
import { uploadTokenImage, validateTokenImage } from "@/lib/tokenImage";
import { subscribeCharacters } from "@/lib/characters";
import { subscribeNpcs, type CampaignNpc } from "@/lib/npcs";
import type { CharacterSheet, MapToken } from "@/lib/types";

interface TokenCreatorProps {
  campaignId: string;
  onClose: () => void;
  onNotice: (msg: string) => void;
}

const TOKEN_ICONS = ["🎹", "⚔️", "🧙", "🏹", "🗡️", "🛡️", "📜", "🐺", "🐗", "👹", "🧟"];

type ImageTab = "emoji" | "url" | "upload";

export function TokenCreator({ campaignId, onClose, onNotice }: TokenCreatorProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<MapToken["type"]>("npc");
  const [icon, setIcon] = useState("🐺");
  const [imageTab, setImageTab] = useState<ImageTab>("emoji");
  const [imageUrl, setImageUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState("");
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pcs, setPcs] = useState<CharacterSheet[]>([]);
  const [roster, setRoster] = useState<CampaignNpc[]>([]);

  useEffect(() => {
    const unsubChars = subscribeCharacters(campaignId, (all) =>
      setPcs(all.filter((c) => c.type === "pc")),
    );
    const unsubNpcs = subscribeNpcs(campaignId, setRoster);
    return () => {
      unsubChars();
      unsubNpcs();
    };
  }, [campaignId]);

  // Tipo define o padrão de visibilidade; GM pode trocar depois.
  // (atualizado nos handlers abaixo, sem useEffect)
  const applyType = (t: MapToken["type"]) => {
    setType(t);
    setVisible(defaultVisibility(t));
  };

  const pickFromRoster = (npc: CampaignNpc) => {
    setName(npc.name);
    setIcon(npc.icon || "👹");
    applyType("npc");
  };

  const pickFromSheet = (sheet: CharacterSheet) => {
    setName(sheet.name);
    applyType("pc");
    setOwnerId(sheet.userId || "");
  };

  const handleFile = (f: File | undefined) => {
    if (!f) return;
    const err = validateTokenImage(f);
    if (err) {
      onNotice(err);
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      let finalImageUrl = imageTab === "url" ? imageUrl.trim() || undefined : undefined;
      if (imageTab === "upload" && file) {
        // Upload usa nome temporário; a URL salva no token.
        finalImageUrl = await uploadTokenImage(
          campaignId,
          `pending-${Date.now().toString(36)}`,
          file,
        );
      }
      await createToken(campaignId, {
        name: name.trim(),
        icon,
        type,
        x: 45 + Math.random() * 10,
        y: 40 + Math.random() * 10,
        visible,
        imageUrl: finalImageUrl,
        ownerId: ownerId || undefined,
      });
      onNotice(
        type === "npc" && !visible
          ? `"${name.trim()}" criado escondido 👁️‍🗨️`
          : `"${name.trim()}" entrou no mapa ✓`,
      );
      onClose();
    } catch (e) {
      console.error("Erro ao criar token:", e);
      onNotice("Erro ao criar token.");
      setSaving(false);
    }
  };

  const shownImage = imageTab === "upload" ? preview : imageTab === "url" ? imageUrl.trim() || null : null;

  return (
    <div className="modal" onClick={onClose}>
      <div className="dialog token-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="pop-head">
          <span className="pop-title">Novo token</span>
          <button className="pop-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="row wrap">
          <div className="token-preview">
            {shownImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shownImage} alt="prévia do token" />
            ) : (
              <span>{icon}</span>
            )}
          </div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do token"
            className="input grow"
            autoFocus
          />
        </div>

        {(pcs.length > 0 || roster.length > 0) && (
          <div className="row wrap">
            {pcs.length > 0 && (
              <select
                className="input sm grow"
                value=""
                onChange={(e) => {
                  const sheet = pcs.find((c) => c.id === e.target.value);
                  if (sheet) pickFromSheet(sheet);
                }}
                title="Preencher a partir de uma ficha de jogador"
              >
                <option value="">Da ficha…</option>
                {pcs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
            {roster.length > 0 && (
              <select
                className="input sm grow"
                value=""
                onChange={(e) => {
                  const npc = roster.find((n) => n.id === e.target.value);
                  if (npc) pickFromRoster(npc);
                }}
                title="Preencher a partir do roster de NPCs"
              >
                <option value="">Do roster…</option>
                {roster.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <div className="seg">
          {(["emoji", "url", "upload"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setImageTab(t)}
              className={imageTab === t ? "seg-btn on" : "seg-btn"}
            >
              {t === "emoji" ? "Emoji" : t === "url" ? "URL" : "Upload"}
            </button>
          ))}
        </div>

        {imageTab === "emoji" && (
          <div className="icon-grid">
            {TOKEN_ICONS.map((i) => (
              <button
                key={i}
                onClick={() => setIcon(i)}
                className={icon === i ? "icon-cell on" : "icon-cell"}
              >
                {i}
              </button>
            ))}
          </div>
        )}
        {imageTab === "url" && (
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://…"
            className="input"
          />
        )}
        {imageTab === "upload" && (
          <label className="token-upload">
            <input
              type="file"
              accept="image/*"
              className="pdf-input-hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            {file ? `📷 ${file.name}` : "📷 Escolher imagem (máx. 2 MB)"}
          </label>
        )}

        <div className="seg">
          {(["pc", "npc", "gm"] as const).map((t) => (
            <button
              key={t}
              onClick={() => applyType(t)}
              className={type === t ? "seg-btn on" : "seg-btn"}
            >
              {t}
            </button>
          ))}
        </div>

        {type === "pc" && pcs.length > 0 && (
          <select
            className="input sm"
            value={ownerId}
            onChange={(e) => setOwnerId(e.target.value)}
            title="Jogador dono — só ele (e o mestre) move este token"
          >
            <option value="">Dono: ninguém</option>
            {pcs.map((c) => (
              <option key={c.id} value={c.userId}>
                Dono: {c.name}
              </option>
            ))}
          </select>
        )}

        <label className="token-check">
          <input
            type="checkbox"
            checked={visible}
            onChange={(e) => setVisible(e.target.checked)}
          />
          Visível para os jogadores
          {!visible && <span className="text-muted"> (nasce escondido)</span>}
        </label>

        <button
          className="btn btn-block"
          disabled={!name.trim() || saving}
          onClick={handleSubmit}
        >
          {saving ? "Criando…" : "Adicionar"}
        </button>
      </div>
    </div>
  );
}
