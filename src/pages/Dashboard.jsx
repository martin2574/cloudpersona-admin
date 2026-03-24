import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Building2, Users } from "lucide-react";
import { getStats } from "@/api";

const CARDS = [
  { key: "accounts", label: "Accounts", icon: Building2, link: "/accounts" },
  { key: "members", label: "Members", icon: Users, link: "/members" },
];

export default function Dashboard() {
  const [stats, setStats] = useState({});

  useEffect(() => {
    getStats().then(setStats).catch(console.error);
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {CARDS.map((c) => (
          <Link key={c.key} to={c.link}>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
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
