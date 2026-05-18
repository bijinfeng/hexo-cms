import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { Button } from "../components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Globe, User, Bell, Shield, Puzzle, Save, CheckCircle2,
} from "lucide-react";
import { GithubIcon } from "../components/ui/github-icon";
import type { AuthClient } from "../types/auth";
import { PluginSettingsPanel } from "../plugin";
import { SiteSettings } from "./settings/SiteSettings";
import { GitHubSettings } from "./settings/GitHubSettings";
import { EditorPreferencesSettings } from "./settings/EditorPreferencesSettings";
import { ProfileSettings } from "./settings/ProfileSettings";
import { NotificationSettings, SecuritySettings } from "./settings/NotifyAndSecuritySettings";

export interface SettingsSectionDef {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  render: () => ReactNode;
}

const baseSections = [
  { id: "site", label: "站点信息", icon: Globe },
  { id: "github", label: "GitHub 集成", icon: GithubIcon },
  { id: "profile", label: "个人资料", icon: User },
  { id: "notifications", label: "通知设置", icon: Bell },
  { id: "plugins", label: "插件管理", icon: Puzzle },
  { id: "security", label: "安全设置", icon: Shield },
];

function getInitialSettingsSection(allowedIds: Set<string>): string {
  if (typeof window === "undefined") return "site";
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("section") ?? window.location.hash.replace(/^#/, "");
  return requested && allowedIds.has(requested) ? requested : "site";
}

export interface SettingsPageProps {
  authClient?: AuthClient;
  initialSection?: string;
  onSignedOut?: () => void;
  extraSections?: SettingsSectionDef[];
}

export function SettingsPage({ authClient, initialSection, onSignedOut, extraSections }: SettingsPageProps) {
  const allSections = extraSections?.length ? [...baseSections, ...extraSections] : baseSections;
  const sectionIds = new Set(allSections.map((s) => s.id));

  const [activeSection, setActiveSection] = useState(() =>
    initialSection ? (sectionIds.has(initialSection) ? initialSection : "site") : getInitialSettingsSection(sectionIds),
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setActiveSection(initialSection ? (sectionIds.has(initialSection) ? initialSection : "site") : getInitialSettingsSection(sectionIds));
  }, [initialSection, extraSections]);

  function handleSave() { setSaved(true); setTimeout(() => setSaved(false), 2000); }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">站点设置</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">管理站点配置和集成</p>
        </div>
        <Button onClick={handleSave} variant={saved ? "success" : "default"}>
          {saved ? <><CheckCircle2 size={16} />已保存</> : <><Save size={16} />保存更改</>}
        </Button>
      </div>

      <Tabs value={activeSection} onValueChange={setActiveSection} orientation="vertical" className="flex flex-col lg:flex-row gap-6">
        <TabsList className="flex-col lg:w-52 h-auto bg-transparent p-0 space-y-0.5">
          {allSections.map((section) => {
            const Icon = section.icon;
            return (
              <TabsTrigger key={section.id} value={section.id} className="w-full justify-start gap-3 px-3 py-2.5 data-[state=active]:bg-[var(--brand-primary-subtle)] data-[state=active]:text-[var(--brand-primary)] data-[state=active]:shadow-none data-[state=inactive]:text-[var(--text-secondary)]">
                <Icon size={16} className="flex-shrink-0" />{section.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <div className="flex-1 min-w-0 space-y-4">
          {activeSection === "site" && <SiteSettings />}
          {activeSection === "github" && <GitHubSettings authClient={authClient} onSignedOut={onSignedOut} />}
          {activeSection === "profile" && <ProfileSettings />}
          {activeSection === "editor" && <EditorPreferencesSettings />}
          {activeSection === "notifications" && <NotificationSettings />}
          {activeSection === "plugins" && <PluginSettingsPanel />}
          {activeSection === "security" && <SecuritySettings />}
          {extraSections?.map((section) => activeSection === section.id ? <section key={section.id}>{section.render()}</section> : null)}
        </div>
      </Tabs>
    </div>
  );
}
