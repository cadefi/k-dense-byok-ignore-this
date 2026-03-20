"use client";

import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_ADK_API_URL ?? "http://localhost:8000";

export interface Skill {
  id: string;
  name: string;
  description: string;
  author: string;
  license: string;
  compatibility: string;
}

export function useSkills(): { skills: Skill[]; loading: boolean } {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/skills`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (!cancelled && Array.isArray(data)) {
          setSkills(data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { skills, loading };
}
