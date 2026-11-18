import { useCallback, useMemo, useRef, useState } from 'react';
import type { StoryGroupData, StoryItemData, StoryItemSeenInfo } from './types';

export interface UseStoryProgressOptions<
  TStory extends Record<string, unknown> = StoryGroupData,
  TItem extends Record<string, unknown> = StoryItemData,
> {
  /**
   * Source list of story groups.
   */
  stories: readonly TStory[];
  /**
   * Extract unique key from a story group (defaults to `story.id ?? index`).
   */
  keyExtractor?: (story: TStory, index: number) => string;
  /**
   * Extract items array from a story group (defaults to `story.items ?? []`).
   */
  getItems?: (story: TStory) => readonly TItem[];
  /**
   * Extract unique key from an item within a story group (defaults to `item.id ?? index`).
   */
  getItemKey?: (item: TItem, index: number, story: TStory) => string;
}

export interface UseStoryProgressResult<
  TStory extends Record<string, unknown> = StoryGroupData,
  TItem extends Record<string, unknown> = StoryItemData,
> {
  /**
   * Ordered stories: unwatched stories first, completed stories moved to the end after closing.
   */
  orderedStories: readonly TStory[];
  /**
   * Whether the story viewer is currently open.
   */
  isOpen: boolean;
  /**
   * Starting story index inside `orderedStories` for `<AndroidStory>`.
   */
  initialStoryIndex: number;
  /**
   * Open the story viewer at a story object or index in `orderedStories`.
   */
  openStory: (storyOrIndex: TStory | number) => void;
  /**
   * Close the story viewer and move any completed avatars to the end of `orderedStories`.
   */
  closeStory: () => void;
  /**
   * Returns true if all story items for this avatar have been watched.
   */
  isStoryWatched: (story: TStory) => boolean;
  /**
   * Pass to `<AndroidStory getInitialItemIndex={getInitialItemIndex} />` to resume from the first unwatched item.
   */
  getInitialItemIndex: (story: TStory) => number;
  /**
   * Pass to `<AndroidStory onStoryItemSeen={markItemSeen} />` to record seen items.
   */
  markItemSeen: (info: StoryItemSeenInfo<TStory, TItem>) => void;
  /**
   * Clear all tracked watch/seen progress.
   */
  resetProgress: () => void;
}

export function useStoryProgress<
  TStory extends Record<string, unknown> = StoryGroupData,
  TItem extends Record<string, unknown> = StoryItemData,
>({
  stories,
  keyExtractor,
  getItems,
  getItemKey,
}: UseStoryProgressOptions<TStory, TItem>): UseStoryProgressResult<
  TStory,
  TItem
