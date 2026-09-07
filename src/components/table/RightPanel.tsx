"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeChat, sendChatMessage, subscribeNotes, saveNotes } from "@/lib/campaigns";
import { rollFormula } from "@/lib/dice";
import type { ChatMessage, DiceRoll } from "@/lib/types";

type RightTab = "chat" | "notes" | "music";

interface RightPanelProps {
  campaignId: string;
  isGM: boolean;
}

export function RightPanel({ campaignId, isGM }: RightPanelProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<RightTab>("chat");

  return (
    <div className="bg-bg2 border-l border-border flex flex-col min-h-0">
      <div className="flex border-b border-border">
        {([
          ["chat", "💬 Chat"],
          ["notes", "📝 Anotações"],
          ["music", "🎵 Música"],
        ] as [RightTab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 py-[11px] bg-transparent font-semibold text-xs transition-colors ${
              activeTab === id
                ? "text-glow border-b-2 border-glow"
                : "text-muted border-b-2 border-transparent"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden relative min-h-0">
        {activeTab === "chat" && (
          <ChatPanel campaignId={campaignId} userName={user?.email?.split("@")[0] ?? "jogador"} />
        )}
        {activeTab === "notes" && (
          <NotesPanel campaignId={campaignId} />
        )}
        {activeTab === "music" && <MusicPanel campaignId={campaignId} isGM={isGM} />}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Chat
// ──────────────────────────────────────────────

function ChatPanel({
  campaignId,
  userName,
}: {
  campaignId: string;
  userName: string;
}) {
  const { user } = useAuth();
  const { message: soundMessage, dice: soundDice } = useSound();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [formula, setFormula] = useState("1d20+5");
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevCount = useRef(0);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    const unsub = subscribeChat(campaignId, setMessages);
    return () => unsub();
  }, [campaignId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    if (messages.length > prevCount.current && !isFirstLoad.current) {
      const last = messages[messages.length - 1];
      if (last.userId !== user?.uid) soundMessage();
    }
    prevCount.current = messages.length;
    isFirstLoad.current = false;
  }, [messages, user?.uid, soundMessage]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !user) return;
    await sendChatMessage(campaignId, user.uid, userName, text);
    setInput("");
  };

  const rollQuick = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const result = rollFormula(formula);
    const roll: DiceRoll = {
      formula,
      dice: result.dice,
      modifier: result.modifier,
      total: result.total,
      label: formula,
    };
    await sendChatMessage(
      campaignId,
      user.uid,
      userName,
      `🎲 ${formula} → ${result.total}`,
      roll,
    );
    soundDice();
  };

  return (
    <div className="h-full flex flex-col">
      <div ref={scrollRef} className="flex-1 overflow-auto p-4 flex flex-col gap-3.5">
        {messages.length === 0 && (
          <div className="text-muted text-xs text-center mt-4">
            Nenhuma mensagem ainda. Diga olá!
          </div>
        )}
        {messages.map((message) => {
          const time = message.createdAt?.toDate?.()
            ? message.createdAt.toDate().toTimeString().slice(0, 5)
            : "";
          const isDice = Boolean(message.diceRoll);
          return (
            <div key={message.id} className="max-w-[88%]">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-xs font-bold ${
                    message.diceRoll ? "text-gold-light" : "text-glow"
                  }`}
                >
                  {message.userName}
                </span>
                <time className="text-[10px] text-[#5c5044]">{time}</time>
              </div>
              <div
                className={`rounded-[4px_12px_12px_12px] px-3 py-2 ${
                  isDice
                    ? "bg-bg border border-border-light"
                    : "bg-panel border border-border"
                }`}
              >
                {isDice && message.diceRoll ? (
                  <div className="font-cinzel text-[15px] text-gold-light leading-relaxed">
                    🎲 {message.diceRoll.formula} →{" "}
                    {message.diceRoll.dice?.length
                      ? `[${message.diceRoll.dice.join(", ")}]`
                      : ""}
                    {message.diceRoll.modifier ? (
                      <span>
                        {" "}
                        {message.diceRoll.modifier > 0 ? "+" : "-"}{" "}
                        {Math.abs(message.diceRoll.modifier)}
                      </span>
                    ) : null}{" "}
                    = <b>{message.diceRoll.total}</b>
                    {message.diceRoll.label &&
                      message.diceRoll.label !== message.diceRoll.formula && (
                        <span className="block font-inter text-[11px] text-muted normal-case">
                          {message.diceRoll.label}
                        </span>
                      )}
                  </div>
                ) : (
                  <div className="text-[13px] leading-[1.55]">{message.text}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <form
        onSubmit={send}
        className="border-t border-border p-3 flex flex-col gap-2 bg-bg2"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Fale com a mesa…"
            className="flex-1 px-3 py-2.5 rounded-[10px] bg-bg border border-border-light text-text focus:outline-none focus:border-glow-dark"
          />
          <button type="submit" className="btn btn-glow">
            Enviar
          </button>
        </div>
        <form
          onSubmit={rollQuick}
          className="flex gap-2 items-center"
        >
          <span className="text-[10px] text-muted font-bold uppercase tracking-wide">
            🎲
          </span>
          <input
            type="text"
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            placeholder="1d20+5"
            className="flex-1 px-3 py-2 rounded-[10px] bg-bg border border-border-light text-text text-sm focus:outline-none focus:border-glow-dark"
          />
          <button type="submit" className="btn btn-ghost !py-2">
            Rolar
          </button>
        </form>
      </form>
    </div>
  );
}

// ──────────────────────────────────────────────
// Notes
// ──────────────────────────────────────────────

function NotesPanel({ campaignId }: { campaignId: string }) {
  const { user } = useAuth();
  const [notes, setNotes] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const unsub = subscribeNotes(campaignId, (data) => {
      setNotes(data?.content ?? "");
      setLoaded(true);
    });
    return () => unsub();
  }, [campaignId]);

  useEffect(() => {
    if (!loaded || !user?.uid) return;
    const t = setTimeout(() => {
      saveNotes(campaignId, notes, user.uid);
    }, 800);
    return () => clearTimeout(t);
  }, [notes, loaded, campaignId, user?.uid]);

  return (
    <div className="h-full overflow-auto p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm text-accent">📝 Notas da campanha</h3>
        <span className="text-[10px] text-muted ml-auto">
          salva automaticamente
        </span>
      </div>
      <span className="inline-block text-[11px] text-muted bg-panel3 border border-border px-2 py-0.5 rounded-full self-start">
        compartilhado com a mesa
      </span>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Anotações da aventura…"
        className="flex-1 resize-none min-h-[300px] p-3 bg-bg border border-border-light rounded-[10px] text-text leading-[1.65] text-[13px] focus:outline-none focus:border-glow-dark"
      />
    </div>
  );
}

// ──────────────────────────────────────────────
// Music
// ──────────────────────────────────────────────

import { useYouTubePlayer } from "@/hooks/useYouTubePlayer";
import { useSound } from "@/hooks/useSound";
import {
  subscribeMusic,
  initMusic,
  addTrack,
  removeTrack,
  playTrack,
  togglePlay,
} from "@/lib/music";
import { ytThumb } from "@/lib/youtube";
import type { MusicState } from "@/lib/types";

function MusicPanel({
  campaignId,
  isGM,
}: {
  campaignId: string;
  isGM: boolean;
}) {
  const { user } = useAuth();
  const [music, setMusic] = useState<MusicState | null>(null);
  const [newUrl, setNewUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const { containerRef, ready, play, pause, load } = useYouTubePlayer();
  const lastLoaded = useRef<string>("");

  useEffect(() => {
    const unsub = subscribeMusic(campaignId, setMusic);
    return () => unsub();
  }, [campaignId]);

  useEffect(() => {
    if (!music && isGM && user?.uid) {
      void initMusic(campaignId, user.uid);
    }
  }, [music, isGM, user?.uid, campaignId]);

  const currentTrack = music?.tracks.find(
    (t) => t.id === music.currentTrackId,
  );

  useEffect(() => {
    if (!ready || !currentTrack) return;
    if (lastLoaded.current !== currentTrack.videoId) {
      lastLoaded.current = currentTrack.videoId;
      load(currentTrack.videoId, music?.seekTo ?? 0);
    } else if (music?.playing) {
      play();
    } else {
      pause();
    }
  }, [ready, currentTrack, music, load, play, pause]);

  const addTrackToPlaylist = () => {
    if (!newUrl.trim()) return;
    void addTrack(campaignId, music!, newUrl.trim(), newTitle).then(() => {
      setNewUrl("");
      setNewTitle("");
    });
  };

  return (
    <div className="h-full overflow-auto p-4 flex flex-col gap-3.5">
      <div className="flex items-center gap-2">
        <h3 className="text-sm text-accent">🎵 Música da mesa</h3>
        {isGM && (
          <span className="text-[10px] text-muted ml-auto">
            você controla o player
          </span>
        )}
      </div>

      {!music ? (
        <div className="text-muted text-xs">
          {isGM
            ? "Aguardando o player ser criado…"
            : "O mestre ainda não montou a trilha da mesa."}
        </div>
      ) : (
        <>
          <div className="relative rounded-[10px] overflow-hidden border border-border-light aspect-video bg-bg">
            <div ref={containerRef} className="absolute inset-0" />
            {!currentTrack && (
              <div className="absolute inset-0 flex items-center justify-center text-4xl text-[#677] bg-gradient-to-br from-panel to-bg">
                <b className="absolute bottom-2 left-2.5 right-2.5 text-[11px] text-muted text-left font-normal">
                  A trilha toca aqui e sincroniza com a mesa
                </b>
                <div className="w-[54px] h-[38px] rounded-lg bg-[rgba(232,224,212,.9)] flex items-center justify-center text-[#1a1205] text-base shadow-[0_2px_12px_rgba(0,0,0,.3)]">
                  ▶
                </div>
              </div>
            )}
            {ready && currentTrack && (
              <button
                className="absolute bottom-2 left-2 z-10 w-9 h-9 rounded-full bg-[rgba(17,15,12,.85)] border border-border-light text-glow text-sm flex items-center justify-center hover:bg-bg"
                onClick={() => togglePlay(campaignId, music)}
              >
                {music.playing ? "⏸" : "▶"}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="flex-1 text-xs text-muted truncate">
              {currentTrack
                ? currentTrack.title
                : "Nenhuma música selecionada"}
            </span>
            {music.playing && (
              <span className="text-[10px] font-bold text-glow bg-[rgba(95,212,208,.1)] border border-[rgba(95,212,208,.35)] px-2 py-0.5 rounded-full animate-pulse">
                ● tocando
              </span>
            )}
          </div>

          {isGM && (
            <div className="flex flex-col gap-2 bg-panel2 border border-border-light rounded-xl p-3">
              <input
                type="url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="Link / ID do YouTube"
                className="px-2.5 py-1.5 rounded-md bg-bg border border-border-light text-text text-sm focus:outline-none focus:border-glow-dark"
              />
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Nome da trilha (opcional)"
                className="px-2.5 py-1.5 rounded-md bg-bg border border-border-light text-text text-sm focus:outline-none focus:border-glow-dark"
              />
              <button className="btn" onClick={addTrackToPlaylist}>
                ＋ Adicionar trilha
              </button>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            {music.tracks.length === 0 && (
              <span className="text-muted text-xs">
                Playlist vazia{isGM ? " — adicione a primeira trilha" : ""}.
              </span>
            )}
            {music.tracks.map((track) => (
              <div
                key={track.id}
                className={`flex items-center gap-2.5 bg-panel border rounded-xl p-2 ${
                  track.id === music.currentTrackId
                    ? "border-glow-dark bg-panel2"
                    : "border-border"
                }`}
              >
                <Image
                  src={ytThumb(track.videoId)}
                  alt=""
                  width={44}
                  height={28}
                  unoptimized
                  className="w-11 h-7 rounded-md object-cover bg-bg"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] truncate">{track.title}</div>
                  <small className="text-muted text-[10px]">{track.meta}</small>
                </div>
                {isGM ? (
                  <>
                    <button
                      className={`icon-btn ${track.id === music.currentTrackId ? "!text-glow" : ""}`}
                      title="Tocar para a mesa"
                      onClick={() => playTrack(campaignId, track.id)}
                    >
                      ▶
                    </button>
                    <button
                      className="icon-btn !w-7 !h-7"
                      title="Remover"
                      onClick={() => void removeTrack(campaignId, music, track.id)}
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <span className="text-[10px] text-muted">trilha da mesa</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}