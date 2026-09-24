import Image from "next/image";

export type AppScreen = "login" | "lobby" | "game";

interface HeaderProps {
  onNavigate?: (screen: AppScreen) => void;
  activeScreen?: AppScreen;
}

export function Header({ onNavigate, activeScreen = "login" }: HeaderProps) {
  const screens: { id: AppScreen; label: string }[] = [
    { id: "login", label: "Login" },
    { id: "lobby", label: "Lobby" },
    { id: "game", label: "Mesa de Jogo" },
  ];

  return (
    <header className="site-header">
      <div className="site-header__logo">
        <div className="site-header__mark">
          <Image
            src="/Freepo.jpeg"
            alt="Freepo"
            width={32}
            height={32}
          />
        </div>
        <b className="site-header__name">FREEPO</b>
      </div>
      <nav className="site-header__nav">
        {screens.map((screen) => (
          <button
            key={screen.id}
            onClick={() => onNavigate?.(screen.id)}
            className={activeScreen === screen.id ? "on" : ""}
          >
            {screen.label}
          </button>
        ))}
      </nav>
    </header>
  );
}