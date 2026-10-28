"use client";

import { useEffect, useState } from "react";
import { START_ROOM, type RoomId } from "@/content/rooms";
import {
  getAssetState,
  preloadAssets,
  subscribeAssets,
  type AssetState,
} from "./assets";

/** One preload pass for the whole app, with progress shared through a store. */
export function useAssets(
  startRoom: RoomId = START_ROOM,
  enabled = true,
) {
  const [state, setState] = useState<AssetState>(getAssetState);

  useEffect(() => subscribeAssets(setState), []);

  useEffect(() => {
    if (enabled) void preloadAssets(startRoom);
  }, [enabled, startRoom]);

  return state;
}
