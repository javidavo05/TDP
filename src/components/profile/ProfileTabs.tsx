"use client";

interface ProfileTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "profile", label: "Mi Perfil", icon: "👤" },
  { id: "tickets", label: "Mis Tickets", icon: "🎫" },
  { id: "history", label: "Historial", icon: "📋" },
  { id: "preferences", label: "Preferencias", icon: "⚙️" },
];

export function ProfileTabs({ activeTab, onTabChange }: ProfileTabsProps) {
  return (
    <div className="border-b border-border mb-8">
      <nav className="flex space-x-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-6 py-4 text-sm font-semibold transition-all relative ${
              activeTab === tab.id
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary animate-fadeIn" />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
