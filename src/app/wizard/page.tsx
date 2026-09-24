import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Criador de Personagem · Freepo",
  description: "Crie seu personagem de Runarcana RPG dentro do Freepo",
};

export default function WizardPage() {
  return (
    <div className="wizard">
      <header className="wizard-top">
        <Link href="/" className="icon-btn" title="Voltar">
          ←
        </Link>
        <span className="wizard-title">Criador de Personagem</span>
        <span className="wizard-sub">Runarcana RPG</span>
        <span className="wizard-hint">
          a ficha criada aqui vira sua ficha na mesa
        </span>
      </header>
      <iframe
        src="/wizard/runarcana-wizard.html"
        title="Criador de Personagem Runarcana"
        className="wizard-frame"
      />
    </div>
  );
}