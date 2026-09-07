"use client";

import { useState } from "react";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";

interface LoginScreenProps {
  onSuccess: () => void;
}

export function LoginScreen({ onSuccess }: LoginScreenProps) {
  const { login, register, resetPassword } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password);
      }
      onSuccess();
    } catch (err) {
      const error = err as { code?: string; message?: string };
      const messages: Record<string, string> = {
        "auth/invalid-email": "Email inválido.",
        "auth/user-not-found": "Email não cadastrado.",
        "auth/wrong-password": "Senha incorreta.",
        "auth/email-already-in-use": "Este email já possui uma conta.",
        "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
        "auth/invalid-credential": "Email ou senha inválidos.",
      };
      setError(messages[error.code ?? ""] ?? error.message ?? "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const openResetModal = () => {
    setResetEmail(email);
    setResetError(null);
    setResetSuccess(false);
    setResetOpen(true);
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setResetError("Digite seu email para recuperar a senha.");
      return;
    }
    setResetError(null);
    setResetSuccess(false);
    setResetLoading(true);
    try {
      await resetPassword(resetEmail);
      setResetSuccess(true);
    } catch (err) {
      const error = err as { code?: string; message?: string };
      const messages: Record<string, string> = {
        "auth/invalid-email": "Email inválido.",
        "auth/user-not-found": "Email não cadastrado.",
        "auth/missing-email": "Digite seu email.",
      };
      setResetError(
        messages[error.code ?? ""] ?? error.message ?? "Erro ao enviar recuperação.",
      );
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col flex-1">
      <main className="flex flex-1 relative items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(900px 500px at 50% -5%, rgba(95,212,208,.08), transparent 55%), radial-gradient(700px 400px at 20% 80%, rgba(122,140,82,.06), transparent 50%), var(--bg)",
          }}
        />
        <div className="relative w-full max-w-md mx-auto px-6 py-24">
          <form
            onSubmit={handleSubmit}
            className="bg-panel border border-border rounded-2xl p-9 shadow-[0_24px_70px_rgba(0,0,0,.55)]"
          >
            <div className="w-20 h-20 rounded-full mx-auto mb-4.5 overflow-hidden border-3 border-accent-dark shadow-[0_0_20px_rgba(95,212,208,.25),0_0_50px_rgba(95,212,208,.08)]">
              <Image
                src="/Freepo.jpeg"
                alt="Freepo"
                width={80}
                height={80}
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="text-center text-2xl text-glow tracking-widest">
              Freepo
            </h1>
            <p className="text-center text-muted text-xs mt-1.5 mb-6">
              {mode === "login"
                ? "onde nossa campanha ganha vida"
                : "monte seu personagem, vamos começar"}
            </p>

            {error && (
              <div className="mb-4 p-3 text-xs rounded-lg border border-red/40 bg-red/10 text-red">
                {error}
              </div>
            )}

            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="password">Senha</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-glow w-full mt-2"
              disabled={loading}
            >
              {loading
                ? "Carregando…"
                : mode === "login"
                  ? "Entrar"
                  : "Criar conta"}
            </button>

            <div className="flex items-center gap-3 text-[#5c5044] text-xs my-5">
              <span className="flex-1 h-px bg-border" />
              ou
              <span className="flex-1 h-px bg-border" />
            </div>

            <button
              type="button"
              className="btn btn-ghost w-full"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError(null);
              }}
            >
              {mode === "login" ? "Criar conta" : "Já tenho conta"}
            </button>
            <p className="text-center mt-4 text-muted text-xs">
              Esqueceu a senha?{" "}
              <button
                type="button"
                className="text-glow cursor-pointer no-underline bg-transparent"
                onClick={openResetModal}
              >
                recuperar
              </button>
            </p>
          </form>
        </div>
      </main>

      {resetOpen && (
        <div
          className="fixed inset-0 z-50 bg-[rgba(10,8,5,.75)] backdrop-blur-[3px] flex items-center justify-center p-6"
          onClick={() => setResetOpen(false)}
        >
          <form
            onSubmit={submitReset}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-panel border border-border-light rounded-2xl p-8 shadow-[0_30px_80px_rgba(0,0,0,.6)]"
          >
            <h2 className="font-cinzel text-xl text-glow mb-1">Recuperar senha</h2>
            <p className="text-muted text-xs mb-5">
              Informe seu email e enviaremos as instruções.
            </p>

            {resetSuccess && (
              <div className="mb-4 p-3 text-xs rounded-lg border border-glow-dark/40 bg-glow/10 text-glow">
                Instruções enviadas! Cheque sua caixa de entrada.
              </div>
            )}
            {resetError && (
              <div className="mb-4 p-3 text-xs rounded-lg border border-red/40 bg-red/10 text-red">
                {resetError}
              </div>
            )}

            <div className="field">
              <label htmlFor="reset-email">Email</label>
              <input
                id="reset-email"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="voce@exemplo.com"
                required
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2.5 mt-5">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setResetOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-glow"
                disabled={resetLoading}
              >
                {resetLoading ? "Enviando…" : "Enviar instruções"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}