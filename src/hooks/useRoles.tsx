import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "reviewer" | "submitter" | "curator";

export const useRoles = () => {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (active) { setRoles([]); setLoading(false); } return; }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      if (active) {
        setRoles((data ?? []).map((r) => r.role as AppRole));
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const isAdmin = roles.includes("admin");
  const isCurator = roles.includes("curator") || isAdmin;
  const isReviewer = roles.includes("reviewer") || isAdmin;
  const canChat = isAdmin || isCurator || isReviewer;

  return { roles, loading, isAdmin, isCurator, isReviewer, canChat };
};
