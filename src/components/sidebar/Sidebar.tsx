import { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { useChannels } from "@/features/channels/queries";
import { useSession } from "@/features/auth/SessionProvider";
import { useOrganization, organizationLogoUrl } from "@/features/organization/queries";
import { isAdmin } from "@/lib/permissions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CreateChannelDialog } from "./CreateChannelDialog";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { profile } = useSession();
  const { data: channels = [], isLoading } = useChannels();
  const { data: org } = useOrganization();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [brokenLogo, setBrokenLogo] = useState<string | null>(null);

  const companyLogo = organizationLogoUrl(org);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return channels;
    return channels.filter(
      (c) => c.name.includes(q) || c.description?.toLowerCase().includes(q)
    );
  }, [channels, search]);

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex h-12 shrink-0 items-center gap-1.5 border-b px-3">
        {companyLogo && companyLogo !== brokenLogo && (
          <img
            src={companyLogo}
            alt="Company"
            className="size-6 shrink-0 rounded object-contain"
            onError={() => setBrokenLogo(companyLogo)}
          />
        )}
        <img src="/logo.svg?v=2" alt="" className="size-6 shrink-0 rounded" />
        <span className="select-none truncate font-semibold">ItWorksLocally</span>
      </div>

      <div className="space-y-2 border-b p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search channels"
            className="pl-8"
          />
        </div>
        {isAdmin(profile) && (
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-4" /> New Channel
          </Button>
        )}
      </div>

      <nav className="flex-1 overflow-auto p-2">
        {isLoading ? (
          <div className="px-2 py-1 text-sm text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="px-2 py-1 text-sm text-muted-foreground">
            {channels.length === 0 ? "No channels yet" : "No matches"}
          </div>
        ) : (
          <ul className="space-y-0.5">
            {filtered.map((c) => (
              <li key={c.id}>
                <NavLink
                  to={`/channels/${c.name}`}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-1 rounded px-2 py-1 text-sm hover:bg-accent",
                      isActive && "bg-accent font-medium"
                    )
                  }
                >
                  <span className="text-muted-foreground">#</span>
                  <span className="truncate">{c.name}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        )}
      </nav>

      <CreateChannelDialog open={createOpen} onOpenChange={setCreateOpen} />
    </aside>
  );
}
