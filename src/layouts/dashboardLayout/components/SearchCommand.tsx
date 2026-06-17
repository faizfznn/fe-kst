import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  Settings,
  User,
  LayoutDashboard,
  Activity,
  Package,
  ClipboardList,
  Book,
  Sprout,
  PawPrint,
  Leaf,
  GraduationCap,
  Handshake,
  Users,
  Banknote,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { ROUTES } from "@/routes/routes";
import { useAuth } from "@/hooks/useAuth";

interface SearchCommandProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export function SearchCommand({ open, setOpen }: SearchCommandProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canAccessNgijo = user?.kstAccess.includes("ngijo") ?? false;
  const canAccessCangar = user?.kstAccess.includes("cangar") ?? false;
  const canAccessJatikerto = user?.kstAccess.includes("jatikerto") ?? false;

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, setOpen]);

  const runCommand = React.useCallback(
    (command: () => unknown) => {
      setOpen(false);
      command();
    },
    [setOpen],
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Cari Konten..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Home">
          <CommandItem
            onSelect={() => runCommand(() => navigate(ROUTES.DASHBOARD))}
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Beranda</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        {canAccessNgijo && (
          <>
            <CommandGroup heading="KST Ngijo">
              <CommandItem
                onSelect={() => runCommand(() => navigate(ROUTES.PENELITIAN))}
              >
                <Activity className="mr-2 h-4 w-4" />
                <span>Penelitian</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => navigate(ROUTES.KEBERLANJUTAN))}
              >
                <Leaf className="mr-2 h-4 w-4" />
                <span>Keberlanjutan</span>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
          </>
        )}
        {canAccessJatikerto && (
          <>
            <CommandGroup heading="KST Jatikerto">
              <CommandItem
                onSelect={() => runCommand(() => navigate(ROUTES.PERTANIAN))}
              >
                <Sprout className="mr-2 h-4 w-4" />
                <span>Pertanian</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => navigate(ROUTES.PETERNAKAN))}
              >
                <PawPrint className="mr-2 h-4 w-4" />
                <span>Peternakan</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => navigate(ROUTES.KONSERVASI))}
              >
                <Leaf className="mr-2 h-4 w-4" />
                <span>Konservasi</span>
              </CommandItem>
              <CommandItem
                onSelect={() =>
                  runCommand(() => navigate(ROUTES.PELAYANAN_AKADEMIK))
                }
              >
                <GraduationCap className="mr-2 h-4 w-4" />
                <span>Pelayanan Akademik</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => navigate(ROUTES.KEMITRAAN))}
              >
                <Handshake className="mr-2 h-4 w-4" />
                <span>Kemitraan</span>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
          </>
        )}
        {canAccessCangar && (
          <>
            <CommandGroup heading="KST Cangar">
              <CommandItem
                onSelect={() => runCommand(() => navigate(ROUTES.STOK_OPNAME))}
              >
                <ClipboardList className="mr-2 h-4 w-4" />
                <span>Stok Opname</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => navigate(ROUTES.BOOKLIST_ATP))}
              >
                <Book className="mr-2 h-4 w-4" />
                <span>Manajemen Booking</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => navigate(ROUTES.KEUANGAN_CANGAR))}
              >
                <Banknote className="mr-2 h-4 w-4" />
                <span>Keuangan</span>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
          </>
        )}
        <CommandGroup heading="Dashboard Statistics">
          <CommandItem
            onSelect={() => runCommand(() => navigate(ROUTES.DASHBOARD))}
          >
            <Activity className="mr-2 h-4 w-4" />
            <span>Total KST Aktif</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => navigate(ROUTES.DASHBOARD))}
          >
            <Package className="mr-2 h-4 w-4" />
            <span>Total Produksi</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => navigate(ROUTES.DASHBOARD))}
          >
            <ClipboardList className="mr-2 h-4 w-4" />
            <span>Total Operasional Aktif</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => navigate(ROUTES.DASHBOARD))}
          >
            <Activity className="mr-2 h-4 w-4" />
            <span>Proyek Riset Aktif</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => navigate(ROUTES.DASHBOARD))}
          >
            <Activity className="mr-2 h-4 w-4" />
            <span>Sustainability Index</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => navigate(ROUTES.DASHBOARD))}
          >
            <Users className="mr-2 h-4 w-4" />
            <span>Mitra / Kolaborasi</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Settings">
          <CommandItem
            onSelect={() => runCommand(() => { })}
          >
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => { })}
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
