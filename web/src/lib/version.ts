"use client";

import { useState, useEffect } from "react";

export const APP_VERSION = "0.2.4";

const GITHUB_REPO = "K-Dense-AI/k-dense-byok";
const CACHE_KEY = "kdense-update-check";

interface UpdateCheckResult {
  updateAvailable: boolean;
  latestVersion: string | null;
}

function compareSemver(current: string, latest: string): boolean {
  const parse = (v: string) => v.split(".").map(Number);
  const [cMajor, cMinor, cPatch] = parse(current);
  const [lMajor, lMinor, lPatch] = parse(latest);
  if (lMajor !== cMajor) return lMajor > cMajor;
  if (lMinor !== cMinor) return lMinor > cMinor;
  return lPatch > cPatch;
}

export function useUpdateCheck(): UpdateCheckResult {
  const [result, setResult] = useState<UpdateCheckResult>({
    updateAvailable: false,
    latestVersion: null,
  });

  useEffect(() => {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        setResult(JSON.parse(cached));
        return;
      } catch {
        sessionStorage.removeItem(CACHE_KEY);
      }
    }

    fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`)
      .then((res) => {
        if (!res.ok) throw new Error(`GitHub API ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const tag: string = data.tag_name ?? "";
        const latestVersion = tag.replace(/^v/, "");
        const updateAvailable =
          latestVersion.length > 0 && compareSemver(APP_VERSION, latestVersion);
        const value = { updateAvailable, latestVersion };
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(value));
        setResult(value);
      })
      .catch(() => {
        // Network error or rate limit — silently ignore
      });
  }, []);

  return result;
}
