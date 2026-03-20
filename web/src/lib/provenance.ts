import type { ChatMessage } from "@/lib/use-agent";

export interface TurnMeta {
  model: string;
  databases: string[];
  compute: string | null;
  skills: string[];
  filesAttached: string[];
  timestamp: number;
}

export interface ProvenanceEvent {
  id: string;
  timestamp: number;
  type:
    | "user_query"
    | "delegation_start"
    | "tool_call"
    | "delegation_complete"
    | "assistant_response";
  label: string;
  detail?: string;
  meta?: Record<string, string | string[]>;
}

export function buildTimeline(
  messages: ChatMessage[],
  turnMeta: Map<string, TurnMeta>
): ProvenanceEvent[] {
  const events: ProvenanceEvent[] = [];
  let eventCounter = 0;
  const eid = () => `prov-${++eventCounter}`;

  for (const msg of messages) {
    if (msg.role === "user") {
      const meta = turnMeta.get(msg.id);
      const metaFields: Record<string, string | string[]> = {};
      if (meta) {
        if (meta.model) metaFields.model = meta.model;
        if (meta.databases.length > 0) metaFields.databases = meta.databases;
        if (meta.compute) metaFields.compute = meta.compute;
        if (meta.skills.length > 0) metaFields.skills = meta.skills;
        if (meta.filesAttached.length > 0) metaFields.files = meta.filesAttached;
      }

      const queryPreview =
        msg.content.length > 100
          ? `${msg.content.slice(0, 97)}...`
          : msg.content;

      events.push({
        id: eid(),
        timestamp: meta?.timestamp ?? msg.timestamp,
        type: "user_query",
        label: "User query",
        detail: queryPreview,
        ...(Object.keys(metaFields).length > 0 ? { meta: metaFields } : {}),
      });
      continue;
    }

    // Assistant message -- emit events from its activities
    const activities = msg.activities ?? [];
    for (const act of activities) {
      const isDelegation = act.label.toLowerCase().includes("delegat");
      const isComplete =
        act.label.toLowerCase().includes("finished") ||
        act.label.toLowerCase().includes("specialist finished");

      let type: ProvenanceEvent["type"];
      if (isDelegation && act.status === "running") {
        type = "delegation_start";
      } else if (isComplete || (isDelegation && act.status !== "running")) {
        type = "delegation_complete";
      } else {
        type = "tool_call";
      }

      // Extract skills actually used from detail like "Used 'writing', 'parallel-web' skills"
      let meta: Record<string, string | string[]> | undefined;
      if (type === "delegation_complete" && act.detail) {
        const skillMatches = [...act.detail.matchAll(/'([^']+)'/g)].map(
          (m) => m[1]
        );
        if (skillMatches.length > 0) {
          meta = { skillsUsed: skillMatches };
        }
      }

      events.push({
        id: eid(),
        timestamp: act.timestamp,
        type,
        label: act.label,
        detail: act.detail,
        ...(meta ? { meta } : {}),
      });
    }

    if (msg.content && msg.content.trim()) {
      const preview =
        msg.content.length > 120
          ? `${msg.content.slice(0, 117)}...`
          : msg.content;
      events.push({
        id: eid(),
        timestamp: msg.timestamp,
        type: "assistant_response",
        label: "Assistant responded",
        detail: preview,
      });
    }
  }

  return events;
}

function collectUnique(
  events: ProvenanceEvent[],
  field: string
): string[] {
  const set = new Set<string>();
  for (const ev of events) {
    const val = ev.meta?.[field];
    if (typeof val === "string") {
      set.add(val);
    } else if (Array.isArray(val)) {
      for (const v of val) set.add(v);
    }
  }
  return [...set];
}

function formatList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

export function exportMethodsSection(events: ProvenanceEvent[]): string {
  if (events.length === 0) return "";

  const models = collectUnique(events, "model");
  const databases = collectUnique(events, "databases");
  const requestedSkills = collectUnique(events, "skills");
  const usedSkills = collectUnique(events, "skillsUsed");
  const skills = [...new Set([...requestedSkills, ...usedSkills])];
  const computes = collectUnique(events, "compute");
  const files = collectUnique(events, "files");

  const delegations = events.filter((e) => e.type === "delegation_start").length;
  const toolCalls = events.filter((e) => e.type === "tool_call").length;
  const queries = events.filter((e) => e.type === "user_query").length;

  const firstTs = events[0]?.timestamp;
  const lastTs = events.at(-1)?.timestamp;
  const durationMs = firstTs && lastTs ? lastTs - firstTs : 0;
  const durationMin = Math.max(1, Math.round(durationMs / 60_000));

  const parts: string[] = [];

  parts.push("## Methods\n");

  if (models.length > 0) {
    parts.push(
      `Analysis was conducted using ${formatList(models)} via the K-Dense BYOK platform.`
    );
  }

  if (queries > 1) {
    parts.push(`The session consisted of ${queries} user queries.`);
  }

  if (delegations > 0) {
    const word = delegations === 1 ? "delegation" : "delegations";
    let sentence = `${delegations} ${word} to specialist agents were performed`;
    if (skills.length > 0) {
      const quoted = skills.map((s) => `'${s}'`);
      sentence += `, activating the ${formatList(quoted)} skill${skills.length > 1 ? "s" : ""}`;
    }
    parts.push(`${sentence}.`);
  }

  if (toolCalls > 0) {
    parts.push(
      `The agent executed ${toolCalls} tool call${toolCalls > 1 ? "s" : ""} during processing.`
    );
  }

  if (databases.length > 0) {
    parts.push(
      `Data sources consulted included ${formatList(databases)}.`
    );
  }

  if (computes.length > 0) {
    parts.push(
      `Compute was provisioned on ${formatList(computes)} via Modal.`
    );
  }

  if (files.length > 0) {
    parts.push(
      `Input files included ${formatList(files.map((f) => f.split("/").pop() ?? f))}.`
    );
  }

  if (durationMs > 0) {
    parts.push(
      `Total session duration was approximately ${durationMin} minute${durationMin > 1 ? "s" : ""}.`
    );
  }

  return parts.join(" ");
}
