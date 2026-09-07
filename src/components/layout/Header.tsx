import Image from "next/image";

interface HeaderProps {
  onNavigate?: (screen: string) => void;
  activeScreen?: string;
}

export function Header({ onNavigate, activeScreen = "login" }: HeaderProps) {
  const screens = [
    { id: "login", label: "Login" },
    { id: "lobby", label: "Lobby" },
    { id: "game", label: "Mesa de Jogo" },
  ];

  return (
    <header className="sticky top-0 z-50 h-12 flex items-center gap-4 px-5 bg-gradient-to-b from-[#1a1714] to-[#141210] border-b border-border">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-accent-dark shadow-[0_0_12px_rgba(95,212,208,.25)]">
          <Image
            src="/Freepo.jpeg"
            alt="Freepo"
            width={32}
            height={32}
            className="w-full h-full object-cover"
          />
        </div>
        <b className="font-cinzel tracking-widest text-base text-glow">FREEPO</b>
      </div>
      <nav className="flex gap-1.5 ml-auto">
        {screens.map((screen) => (
          <button
            key={screen.id}
            onClick={() => onNavigate?.(screen.id)}
            className={`px-3.5 py-1.5 rounded-lg border transition-colors ${
              activeScreen === screen.id
                ? "bg-panel2 text-glow border-border-light"
                : "bg-transparent text-muted border-transparent hover:text-text"
            }`}
          >
            {screen.label}
          </button>
        ))}
      </nav>
    </header>
  );
}