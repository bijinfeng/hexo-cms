import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { AuthClient, AuthSession } from "../types/auth";
import { Settings, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

interface UserMenuProps {
  authClient: AuthClient;
  onSignedOut: () => void;
}

export function UserMenu({ authClient, onSignedOut }: UserMenuProps) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    authClient.getSession().then(setSession);
  }, [authClient]);

  const user = session?.user;
  const displayName = user?.name || user?.login || "用户";
  const email = user?.email;
  const initial = displayName[0]?.toUpperCase() || "U";

  function handleSignOut() {
    authClient.signOut().then(() => {
      onSignedOut();
    });
  }

  function handleSettings() {
    navigate({ to: "/settings" });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity ml-1" aria-label="用户菜单">
          <Avatar className="w-8 h-8">
            <AvatarImage src={user?.avatarUrl} alt={displayName} />
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex items-center gap-3">
            <Avatar className="w-9 h-9">
              <AvatarImage src={user?.avatarUrl} alt="" />
              <AvatarFallback>{initial}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                {displayName}
              </div>
              {email && (
                <div className="text-xs text-[var(--text-secondary)] truncate">
                  {email}
                </div>
              )}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleSettings}>
          <Settings size={15} className="text-[var(--text-secondary)]" />
          系统设置
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={handleSignOut}>
          <LogOut size={15} className="text-[var(--text-secondary)]" />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
