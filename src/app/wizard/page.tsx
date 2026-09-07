import Link from "next/link";

export const metadata = {
  title: "Criador de Personagem · Freepo",
  description: "Crie seu personagem de Runarcana RPG dentro do Freepo",
};

export default function WizardPage() {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <header className="flex items-center gap-3 px-4 h-12 shrink-0 bg-bg2 border-b border-border">
        <Link href="/" className="icon-btn" title="Voltar">
          ←
        </Link>
        <span className="font-cinzel text-accent">Criador de Personagem</span>
        <span className="text-muted text-xs">Runarcana RPG</span>
        <span className="ml-auto text-[11px] text-muted hidden sm:block">
          a ficha criada aqui vira sua ficha na mesa
        </span>
      </header>
      <iframe
        src="/wizard/runarcana-wizard.html"
        title="Criador de Personagem Runarcana"
        className="flex-1 w-full border-0 min-h-0"
      />
    </div>
  );
}