import { useConversations } from "@/hooks/useConversations";
import { ConversationItem } from "@/components/ConversationItem";
import { StatusFilter } from "@/components/StatusFilter";
import { FlowFilter } from "@/components/FlowFilter";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { useAuth } from "@/modules/auth/useAuth";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, MessageSquare, Globe, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { OriginCategory } from "@/components/OriginFilter";
import { toast } from "sonner";

const originLabels: Record<OriginCategory, string> = {
  all: "Todos",
  monterrey: "Monterrey",
  nacional: "Nacional",
};

export default function ConversationsPage() {
  const { conversations, isLoading, statusFilter, setStatusFilter, flowFilter, setFlowFilter, flowCounts, originFilter, setOriginFilter } = useConversations({ enablePolling: true });
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const showFlowFilter = statusFilter === "active";

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo cerrar sesion en el servidor";
      toast.error(message);
    }
  };

  return (
    <div className="h-[100dvh] bg-background grid grid-rows-[auto,minmax(0,1fr)] overflow-hidden">
      {/* Top bar */}
      <header className="bg-card border-b border-border safe-top sticky top-0 z-30">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <MessageSquare className="w-4.5 h-4.5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground leading-tight">Conversaciones</h1>
              <p className="text-xs text-muted-foreground">{user?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-accent text-accent-foreground hover:bg-accent/80 transition-colors min-h-[32px]">
                  <Globe className="w-3.5 h-3.5" />
                  {originLabels[originFilter]}
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[140px]">
                {(["all", "monterrey", "nacional"] as OriginCategory[]).map((v) => (
                  <DropdownMenuItem key={v} onClick={() => setOriginFilter(v)} className={originFilter === v ? "bg-accent" : ""}>
                    {originLabels[v]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DarkModeToggle />
            <button onClick={() => void handleLogout()} className="p-2.5 rounded-full hover:bg-secondary transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Logout">
              <LogOut className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        <StatusFilter value={statusFilter} onChange={setStatusFilter} />
        <AnimatePresence initial={false}>
          {showFlowFilter && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: "easeOut" }} className="overflow-hidden">
              <FlowFilter value={flowFilter} onChange={setFlowFilter} counts={flowCounts} />
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Conversation list */}
      <main className="min-h-0 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: "touch" }}>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Cargando conversaciones...</p>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">No se encontraron conversaciones</p>
          </div>
        ) : (
          conversations.map((c) => <ConversationItem key={c.id} conversation={c} onClick={() => navigate(`/conversations/${c.id}`)} />)
        )}
      </main>
    </div>
  );
}
