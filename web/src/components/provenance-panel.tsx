"use client";

import { useCallback, useMemo, useState } from "react";
import {
  XIcon,
  CheckIcon,
  CopyIcon,
  CircleIcon,
  ArrowRightIcon,
  SparklesIcon,
  WrenchIcon,
  MessageSquareIcon,
  UserIcon,
  ClockIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/use-agent";
import {
  buildTimeline,
  exportMethodsSection,
  type ProvenanceEvent,
  type TurnMeta,
} from "@/lib/provenance";

const EVENT_STYLES: Record<
  ProvenanceEvent["type"],
  { dot: string; icon: typeof CircleIcon }
> = {
  user_query: { dot: "bg-blue-500", icon: UserIcon },
  delegation_start: { dot: "bg-violet-500", icon: ArrowRightIcon },
  tool_call: { dot: "bg-slate-400", icon: WrenchIcon },
  delegation_complete: { dot: "bg-emerald-500", icon: SparklesIcon },
  assistant_response: { dot: "bg-sky-400", icon: MessageSquareIcon },
};

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 5_000) return "just now";
  if (diff < 60_000) return `${Math.round(diff / 1_000)}s ago`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  return `${Math.round(diff / 3_600_000)}h ago`;
}

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[10px]">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium text-foreground">{value}</span>
    </span>
  );
}

function TimelineNode({ event }: { event: ProvenanceEvent }) {
  const style = EVENT_STYLES[event.type];
  const Icon = style.icon;

  return (
    <div className="relative flex gap-3 pb-6 last:pb-0">
      {/* Vertical connector line */}
      <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border last:hidden" />

      {/* Dot */}
      <div
        className={cn(
          "relative z-10 mt-0.5 flex size-[22px] shrink-0 items-center justify-center rounded-full border-2 border-background",
          style.dot
        )}
      >
        <Icon className="size-2.5 text-white" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 pt-px">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground">
            {event.label}
          </span>
          <span className="text-[10px] text-muted-foreground/60 tabular-nums">
            {relativeTime(event.timestamp)}
          </span>
        </div>

        {event.detail && (
          <p className="mt-0.5 text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed">
            {event.detail}
          </p>
        )}

        {event.meta && Object.keys(event.meta).length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {typeof event.meta.model === "string" && (
              <MetaPill label="Model" value={event.meta.model} />
            )}
            {Array.isArray(event.meta.databases) &&
              event.meta.databases.map((db) => (
                <MetaPill key={db} label="DB" value={db} />
              ))}
            {typeof event.meta.compute === "string" && (
              <MetaPill label="Compute" value={event.meta.compute} />
            )}
            {Array.isArray(event.meta.skills) &&
              event.meta.skills.map((s) => (
                <MetaPill key={s} label="Skill" value={s} />
              ))}
            {Array.isArray(event.meta.files) &&
              event.meta.files.map((f) => (
                <MetaPill
                  key={f}
                  label="File"
                  value={f.split("/").pop() ?? f}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ProvenancePanel({
  messages,
  turnMeta,
  onClose,
}: {
  messages: ChatMessage[];
  turnMeta: Map<string, TurnMeta>;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const events = useMemo(
    () => buildTimeline(messages, turnMeta),
    [messages, turnMeta]
  );

  const sessionDuration = useMemo(() => {
    if (events.length < 2) return null;
    const first = events[0].timestamp;
    const last = events.at(-1)!.timestamp;
    const diffMin = Math.round((last - first) / 60_000);
    if (diffMin < 1) return "< 1 min";
    if (diffMin < 60) return `${diffMin} min`;
    const hrs = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    return `${hrs}h ${mins}m`;
  }, [events]);

  const handleCopyMethods = useCallback(() => {
    const text = exportMethodsSection(events);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [events]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-[380px] max-w-[90vw] flex-col border-l bg-background shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <ClockIcon className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Session Provenance</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopyMethods}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                copied
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              title="Copy as Methods section"
            >
              {copied ? (
                <CheckIcon className="size-3" />
              ) : (
                <CopyIcon className="size-3" />
              )}
              {copied ? "Copied" : "Copy as Methods"}
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <XIcon className="size-4" />
            </button>
          </div>
        </div>

        {/* Timeline body */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {events.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-xs text-muted-foreground">
                No activity recorded yet.
              </p>
            </div>
          ) : (
            <div>
              {events.map((event) => (
                <TimelineNode key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {events.length > 0 && (
          <div className="flex items-center justify-between border-t px-4 py-2">
            <span className="text-[10px] text-muted-foreground">
              {events.length} event{events.length !== 1 ? "s" : ""}
            </span>
            {sessionDuration && (
              <span className="text-[10px] text-muted-foreground">
                Duration: {sessionDuration}
              </span>
            )}
          </div>
        )}
      </div>
    </>
  );
}
