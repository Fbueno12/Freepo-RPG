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

  const refresh = useCallback(async () => {
    if (!user) return;
    const list = await getUserCampaigns(user.uid);
    const enriched: CampaignCard[] = await Promise.all(
      list.map(async (c) => ({
        ...c,
        memberCount: await getMemberCount(c.id),
        role: (await getMemberRole(c.id, user.uid)) ?? "pc",
      })),
    );
    setCampaigns(enriched);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    getUserCampaigns(user.uid)
      .then(async (list) => {
        const enriched: CampaignCard[] = await Promise.all(
          list.map(async (c) => ({
            ...c,
            memberCount: await getMemberCount(c.id),
            role: (await getMemberRole(c.id, user.uid)) ?? "pc",
          })),
        );
        setCampaigns(enriched);
      })
      .catch((e) => {
        console.error("Erro ao carregar campanhas:", e);
        setError(
          "Não foi possível carregar suas campanhas. Verifique se as regras " +
            "do Firestore foram publicadas e tente novamente.",
        );
      })
      .finally(() => setLoading(false));
  }, [user]);

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
    <div className="px-10 py-9 max-w-[1100px] mx-auto">
      <div className="flex items-center gap-4 mb-2">
        <div>
          <h1 className="text-[26px] text-text">Suas campanhas</h1>
          <div className="text-muted text-[13px]">
            Bem-vindo de volta, {user?.email?.split("@")[0] || "mestre"}!
          </div>
        </div>
        <div className="ml-auto flex gap-2.5">
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

      {error && (
        <div className="mt-4 p-3 text-xs rounded-lg border border-red/40 bg-red/10 text-red">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-muted text-sm mt-[26px]">Carregando…</div>
      ) : campaigns.length === 0 ? (
        <div className="text-muted text-sm mt-[26px]">
          Nenhuma campanha ainda. Crie uma para começar!
        </div>
      ) : (
        <div className="grid gap-[18px] mt-[26px] grid-cols-[repeat(auto-fill,minmax(290px,1fr))]">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              onClick={() => onOpenCampaign(campaign.id)}
              className="bg-panel border border-border rounded-xl p-5 relative transition-all duration-200 cursor-pointer hover:border-accent-dark hover:-translate-y-0.5 hover:shadow-[0_12px_36px_rgba(0,0,0,.4)]"
            >
              <div className="text-[18px] text-accent">{campaign.name}</div>
              <div className="text-muted text-xs mt-1.5 mb-3.5">
                {campaign.system} · Nível {campaign.level} ·{" "}
                {campaign.memberCount} jogadores
              </div>
              <button
                className="flex items-center gap-1.5 text-[11px] text-muted hover:text-glow transition-colors mb-2"
                onClick={(e) => {
                  e.stopPropagation();
                  void navigator.clipboard?.writeText(campaign.id);
                }}
                title="Copiar código da campanha"
              >
                <span className="font-mono">#{campaign.id.slice(0, 8)}</span>
                <span>copiar</span>
              </button>
              <span
                className={`absolute top-4 right-4 text-[11px] px-2.5 py-0.5 rounded-full font-bold ${
                  campaign.role === "gm"
                    ? "bg-[rgba(199,91,42,.12)] text-danger border border-[rgba(199,91,42,.35)]"
                    : "bg-[rgba(95,212,208,.1)] text-glow border border-[rgba(95,212,208,.3)]"
                }`}
              >
                {campaign.role === "gm" ? "MESTRE" : "JOGADOR"}
              </span>
              <div className="flex gap-2">
                <div className="w-[34px] h-[34px] rounded-full bg-panel3 border border-border-light flex items-center justify-center text-sm overflow-hidden">
                  <Image
                    src="/Freepo.jpeg"
                    alt="Freepo"
                    width={34}
                    height={34}
                    className="w-full h-full object-cover"
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
    <div
      className="fixed inset-0 z-50 bg-[rgba(10,8,5,.75)] backdrop-blur-[3px] flex items-start justify-center p-10 overflow-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] bg-panel border border-border rounded-2xl p-9 shadow-[0_24px_70px_rgba(0,0,0,.55)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-glow text-xl text-center mb-6">
          Entrar por código
        </h2>
        <p className="text-muted text-xs text-center mb-5">
          Peça o código da campanha para o mestre e cole aqui.
        </p>
        {error && (
          <div className="mb-4 p-3 text-xs rounded-lg border border-red/40 bg-red/10 text-red">
            {error}
          </div>
        )}
        <div className="field">
          <label>Código da campanha</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="ex.: wQ7Kx…"
            autoFocus
          />
        </div>
        <div className="flex gap-2.5 mt-4">
          <button
            className="btn flex-1"
            onClick={submit}
            disabled={busy || !code.trim()}
          >
            {busy ? "Entrando…" : "Entrar"}
          </button>
          <button className="btn btn-ghost flex-1" onClick={onClose}>
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
    <div
      className="fixed inset-0 z-50 bg-[rgba(10,8,5,.75)] backdrop-blur-[3px] flex items-start justify-center p-10 overflow-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] bg-panel border border-border rounded-2xl p-9 shadow-[0_24px_70px_rgba(0,0,0,.55)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-glow text-xl text-center mb-6">
          Nova campanha
        </h2>
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
          <input
            value={system}
            onChange={(e) => setSystem(e.target.value)}
          />
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
        <div className="flex gap-2.5 mt-4">
          <button
            className="btn flex-1"
            onClick={() => name.trim() && onConfirm(name.trim(), system, level)}
            disabled={!name.trim()}
          >
            Criar
          </button>
          <button className="btn btn-ghost flex-1" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}