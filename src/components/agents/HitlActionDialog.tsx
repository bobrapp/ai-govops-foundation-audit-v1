import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle } from "lucide-react";
import type { HitlRow, PersonaRow } from "@/hooks/queries/useAgents";

const sevTone: Record<string, string> = {
  info: "text-muted-foreground",
  low: "text-primary",
  medium: "text-warning",
  high: "text-warning",
  critical: "text-destructive",
};

interface Props {
  item: HitlRow | null;
  personaIndex: Record<string, PersonaRow>;
  canResolve: boolean;
  note: string;
  onNoteChange: (s: string) => void;
  onClose: () => void;
  onSubmit: (status: "approved" | "rejected" | "withdrawn") => void;
  busy: boolean;
}

export const HitlActionDialog = ({
  item, personaIndex, canResolve, note, onNoteChange, onClose, onSubmit, busy,
}: Props) => (
  <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="text-base">{item?.title}</DialogTitle>
        <DialogDescription className="text-xs font-mono">
          {item && personaIndex[item.persona_id]?.display_name} ·{" "}
          <span className={sevTone[item?.severity ?? "info"]}>{item?.severity}</span>
        </DialogDescription>
      </DialogHeader>

      <p className="text-sm text-foreground/85 leading-relaxed">{item?.summary}</p>

      {canResolve ? (
        <>
          <Textarea
            placeholder="Resolution note (visible in audit log)"
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            rows={3}
            className="font-mono text-xs"
          />
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => onSubmit("withdrawn")} disabled={busy}>
              Withdraw
            </Button>
            <Button variant="destructive" onClick={() => onSubmit("rejected")} disabled={busy}>
              <XCircle className="h-4 w-4 mr-1.5" /> Reject
            </Button>
            <Button onClick={() => onSubmit("approved")} disabled={busy}>
              <CheckCircle2 className="h-4 w-4 mr-1.5" /> Approve
            </Button>
          </DialogFooter>
        </>
      ) : (
        <p className="text-xs text-muted-foreground font-mono">
          You need reviewer or admin role to resolve HITL items.
        </p>
      )}
    </DialogContent>
  </Dialog>
);