> {
  const [isOpen, setIsOpen] = useState(false);
  const [initialStoryIndex, setInitialStoryIndex] = useState(0);
  const [completedOrder, setCompletedOrder] = useState<string[]>([]);

  const frozenStoriesRef = useRef<readonly TStory[] | null>(null);
  const seenItemsRef = useRef<Record<string, Record<string, true>>>({});

  const resolveItems = useCallback(
    (story: TStory): readonly TItem[] => {
      if (getItems) return getItems(story);
      const raw = (story as StoryGroupData<TItem>).items;
      return Array.isArray(raw) ? raw : [];
    },
    [getItems]
  );

  const resolveItemKey = useCallback(
    (item: TItem, index: number, story: TStory): string => {
      if (getItemKey) return getItemKey(item, index, story);
      const rawId = (item as StoryItemData).id;
      return rawId != null ? String(rawId) : String(index);
    },
    [getItemKey]
  );

  const storyKeyMap = useMemo(() => {
    const map = new Map<TStory, string>();
    stories.forEach((story, index) => {
      const key = keyExtractor
        ? keyExtractor(story, index)
        : (story as StoryGroupData).id != null
          ? String((story as StoryGroupData).id)
          : String(index);
      map.set(story, key);
    });
    return map;
  }, [keyExtractor, stories]);

  const getStoryKey = useCallback(
    (story: TStory, fallbackIndex = 0): string => {
      const mapped = storyKeyMap.get(story);
      if (mapped != null) return mapped;
      if (keyExtractor) return keyExtractor(story, fallbackIndex);
      const rawId = (story as StoryGroupData).id;
      return rawId != null ? String(rawId) : String(fallbackIndex);
    },
    [keyExtractor, storyKeyMap]
  );

  const completedSet = useMemo(() => new Set(completedOrder), [completedOrder]);

  const computedOrderedStories = useMemo(() => {
    const unwatched: TStory[] = [];
    const byKey = new Map<string, TStory>();

    stories.forEach((story, idx) => {
      const key = getStoryKey(story, idx);
      byKey.set(key, story);
      if (!completedSet.has(key)) {
        unwatched.push(story);
      }
    });

    const watched: TStory[] = [];
    completedOrder.forEach((key) => {
      const story = byKey.get(key);
      if (story) {
        watched.push(story);
      }
    });

    return [...unwatched, ...watched];
  }, [completedOrder, completedSet, getStoryKey, stories]);

  const orderedStories =
    isOpen && frozenStoriesRef.current
      ? frozenStoriesRef.current
      : computedOrderedStories;

  const isStoryWatched = useCallback(
    (story: TStory): boolean => {
      const key = getStoryKey(story);
      return completedSet.has(key);
    },
    [completedSet, getStoryKey]
  );

  const getInitialItemIndex = useCallback(
    (story: TStory): number => {
      const key = getStoryKey(story);
      const items = resolveItems(story);
      const seenMap = seenItemsRef.current[key];
      if (!seenMap || items.length === 0) return 0;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item) continue;
        const itemKey = resolveItemKey(item, i, story);
        if (!seenMap[itemKey]) {
          return i;
        }
      }
      // All items watched: rewatch from the first item
      return 0;
    },
    [getStoryKey, resolveItemKey, resolveItems]
  );

  const markItemSeen = useCallback(
    ({
      story,
      item,
      storyIndex,
      itemIndex,
    }: StoryItemSeenInfo<TStory, TItem>) => {
      const storyKey = getStoryKey(story, storyIndex);
      const itemKey = resolveItemKey(item, itemIndex, story);

      const prev = seenItemsRef.current;
      if (prev[storyKey]?.[itemKey]) {
        return;
      }
      seenItemsRef.current = {
        ...prev,
        [storyKey]: {
          ...prev[storyKey],
          [itemKey]: true as const,
        },
      };
    },
    [getStoryKey, resolveItemKey]
  );

  const openStory = useCallback(
    (storyOrIndex: TStory | number) => {
      const list = computedOrderedStories;
      const targetIndex =
        typeof storyOrIndex === 'number'
          ? storyOrIndex
          : list.indexOf(storyOrIndex);
      const clampedIndex = Math.max(
        0,
        Math.min(targetIndex, Math.max(0, list.length - 1))
      );

      frozenStoriesRef.current = list;
      setInitialStoryIndex(clampedIndex);
      setIsOpen(true);
    },
    [computedOrderedStories]
  );

  const closeStory = useCallback(() => {
    const currentSeen = seenItemsRef.current;
    const newlyCompleted: string[] = [];

    stories.forEach((story, idx) => {
      const storyKey = getStoryKey(story, idx);
      const seenMap = currentSeen[storyKey];
      if (!seenMap) return;
      const items = resolveItems(story);
      const allSeen =
        items.length > 0 &&
        items.every((it, itemIdx) =>
          Boolean(seenMap[resolveItemKey(it, itemIdx, story)])
        );
      if (allSeen) {
        newlyCompleted.push(storyKey);
      }
    });

    frozenStoriesRef.current = null;
    setIsOpen(false);

    if (newlyCompleted.length > 0) {
      setCompletedOrder((prev) => {
        const additions = newlyCompleted.filter((key) => !prev.includes(key));
        return additions.length > 0 ? [...prev, ...additions] : prev;
      });
    }
  }, [getStoryKey, resolveItemKey, resolveItems, stories]);

  const resetProgress = useCallback(() => {
    frozenStoriesRef.current = null;
    seenItemsRef.current = {};
    setCompletedOrder([]);
  }, []);

  return {
    orderedStories,
    isOpen,
    initialStoryIndex,
    openStory,
    closeStory,
    isStoryWatched,
    getInitialItemIndex,
    markItemSeen,
    resetProgress,
  };
}
