import { useState } from "react";
import { FacebookLayout } from "@/components/layout/FacebookLayout";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { GroupGrid } from "@/components/explore/GroupGrid";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function Groups() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <FacebookLayout>
      <div className="w-full px-2 sm:px-4 pt-4 pb-10">
        <div className="sticky top-0 z-10 bg-background pb-3">
          <div className="flex items-center justify-between gap-3 pb-3">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Explora y crea comunidades</p>
            </div>
            <Button asChild>
              <Link to="/groups/create">Crear grupo</Link>
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar grupos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 rounded-lg bg-muted border-none text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <GroupGrid searchQuery={searchQuery} />
      </div>
    </FacebookLayout>
  );
}
