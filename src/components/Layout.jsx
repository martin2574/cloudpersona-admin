import { NavLink, Outlet } from "react-router-dom";
import { Building2, Users, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { section: "Overview", items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard }] },
  {
    section: "Account",
    items: [
      { to: "/accounts", label: "Accounts", icon: Building2 },
      { to: "/members", label: "Members", icon: Users },
    ],
  },
];

function SidebarLink({ to, label, icon: Icon }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
          isActive ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        )
      }
    >
      <Icon className="h-4 w-4" />
      {label}
    </NavLink>
  );
}

export default function Layout() {
  return (
    <div className="flex h-screen">
      <aside className="w-56 border-r bg-card flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-lg font-bold">YourQ Admin</h1>
          <p className="text-xs text-muted-foreground">Platform Operator</p>
        </div>
        <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
          {NAV.map((group) => (
            <div key={group.section}>
              <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.section}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <SidebarLink key={item.to} {...item} />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
