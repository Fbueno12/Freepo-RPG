"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUserCampaigns,
  getMemberCount,
  getMemberRole,
  createCampaign,
  joinCampaign,
  getCampaign,
} from "@/lib/campaigns";
import type { Campaign } from "@/lib/types";

interface CampaignCard extends Campaign {
  memberCount: number;
  role: "gm" | "pc";
}

interface LobbyScreenProps {
  onOpenCampaign: (id: string) => void;
}

export function LobbyScreen({ onOpenCampaign }: LobbyScreenProps) {
  const { user, logout } = useAuth();
  const [campaigns, setCampaigns] = useState<CampaignCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const loadCampaigns = useCallback(async (): Promise<CampaignCard[]> => {
    if (!user) return [];
    const list = await getUserCampaigns(user.uid);
    return Promise.all(
      list.map(async (c) => ({
        ...c,
        memberCount: await getMemberCount(c.id),
        role: (await getMemberRole(c.id, user.uid)) ?? "pc",
      })),
    );
  }, [user]);

  const refresh = useCallback(async () => {
    setCampaigns(await loadCampaigns());
    setError(null);
  }, [loadCampaigns]);

  useEffect(() => {
    let active = true;
    void loadCampaigns()
      .then((enriched) => {
        if (active) setCampaigns(enriched);
      })
      .catch((e) => {
        if (!active) return;
        console.error("Erro ao carregar campanhas:", e);
        setError(
          "Não foi possível carregar suas campanhas. Verifique se as regras " +
            "do Firestore foram publicadas e tente novamente.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadCampaigns]);

  const handleCreate = async (name: string, system: string, level: number) => {
    if (!user) return;
    try {
      const id = await createCampaign(name, system, level, user.uid);
      setShowCreate(false);
      onOpenCampaign(id);
    } catch (e) {
      console.error("Erro ao criar campanha:", e);
    }
  };

  const handleJoin = async (campaignId: string) => {
    if (!user) return;
    await joinCampaign(campaignId, user.uid);
    setShowJoin(false);
    await refresh();
  };

  return (
    <div className="lobby">
      <div className="lobby-head">
        <div>
          <h1 className="lobby-title">Suas campanhas</h1>
          <div className="lobby-who">
            Bem-vindo de volta, {user?.email?.split("@")[0] || "mestre"}!
          </div>
        </div>
        <div className="lobby-actions">
          <button className="btn btn-ghost" onClick={() => setShowJoin(true)}>
            + Entrar por código
          </button>
          <button className="btn" onClick={() => setShowCreate(true)}>
            Nova campanha
          </button>
          <button className="btn btn-ghost" onClick={logout}>
            Sair
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error lobby-note">{error}</div>}

      {loading ? (
        <div className="lobby-empty">Carregando…</div>
      ) : campaigns.length === 0 ? (
        <div className="lobby-empty">
          Nenhuma campanha ainda. Crie uma para começar!
        </div>
      ) : (
        <div className="lobby-grid">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              onClick={() => onOpenCampaign(campaign.id)}
              className="camp"
            >
              <div className="camp-name">{campaign.name}</div>
              <div className="camp-meta">
                {campaign.system} · Nível {campaign.level} ·{" "}
                {campaign.memberCount} jogadores
              </div>
              <button
                className="camp-code"
                onClick={(e) => {
                  e.stopPropagation();
                  void navigator.clipboard?.writeText(campaign.id);
                }}
                title="Copiar código da campanha"
              >
                <span className="mono">#{campaign.id.slice(0, 8)}</span>
                <span>copiar</span>
              </button>
              <span
                className={`camp-stamp ${campaign.role === "gm" ? "gm" : "pc"}`}
              >
                {campaign.role === "gm" ? "MESTRE" : "JOGADOR"}
              </span>
              <div className="crew">
                <div className="ava">
                  <Image
                    src="/Freepo.jpeg"
                    alt="Freepo"
                    width={34}
                    height={34}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateCampaignModal
          onConfirm={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}
      {showJoin && (
        <JoinCampaignModal
          onConfirm={handleJoin}
          onClose={() => setShowJoin(false)}
        />
      )}
    </div>
  );
}

function JoinCampaignModal({
  onConfirm,
  onClose,
}: {
  onConfirm: (campaignId: string) => void | Promise<void>;
  onClose: () => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const id = code.trim();
    if (!id) {
      setError("Informe o código da campanha.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const campaign = await getCampaign(id);
      if (!campaign) {
        setError("Nenhuma campanha com esse código foi encontrada.");
        return;
      }
      await onConfirm(id);
    } catch (e) {
      console.error("Erro ao entrar na campanha:", e);
      setError("Não foi possível entrar na campanha. Tente novamente.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal modal-scroll" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h2 className="dialog-title">Entrar por código</h2>
        <p className="dialog-sub">
          Peça o código da campanha para o mestre e cole aqui.
        </p>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="field">
          <label>Código da campanha</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="ex.: wQ7Kx…"
            autoFocus
          />
        </div>
        <div className="dialog-actions">
          <button
            className="btn"
            onClick={submit}
            disabled={busy || !code.trim()}
          >
            {busy ? "Entrando…" : "Entrar"}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateCampaignModal({
  onConfirm,
  onClose,
}: {
  onConfirm: (name: string, system: string, level: number) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [system, setSystem] = useState("Runarcana");
  const [level, setLevel] = useState(1);

  return (
    <div className="modal modal-scroll" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h2 className="dialog-title">Nova campanha</h2>
        <div className="field">
          <label>Nome da campanha</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Floresta de Verdan"
          />
        </div>
        <div className="field">
          <label>Sistema</label>
          <input value={system} onChange={(e) => setSystem(e.target.value)} />
        </div>
        <div className="field">
          <label>Nível inicial</label>
          <input
            type="number"
            min={1}
            max={20}
            value={level}
            onChange={(e) => setLevel(Number(e.target.value))}
          />
        </div>
        <div className="dialog-actions">
          <button
            className="btn"
            onClick={() => name.trim() && onConfirm(name.trim(), system, level)}
            disabled={!name.trim()}
          >
            Criar
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}