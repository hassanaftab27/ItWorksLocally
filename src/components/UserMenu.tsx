import { useState } from "react";
import { Link } from "react-router-dom";
import { Building2, LogOut, MoreVertical, Tag, User, Users } from "lucide-react";
import { useSession } from "@/features/auth/SessionProvider";
import { isAdmin } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProfileDialog } from "@/components/ProfileDialog";
import { OrganizationDialog } from "@/components/OrganizationDialog";

export function UserMenu() {
  const { profile } = useSession();
  const [profileOpen, setProfileOpen] = useState(false);
  const [orgOpen, setOrgOpen] = useState(false);

  if (!profile) return null;

  const displayName = profile.full_name || profile.email;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" aria-label="Account menu" className="max-w-[14rem]">
            <span className="truncate text-sm">{displayName}</span>
            <MoreVertical className="size-4 shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[14rem]">
          <DropdownMenuLabel className="flex flex-col">
            <span className="flex items-center gap-2">
              <span className="truncate">{displayName}</span>
              {profile.role === "admin" && (
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                  admin
                </span>
              )}
            </span>
            {profile.full_name && (
              <span className="truncate text-xs font-normal text-muted-foreground">
                {profile.email}
              </span>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setProfileOpen(true)}>
            <User className="size-4" /> Profile
          </DropdownMenuItem>
          {isAdmin(profile) && (
            <>
              <DropdownMenuItem onSelect={() => setOrgOpen(true)}>
                <Building2 className="size-4" /> Organization
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/admin/users">
                  <Users className="size-4" /> Users
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/admin/categories">
                  <Tag className="size-4" /> Categories
                </Link>
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => supabase.auth.signOut()}>
            <LogOut className="size-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
      <OrganizationDialog open={orgOpen} onOpenChange={setOrgOpen} />
    </>
  );
}
