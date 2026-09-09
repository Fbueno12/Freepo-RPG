"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="app">
      <div className="loading col">
        <h2 className="login-title">Algo deu errado</h2>
        <p className="text-muted">Ocorreu um erro inesperado na mesa.</p>
        <button className="btn btn-glow" onClick={retry}>
          Tentar de novo
        </button>
      </div>
    </div>
  );
}