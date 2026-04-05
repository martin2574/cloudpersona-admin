import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Building2, Users, type LucideIcon } from "lucide-react";
import { getStats } from "@/api";

interface DashboardCard {
  key: string;
  label: string;
  icon: LucideIcon;
  link: string;
}

const CARDS: DashboardCard[] = [
  { key: "accounts", label: "Accounts", icon: Building2, link: "/accounts" },
  { key: "members", label: "Members", icon: Users, link: "/members" },
];

export default function Dashboard() {
  const [stats, setStats] = useState<Record<string, number>>({});

  useEffect(() => {
    getStats()
      .then((s) => setStats((s ?? {}) as Record<string, number>))
      .catch(console.error);
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {CARDS.map((c) => (
          <Link key={c.key} to={c.link}>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {c.label}
                </CardTitle>
                <c.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats[c.key] ?? "—"}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
