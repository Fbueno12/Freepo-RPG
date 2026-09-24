"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeChat, sendChatMessage, subscribeNotes, saveNotes } from "@/lib/campaigns";
import { rollFormula } from "@/lib/dice";
import { useYouTubePlayer } from "@/hooks/useYouTubePlayer";
import { useSound } from "@/hooks/useSound";
import {
  subscribeMusic,
  initMusic,
  addTrack,
  removeTrack,
  playTrack,
  stopMusic,
} from "@/lib/music";
import { ytThumb } from "@/lib/youtube";
import type { ChatMessage, MusicState, MusicTrack } from "@/lib/types";

type RightTab = "chat" | "notes" | "music";

interface RightPanelProps {
  campaignId: string;
  isGM: boolean;
}

export function RightPanel({ campaignId, isGM }: RightPanelProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<RightTab>("chat");

  const [music, setMusic] = useState<MusicState | null>(null);
  const { containerRef, ready, play, pause, load, volume, setVolume } = useYouTubePlayer();
  const lastLoaded = useRef<string>("");

  useEffect(() => {
    const unsub = subscribeMusic(campaignId, setMusic);
    return () => unsub();
  }, [campaignId]);

  const currentTrack = music?.tracks.find(
    (t) => t.id === music.currentTrackId,
  );

  useEffect(() => {
    if (!ready) return;
    if (!currentTrack) {
      pause();
      lastLoaded.current = "";
      return;
    }
    const seekPos =
      music?.playing && music.startedAt > 0
        ? music.seekTo + (Date.now() - music.startedAt) / 1000
        : music?.seekTo ?? 0;
    if (lastLoaded.current !== currentTrack.videoId) {
      lastLoaded.current = currentTrack.videoId;
      load(currentTrack.videoId, seekPos);
    } else if (music?.playing) {
      play();
    } else {
      pause();
    }
  }, [ready, currentTrack, music, load, play, pause]);

  return (
    <div className="g-right">
      <div ref={containerRef} className="sr-only" aria-hidden="true" />

      <div className="r-tabs">
        {([
          ["chat", "💬 Chat"],
          ["notes", "📝 Anotações"],
          ["music", "🎵 Música"],
        ] as [RightTab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={activeTab === id ? "on" : ""}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="r-body">
        {activeTab === "chat" && (
          <ChatPanel campaignId={campaignId} userName={user?.email?.split("@")[0] ?? "jogador"} />
        )}
        {activeTab === "notes" && <NotesPanel campaignId={campaignId} />}
        {activeTab === "music" && (
          <MusicPanel
            campaignId={campaignId}
            isGM={isGM}
            music={music}
            currentTrack={currentTrack}
            volume={volume}
            setVolume={setVolume}
          />
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── */

function ChatPanel({
  campaignId,
  userName,
}: {
  campaignId: string;
  userName: string;
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [formula, setFormula] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { message: playSfx } = useSound();

  useEffect(() => {
    const unsub = subscribeChat(campaignId, setMessages);
    return () => unsub();
  }, [campaignId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.userId !== user?.uid) playSfx();
  }, [messages, user?.uid, playSfx]);

  const send = () => {
    if (!text.trim() && !formula.trim()) return;
    if (formula.trim()) {
      const roll = rollFormula(formula);
      if (roll) {
        void sendChatMessage(campaignId, user!.uid, userName, `[${formula}]`, { ...roll, formula });
      }
      setFormula("");
    } else {
      void sendChatMessage(campaignId, user!.uid, userName, text.trim());
    }
    setText("");
  };

  return (
    <div className="r-panel">
      <div ref={scrollRef} className="chat-log">
        {messages.map((m) => (
          <div
            key={m.id}
            className={m.userId === user?.uid ? "msg me" : "msg"}
          >
            {m.userId !== user?.uid && (
              <div className="msg-name">{m.userName}</div>
            )}
            <div
              className={
                m.userId === user?.uid ? "msg-box me" : "msg-box them"
              }
            >
              {m.diceRoll ? (
                <div className="col" style={{ gap: 4 }}>
                  <div className="msg-formula">{m.diceRoll.formula}</div>
                  <div className="msg-total">
                    <b>{m.diceRoll.total}</b>
                    {m.diceRoll.dice.length > 0 && (
                      <span className="msg-detail">
                        [{m.diceRoll.dice.join(", ")}]
                        {m.diceRoll.modifier !== 0 && (
                          <span className="msg-mod">
                            {m.diceRoll.modifier > 0 ? "+" : ""}
                            {m.diceRoll.modifier}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <span className="msg-text">{m.text}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="chat-compose">
        <input
          type="text"
          value={formula}
          onChange={(e) => setFormula(e.target.value)}
          placeholder="Fórmula de dado (ex: 2d6+3)"
          className="input sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
        />
        <div className="chat-row">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Mensagem…"
            className="input sm grow"
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
          />
          <button className="btn" onClick={send}>
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── */

function NotesPanel({ campaignId }: { campaignId: string }) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<string>("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const unsub = subscribeNotes(campaignId, (n) => {
      setNotes(n?.content ?? "");
    });
    return () => unsub();
  }, [campaignId]);

  const scheduleSave = (val: string) => {
    setNotes(val);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void saveNotes(campaignId, val, user?.uid ?? "");
    }, 800);
  };

  return (
    <div className="r-panel">
      <div className="notes-body">
        <textarea
          value={notes}
          onChange={(e) => scheduleSave(e.target.value)}
          placeholder="Anotações da sessão…"
        />
        <div className="notes-foot">
          <span>salva automaticamente</span>
          <span>·</span>
          <span>compartilhado com a mesa</span>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── */

function MusicPanel({
  campaignId,
  isGM,
  music,
  currentTrack,
  volume,
  setVolume,
}: {
  campaignId: string;
  isGM: boolean;
  music: MusicState | null;
  currentTrack: MusicTrack | undefined;
  volume: number;
  setVolume: (v: number) => void;
}) {
  const { user } = useAuth();
  const [newUrl, setNewUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    if (!music && isGM && user?.uid) {
      void initMusic(campaignId, user.uid);
    }
  }, [music, isGM, user?.uid, campaignId]);

  const addTrackToPlaylist = () => {
    if (!newUrl.trim()) return;
    void addTrack(campaignId, music!, newUrl.trim(), newTitle).then(() => {
      setNewUrl("");
      setNewTitle("");
    });
  };

  return (
    <div className="music-body">
      <div className="music-head">
        <h3>🎵 Música da mesa</h3>
        {isGM && <span className="music-note">você controla o player</span>}
      </div>

      {!music ? (
        <div className="text-muted text-sm">
          {isGM
            ? "Aguardando o player ser criado…"
            : "O mestre ainda não montou a trilha da mesa."}
        </div>
      ) : (
        <>
          <div className="music-now">
            {currentTrack && (
              <Image
                src={ytThumb(currentTrack.videoId)}
                alt=""
                width={44}
                height={28}
                unoptimized
                className="mus-thumb"
              />
            )}
            <div className="mus-info">
              <div className="mus-title">
                {currentTrack?.title ?? "Nenhuma música selecionada"}
              </div>
              {music.playing && <span className="mus-playing">tocando</span>}
            </div>
            <button
              className="mus-ctrl"
              title="Diminuir volume"
              onClick={() => setVolume(volume - 5)}
            >
              −
            </button>
            <span className="mus-vol">{volume}%</span>
            <button
              className="mus-ctrl"
              title="Aumentar volume"
              onClick={() => setVolume(volume + 5)}
            >
              ＋
            </button>
            {isGM && currentTrack && (
              <button
                className="mus-ctrl mus-ctrl--stop"
                title="Parar música"
                onClick={() => void stopMusic(campaignId)}
              >
                ■
              </button>
            )}
          </div>

          {isGM && (
            <div className="music-add">
              <input
                type="url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="Link / ID do YouTube"
                className="input"
              />
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Nome da trilha (opcional)"
                className="input"
              />
              <button className="btn" onClick={addTrackToPlaylist}>
                ＋ Adicionar trilha
              </button>
            </div>
          )}

          <div className="music-list">
            {music.tracks.length === 0 && (
              <span className="text-muted text-sm">
                Playlist vazia{isGM ? " — adicione a primeira trilha" : ""}.
              </span>
            )}
            {music.tracks.map((track) => (
              <div
                key={track.id}
                className={track.id === music.currentTrackId ? "track on" : "track"}
              >
                <Image
                  src={ytThumb(track.videoId)}
                  alt=""
                  width={44}
                  height={28}
                  unoptimized
                  className="track-thumb"
                />
                <div className="track-info">
                  <div className="track-title">{track.title}</div>
                  <small className="track-meta">{track.meta}</small>
                </div>
                {isGM ? (
                  <>
                    <button
                      className="mus-ctrl"
                      title="Tocar para a mesa"
                      onClick={() => playTrack(campaignId, track.id)}
                    >
                      ▶
                    </button>
                    <button
                      className="mus-ctrl"
                      title="Remover"
                      onClick={() => void removeTrack(campaignId, music, track.id)}
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <span className="music-note">trilha da mesa</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}