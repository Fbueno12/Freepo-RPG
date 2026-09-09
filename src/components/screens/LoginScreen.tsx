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
    <div className="login">
      <main className="login-main">
        <div className="login-bg" />
        <form onSubmit={handleSubmit} className="login-card">
          <div className="login-ava">
            <Image src="/Freepo.jpeg" alt="Freepo" width={80} height={80} />
          </div>
          <h1 className="login-title">Freepo</h1>
          <p className="login-sub">
            {mode === "login"
              ? "onde nossa campanha ganha vida"
              : "monte seu personagem, vamos começar"}
          </p>

          {error && <div className="alert alert-error">{error}</div>}

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

          <button type="submit" className="btn btn-glow btn-block" disabled={loading}>
            {loading
              ? "Carregando…"
              : mode === "login"
                ? "Entrar"
                : "Criar conta"}
          </button>

          <div className="login-hr">ou</div>

          <button
            type="button"
            className="btn btn-ghost btn-block"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError(null);
            }}
          >
            {mode === "login" ? "Criar conta" : "Já tenho conta"}
          </button>
          <p className="login-foot">
            Esqueceu a senha?{" "}
            <button type="button" className="link" onClick={openResetModal}>
              recuperar
            </button>
          </p>
        </form>
      </main>

      {resetOpen && (
        <div className="modal" onClick={() => setResetOpen(false)}>
          <form
            onSubmit={submitReset}
            onClick={(e) => e.stopPropagation()}
            className="dialog"
          >
            <h2 className="dialog-title">Recuperar senha</h2>
            <p className="dialog-sub">
              Informe seu email e enviaremos as instruções.
            </p>

            {resetSuccess && (
              <div className="alert alert-info">
                Instruções enviadas! Cheque sua caixa de entrada.
              </div>
            )}
            {resetError && (
              <div className="alert alert-error">{resetError}</div>
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

            <div className="dialog-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setResetOpen(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-glow" disabled={resetLoading}>
                {resetLoading ? "Enviando…" : "Enviar instruções"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}