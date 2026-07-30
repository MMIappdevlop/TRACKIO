/**
 * Exercise illustration lookup with two-layer caching:
 *   1. In-memory Map (process lifetime)
 *   2. AsyncStorage (persists across app restarts)
 *
 * A `null` entry means "we tried and found nothing" — prevents repeated
 * network calls for unknown exercise names.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl } from "@/lib/query-client";

export interface ExerciseIllustrationData {
  /** First frame URL — used as a still preview before animation starts. */
  gifUrl: string;
  /**
   * All frame URLs for client-side animation.  free-exercise-db provides 2
   * frames per exercise (start pose + end pose); cycling between them at
   * ~600 ms creates a motion effect showing the full movement.
   */
  frameUrls: string[];
  targetMuscles: string[];
  secondaryMuscles: string[];
}

const STORAGE_KEY = "@trakio/exercise_illustrations_v2";

// In-memory layer — avoids hitting AsyncStorage on every render
const memCache = new Map<string, ExerciseIllustrationData | null>();
// Track in-flight requests so concurrent calls for the same name don't
// fire multiple network requests
const inflight = new Map<string, Promise<ExerciseIllustrationData | null>>();

function normalize(name: string): string {
  return name.toLowerCase().trim();
}

async function readDiskCache(): Promise<
  Record<string, ExerciseIllustrationData | null>
> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function writeDiskCache(
  cache: Record<string, ExerciseIllustrationData | null>,
): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // storage write errors are non-fatal
  }
}

async function fetchFromServer(
  name: string,
): Promise<ExerciseIllustrationData | null> {
  try {
    const base = getApiUrl();
    const url = new URL("/api/exercise-lookup", base);
    url.searchParams.set("name", name);
    const res = await fetch(url.toString(), { credentials: "include" });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.found || !json.gifUrl) return null;
    // frameUrls is the full list for animation; fall back to [gifUrl] if absent
    const frameUrls: string[] =
      Array.isArray(json.frameUrls) && json.frameUrls.length > 0
        ? (json.frameUrls as string[])
        : [json.gifUrl as string];
    return {
      gifUrl: json.gifUrl as string,
      frameUrls,
      targetMuscles: (json.targetMuscles as string[]) ?? [],
      secondaryMuscles: (json.secondaryMuscles as string[]) ?? [],
    };
  } catch {
    return null;
  }
}

export async function lookupExercise(
  name: string,
): Promise<ExerciseIllustrationData | null> {
  const key = normalize(name);

  // 1. Memory cache
  if (memCache.has(key)) return memCache.get(key) ?? null;

  // 2. Disk cache
  const disk = await readDiskCache();
  if (key in disk) {
    memCache.set(key, disk[key]);
    return disk[key];
  }

  // 3. Deduplicate in-flight requests
  if (inflight.has(key)) return inflight.get(key)!;

  const promise = fetchFromServer(name).then(async (result) => {
    memCache.set(key, result);
    inflight.delete(key);
    const freshDisk = await readDiskCache();
    freshDisk[key] = result;
    await writeDiskCache(freshDisk);
    return result;
  });

  inflight.set(key, promise);
  return promise;
}

/** Clear cached result for one exercise name (e.g. after a rename). */
export async function clearCachedExercise(name: string): Promise<void> {
  const key = normalize(name);
  memCache.delete(key);
  const disk = await readDiskCache();
  delete disk[key];
  await writeDiskCache(disk);
}
