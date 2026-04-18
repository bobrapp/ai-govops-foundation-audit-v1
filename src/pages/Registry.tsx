import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Building2, BadgeCheck, Crown } from "lucide-react";

interface Firm { id: string; name: string; status: string; jurisdiction: string | null; website: string | null; active_assessor_count: number; charter_at: string | null; }
interface Assessor { id: string; display_name: string; jurisdiction: string | null; firm_id: string | null; badges: string[]; qaga_credential_id: string | null; qaga_issued_at: string | null; }

const Registry = () => {
  const [firms, setFirms] = useState<Firm[]>([]);
  const [assessors, setAssessors] = useState<Assessor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: f }, { data: a }] = await Promise.all([
        supabase.from("qagac_firms").select("id, name, status, jurisdiction, website, active_assessor_count, charter_at").order("name"),
        supabase.from("qaga_assessors").select("id, display_name, jurisdiction, firm_id, badges, qaga_credential_id, qaga_issued_at").order("display_name"),
      ]);
      setFirms((f as Firm[]) ?? []);
      setAssessors((a as Assessor[]) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="container max-w-6xl mx-auto py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-gradient-to-br from-primary to-accent grid place-items-center">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <div className="font-semibold text-sm">AiGovOps</div>
              <div className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider">Public Registry</div>
            </div>
          </Link>
          <Link to="/auth"><Button variant="outline" size="sm">Console</Button></Link>
        </div>
      </header>

      <div className="container max-w-6xl mx-auto p-8">
        <h1 className="text-3xl font-semibold tracking-tight">QAGA & QAGAC Public Registry</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Use this registry to verify that an Attestation of AOS Conformance (AOC) was signed by a Qualified
          AiGovOps Assessor (QAGA) employed by a Qualified AiGovOps Assessor Company (QAGAC) in good standing.
        </p>

        <section className="mt-10">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Qualified Firms (QAGAC)</h2>
            <Badge className="bg-muted">{firms.length}</Badge>
          </div>
          {loading ? <div className="text-muted-foreground font-mono text-sm">loading…</div> : firms.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No firms in good standing yet. Charter QAGACs will appear here as they're activated.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {firms.map((f) => (
                <div key={f.id} className="rounded-lg border border-border bg-card-grad p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">{f.name}</div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">{f.jurisdiction ?? "—"}</div>
                    </div>
                    <Badge className={f.status === "active" ? "bg-primary/20 text-primary" : "bg-warning/20 text-warning"}>{f.status}</Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                    <span><BadgeCheck className="inline h-3 w-3 mr-1" />{f.active_assessor_count} active QAGAs</span>
                    {f.website && <a href={f.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">website</a>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-10">
          <div className="flex items-center gap-2 mb-4">
            <Crown className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Qualified Assessors (QAGA)</h2>
            <Badge className="bg-muted">{assessors.length}</Badge>
          </div>
          {loading ? <div className="text-muted-foreground font-mono text-sm">loading…</div> : assessors.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No assessors listed yet.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {assessors.map((a) => {
                const firm = firms.find((f) => f.id === a.firm_id);
                return (
                  <div key={a.id} className="rounded-lg border border-border bg-card-grad p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium">{a.display_name}</div>
                        <div className="text-xs text-muted-foreground font-mono mt-0.5">
                          {a.qaga_credential_id ?? "—"} · {a.jurisdiction ?? "—"}
                        </div>
                      </div>
                      {firm && <span className="text-xs font-mono text-primary">{firm.name}</span>}
                    </div>
                    {a.badges?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {a.badges.map((b) => (
                          <span key={b} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{b}</span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Registry;
