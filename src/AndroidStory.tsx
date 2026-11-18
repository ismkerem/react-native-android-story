import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  PanResponder,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeSyntheticEvent,
} from 'react-native';
import { AndroidStoryView } from './AndroidStoryView';
import {
  inferMediaTypeFromUri,
  resolveImageUri,
  resolveMediaUri,
} from './resolveImageUri';
import type {
  AndroidStoryProps,
  AndroidStoryViewRef,
  PageScrollState,
  PageScrollStateChangedEvent,
  PageSelectedEvent,
  StoryGroupData,
  StoryItemData,
  StoryMediaType,
  StoryPageMediaConfig,
  StoryRenderItemInfo,
  StoryVideoLoadEvent,
  StoryVideoProgressEvent,
  StoryViewVideoBufferEvent,
  StoryViewVideoEndEvent,
  StoryViewVideoErrorEvent,
  StoryViewVideoLoadEvent,
  StoryViewVideoProgressEvent,
} from './types';

const DEFAULT_DURATION = 10000;
const DEFAULT_SWIPE_THRESHOLD = 120;
const PROGRESS_DRIFT_THRESHOLD = 0.04;

interface ActiveVideoState {
  key: string;
  hasExternalCallbacks: boolean;
  isLoaded: boolean;
  isBuffering: boolean;
  hasError: boolean;
  durationMs: number | undefined;
}

interface PreloadedVideoMeta {
  isLoaded: boolean;
  durationMs: number | undefined;
  hasError: boolean;
}

interface ProgressSegmentProps {
  index: number;
  currentIndex: number;
  isActiveStory: boolean;
  progress: Animated.Value;
  barColor: string;
  trackColor: string;
}

function ProgressSegment({
  index,
  currentIndex,
  isActiveStory,
  progress,
  barColor,
  trackColor,
}: ProgressSegmentProps) {
  const [trackWidth, setTrackWidth] = useState(0);

  const isCompleted = index < currentIndex;
  const isCurrent = index === currentIndex && isActiveStory;

  const translateX = useMemo(
    () =>
      progress.interpolate({
        inputRange: [0, 1],
        outputRange: [-trackWidth, 0],
      }),
    [progress, trackWidth]
  );

  return (
    <View
      style={[styles.progressTrack, { backgroundColor: trackColor }]}
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
    >
      {isCompleted ? (
        <View
          style={[styles.progressFillFull, { backgroundColor: barColor }]}
        />
      ) : isCurrent && trackWidth > 0 ? (
        <Animated.View
          style={[
            styles.progressFillFull,
            {
              backgroundColor: barColor,
              transform: [{ translateX }],
            },
          ]}
        />
      ) : null}
    </View>
  );
}

export function AndroidStory<
  TStory extends Record<string, unknown> = StoryGroupData,
  TItem extends Record<string, unknown> = StoryItemData,
>({
  stories,
  visible = true,
  initialStoryIndex = 0,
  initialItemIndex = 0,
  getInitialItemIndex,
  duration = DEFAULT_DURATION,
  autoPlay = true,
  swipeToClose = true,
  swipeToCloseThreshold = DEFAULT_SWIPE_THRESHOLD,
  tapToNavigate = true,
  pauseOnHold = true,
  hideOverlaysOnHold = true,
  showProgressBar = true,
  showUser = true,
  showCloseButton = true,
  showLoadingIndicator = true,
  muted = false,
  videoResizeMode = 'cover',
  repeatVideo = false,
  progressBarColor = '#FFFFFF',
  progressTrackColor = 'rgba(255, 255, 255, 0.32)',
  backdropColor = '#000000',
  perspective = 4.5,
  cubeAngle = 90,
  style,
  keyExtractor,
  getItems,
  getItemDuration,
  getItemImage,
  getItemType,
  getItemVideo,
  getItemPoster,
  renderItem,
  renderVideo,
  renderHeader,
  renderFooter,
  onStoryChange,
  onItemChange,
  onStoryItemSeen,
  onVideoLoad,
  onVideoEnd,
  onVideoError,
  onClose,
  onFinish,
}: AndroidStoryProps<TStory, TItem>) {
  const { height: windowHeight } = useWindowDimensions();

  const storyViewRef = useRef<AndroidStoryViewRef>(null);

  const clampedInitialStory = Math.max(
    0,
    Math.min(initialStoryIndex, Math.max(0, stories.length - 1))
  );

  const resolveItems = useCallback(
    (story: TStory): readonly TItem[] => {
      if (getItems) return getItems(story);
      const raw = (story as StoryGroupData<TItem>).items;
      return Array.isArray(raw) ? raw : [];
    },
    [getItems]
  );

  const buildInitialItemIndices = useCallback(
    (targetStoryIndex: number): Record<number, number> => {
      const indices: Record<number, number> = {};
      stories.forEach((story, idx) => {
        const items = resolveItems(story);
        const requested = getInitialItemIndex
          ? getInitialItemIndex(story, idx)
          : idx === targetStoryIndex
            ? initialItemIndex
            : 0;
        indices[idx] = Math.max(
          0,
          Math.min(requested, Math.max(0, items.length - 1))
        );
      });
      return indices;
    },
    [getInitialItemIndex, initialItemIndex, resolveItems, stories]
  );

  const [activeStoryIndex, setActiveStoryIndex] = useState(clampedInitialStory);
  const [itemIndices, setItemIndices] = useState<Record<number, number>>(() =>
    buildInitialItemIndices(clampedInitialStory)
  );
  const [scrollState, setScrollState] = useState<PageScrollState>('idle');
  const [isHolding, setIsHolding] = useState(false);
  const [isSwipingDown, setIsSwipingDown] = useState(false);
  const [replayTick, setReplayTick] = useState(0);
  const [videoSyncTick, setVideoSyncTick] = useState(0);
  const [videoState, setVideoState] = useState<ActiveVideoState>({
    key: '',
    hasExternalCallbacks: false,
    isLoaded: false,
    isBuffering: false,
    hasError: false,
    durationMs: undefined,
  });

  const progressAnim = useRef(new Animated.Value(0)).current;
  const remainingRatioRef = useRef(1);
  const currentProgressRef = useRef(0);
  const skipStopSaveRef = useRef(false);
  const activeKeyRef = useRef('');
  const lastSeenKeyRef = useRef('');
  const wasLongPressRef = useRef(false);
  const preloadedVideoMetaRef = useRef<Record<string, PreloadedVideoMeta>>({});
  const startedBuiltInVideosRef = useRef<Set<string>>(new Set());
  const prevReplayTickRef = useRef(replayTick);
  const prevSeekTargetRef = useRef('');

  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const backdropOpacity = useRef(new Animated.Value(1)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;

  const resolveExplicitItemDuration = useCallback(
    (item: TItem, story: TStory): number | undefined => {
      if (getItemDuration) return getItemDuration(item, story);
      const itemDuration = (item as StoryItemData).duration;
      return typeof itemDuration === 'number' && itemDuration > 0
        ? itemDuration
        : undefined;
    },
    [getItemDuration]
  );

  const resolveExplicitVideoField = useCallback(
    (item: TItem): string | undefined => {
      const record = item as StoryItemData;
      return resolveMediaUri(record.videoUri) ?? resolveMediaUri(record.video);
    },
    []
  );

  const resolveItemType = useCallback(
    (item: TItem, story: TStory): StoryMediaType => {
      if (getItemType) return getItemType(item, story);
      const record = item as StoryItemData;
      const declaredType = record.type ?? record.mediaType;
      if (typeof declaredType === 'string') {
        const lower = declaredType.trim().toLowerCase();
        if (lower === 'video') return 'video';
        if (lower === 'image') return 'image';
      }
      if (resolveExplicitVideoField(item)) return 'video';
      if (getItemVideo && getItemVideo(item, story)) return 'video';
      if (
        inferMediaTypeFromUri(record.uri) === 'video' ||
        inferMediaTypeFromUri(record.url) === 'video'
      ) {
        return 'video';
      }
      return 'image';
    },
    [getItemType, getItemVideo, resolveExplicitVideoField]
  );

  const resolveItemVideo = useCallback(
    (
      item: TItem,
      story: TStory,
      mediaType?: StoryMediaType
    ): string | undefined => {
      if (getItemVideo) return getItemVideo(item, story);
      const explicit = resolveExplicitVideoField(item);
      if (explicit) return explicit;
      const resolvedType = mediaType ?? resolveItemType(item, story);
      if (resolvedType === 'video') {
        const record = item as StoryItemData;
        return resolveMediaUri(record.uri) ?? resolveMediaUri(record.url);
      }
      return undefined;
    },
    [getItemVideo, resolveExplicitVideoField, resolveItemType]
  );

  const resolveItemPoster = useCallback(
    (item: TItem, story: TStory): string | undefined => {
      if (getItemPoster) return getItemPoster(item, story);
      const record = item as StoryItemData;
      return (
        resolveMediaUri(record.posterUri) ??
        resolveMediaUri(record.thumbnailUri) ??
        resolveMediaUri(record.imageUri) ??
        resolveMediaUri(record.image)
      );
    },
    [getItemPoster]
  );

  const resolveItemImage = useCallback(
    (item: TItem, story: TStory): string | undefined => {
      if (getItemImage) return getItemImage(item, story);
      const record = item as StoryItemData;
      return (
        resolveImageUri(record.imageUri) ??
        resolveImageUri(record.image) ??
        resolveImageUri(record.uri) ??
        resolveImageUri(record.url)
      );
    },
    [getItemImage]
  );

  const resolveStoryKey = useCallback(
    (story: TStory, index: number): string => {
      if (keyExtractor) return keyExtractor(story, index);
      const rawId = (story as StoryGroupData).id;
      return rawId != null ? String(rawId) : String(index);
    },
    [keyExtractor]
  );

  // Reset state whenever visibility opens
  const prevVisibleRef = useRef(visible);
  useEffect(() => {
    if (visible && !prevVisibleRef.current) {
      const nextInitial = Math.max(
        0,
        Math.min(initialStoryIndex, Math.max(0, stories.length - 1))
      );
      setActiveStoryIndex(nextInitial);
      setItemIndices(buildInitialItemIndices(nextInitial));
      setIsHolding(false);
      setIsSwipingDown(false);
      setScrollState('idle');
      lastSeenKeyRef.current = '';
      preloadedVideoMetaRef.current = {};
      startedBuiltInVideosRef.current.clear();
      prevSeekTargetRef.current = '';
      progressAnim.setValue(0);
      remainingRatioRef.current = 1;
      currentProgressRef.current = 0;
      skipStopSaveRef.current = false;
      setVideoState({
        key: '',
        hasExternalCallbacks: false,
        isLoaded: false,
        isBuffering: false,
        hasError: false,
        durationMs: undefined,
      });
      translateY.setValue(0);
      scale.setValue(1);
      backdropOpacity.setValue(1);
      overlayOpacity.setValue(1);
    }
    prevVisibleRef.current = visible;
  }, [
    backdropOpacity,
    buildInitialItemIndices,
    initialStoryIndex,
    overlayOpacity,
    progressAnim,
    scale,
    stories.length,
    translateY,
    visible,
  ]);

  const prevInitialStoryIndexRef = useRef(clampedInitialStory);
  useEffect(() => {
    if (visible && prevInitialStoryIndexRef.current !== clampedInitialStory) {
      prevInitialStoryIndexRef.current = clampedInitialStory;
      if (clampedInitialStory !== activeStoryIndexRef.current) {
        activeStoryIndexRef.current = clampedInitialStory;
        setActiveStoryIndex(clampedInitialStory);
        storyViewRef.current?.setPage(clampedInitialStory);
      }
    } else {
      prevInitialStoryIndexRef.current = clampedInitialStory;
    }
  }, [clampedInitialStory, visible]);

  useEffect(() => {
    const id = progressAnim.addListener(({ value }) => {
      currentProgressRef.current = value;
    });
    return () => {
      progressAnim.removeListener(id);
    };
  }, [progressAnim]);

  const activeStory = stories[activeStoryIndex];
  const activeItems = useMemo(
    () => (activeStory ? resolveItems(activeStory) : []),
    [activeStory, resolveItems]
  );
  const rawItemIndex = itemIndices[activeStoryIndex] ?? 0;
  const activeItemIndex = Math.max(
    0,
    Math.min(rawItemIndex, Math.max(0, activeItems.length - 1))
  );
  const activeItem = activeItems[activeItemIndex];

  const isPaused =
    (pauseOnHold && isHolding) || isSwipingDown || scrollState === 'dragging';
  const hideOverlays = hideOverlaysOnHold && isHolding;

  useEffect(() => {
    Animated.timing(overlayOpacity, {
      toValue: hideOverlays ? 0 : 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [hideOverlays, overlayOpacity]);

  useEffect(() => {
    if (!visible || !activeStory || !activeItem) return;
    const seenKey = `${activeStoryIndex}:${activeItemIndex}`;
    if (lastSeenKeyRef.current === seenKey) return;
    lastSeenKeyRef.current = seenKey;
    onStoryItemSeen?.({
      story: activeStory,
      item: activeItem,
      storyIndex: activeStoryIndex,
      itemIndex: activeItemIndex,
      isLastItem: activeItemIndex >= activeItems.length - 1,
    });
  }, [
    activeItem,
    activeItemIndex,
    activeItems.length,
    activeStory,
    activeStoryIndex,
    onStoryItemSeen,
    visible,
  ]);

  const closeWithAnimation = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: windowHeight,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose?.();
    });
  }, [backdropOpacity, onClose, translateY, windowHeight]);

  const finishOrClose = useCallback(() => {
    if (onFinish) {
      onFinish();
    } else {
      closeWithAnimation();
    }
  }, [closeWithAnimation, onFinish]);

  const goNext = useCallback(() => {
    if (!activeStory) return;
    if (activeItemIndex < activeItems.length - 1) {
      const nextItemIndex = activeItemIndex + 1;
      setItemIndices((prev) => ({
        ...prev,
        [activeStoryIndex]: nextItemIndex,
      }));
      const nextItem = activeItems[nextItemIndex];
      if (nextItem) {
        onItemChange?.(nextItemIndex, nextItem, activeStoryIndex, activeStory);
      }
      return;
    }

    if (activeStoryIndex < stories.length - 1) {
      storyViewRef.current?.setPage(activeStoryIndex + 1);
    } else {
      finishOrClose();
    }
  }, [
    activeItemIndex,
    activeItems,
    activeStory,
    activeStoryIndex,
    finishOrClose,
    onItemChange,
    stories.length,
  ]);

  const goPrev = useCallback(() => {
    if (!activeStory) return;
    if (activeItemIndex > 0) {
      const prevItemIndex = activeItemIndex - 1;
      setItemIndices((prev) => ({
        ...prev,
        [activeStoryIndex]: prevItemIndex,
      }));
      const prevItem = activeItems[prevItemIndex];
      if (prevItem) {
        onItemChange?.(prevItemIndex, prevItem, activeStoryIndex, activeStory);
      }
      return;
    }

    if (activeStoryIndex > 0) {
      storyViewRef.current?.setPage(activeStoryIndex - 1);
    } else {
      setReplayTick((tick) => tick + 1);
    }
  }, [
    activeItemIndex,
    activeItems,
    activeStory,
    activeStoryIndex,
    onItemChange,
  ]);

  const goNextRef = useRef(goNext);
  goNextRef.current = goNext;

  const activeStoryIndexRef = useRef(activeStoryIndex);
  activeStoryIndexRef.current = activeStoryIndex;

  const activeItemIndexRef = useRef(activeItemIndex);
  activeItemIndexRef.current = activeItemIndex;

  // Auto-next timer & video playback sync
  const currentKey = `${activeStoryIndex}:${activeItemIndex}:${replayTick}`;
  const currentKeyRef = useRef(currentKey);
  currentKeyRef.current = currentKey;

  const activeMediaType: StoryMediaType =
    activeStory && activeItem
      ? resolveItemType(activeItem, activeStory)
      : 'image';
  const activeVideoUri =
    activeStory && activeItem && activeMediaType === 'video'
      ? resolveItemVideo(activeItem, activeStory, activeMediaType)
      : undefined;
  const isBuiltInVideo =
    activeMediaType === 'video' &&
    !renderItem &&
    !renderVideo &&
    Boolean(activeVideoUri);
  const activeItemIdentity =
    activeStory && activeItem
      ? `${resolveStoryKey(activeStory, activeStoryIndex)}:${activeItemIndex}:${activeVideoUri ?? ''}`
      : '';
  const preloadedMeta = activeItemIdentity
    ? preloadedVideoMetaRef.current[activeItemIdentity]
    : undefined;

  const buildInitialVideoState = useCallback(
    (
      key: string,
      builtInVideo: boolean,
      meta?: PreloadedVideoMeta
    ): ActiveVideoState => ({
      key,
      hasExternalCallbacks: false,
      isLoaded: meta?.isLoaded ?? false,
      isBuffering:
        builtInVideo &&
        !(meta?.isLoaded ?? false) &&
        !(meta?.hasError ?? false),
      hasError: meta?.hasError ?? false,
      durationMs: meta?.durationMs,
    }),
    []
  );

  const currentVideoState =
    videoState.key === currentKey
      ? videoState
      : buildInitialVideoState(currentKey, isBuiltInVideo, preloadedMeta);

  const usesVideoSync =
    activeMediaType === 'video' &&
    (isBuiltInVideo || currentVideoState.hasExternalCallbacks);

  const explicitDuration =
    activeStory && activeItem
      ? resolveExplicitItemDuration(activeItem, activeStory)
      : undefined;
  const activeDuration =
    explicitDuration ??
    (usesVideoSync &&
    currentVideoState.durationMs &&
    currentVideoState.durationMs > 0
      ? currentVideoState.durationMs
      : duration);

  const activeDurationRef = useRef(activeDuration);
  activeDurationRef.current = activeDuration;

  useEffect(() => {
    if (activeKeyRef.current !== currentKey) {
      activeKeyRef.current = currentKey;
      progressAnim.setValue(0);
      remainingRatioRef.current = 1;
      currentProgressRef.current = 0;
      skipStopSaveRef.current = false;
    }

    if (!visible || !autoPlay || isPaused || !activeStory || !activeItem) {
      return undefined;
    }

    if (
      usesVideoSync &&
      !currentVideoState.hasError &&
      (!currentVideoState.isLoaded || currentVideoState.isBuffering)
    ) {
      return undefined;
    }

    const remainingMs = Math.max(
      50,
      activeDuration * remainingRatioRef.current
    );
    const anim = Animated.timing(progressAnim, {
      toValue: 1,
      duration: remainingMs,
      easing: Easing.linear,
      useNativeDriver: true,
    });

    const capturedKey = currentKey;
    const shouldAdvanceOnAnimEnd =
      !usesVideoSync ||
      explicitDuration !== undefined ||
      currentVideoState.hasError;

    anim.start(({ finished }) => {
      if (
        finished &&
        activeKeyRef.current === capturedKey &&
        shouldAdvanceOnAnimEnd
      ) {
        remainingRatioRef.current = 0;
        goNextRef.current();
      }
    });

    return () => {
      anim.stop();
      if (skipStopSaveRef.current) {
        skipStopSaveRef.current = false;
        return;
      }
      if (activeKeyRef.current === capturedKey) {
        progressAnim.stopAnimation((val) => {
          if (activeKeyRef.current === capturedKey) {
            remainingRatioRef.current = Math.max(0, 1 - val);
          }
        });
      }
    };
  }, [
    activeDuration,
    activeItem,
    activeStory,
    autoPlay,
    currentKey,
    currentVideoState.hasError,
    currentVideoState.isBuffering,
    currentVideoState.isLoaded,
    explicitDuration,
    isPaused,
    progressAnim,
    usesVideoSync,
    videoSyncTick,
    visible,
  ]);

  // Keep latest swipe config in refs for PanResponder
  const swipeConfigRef = useRef({
    swipeToClose,
    swipeToCloseThreshold,
    windowHeight,
    closeWithAnimation,
  });
  swipeConfigRef.current = {
    swipeToClose,
    swipeToCloseThreshold,
    windowHeight,
    closeWithAnimation,
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          swipeConfigRef.current.swipeToClose &&
          gestureState.dy > 10 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.2,
        onPanResponderGrant: () => {
          setIsSwipingDown(true);
        },
        onPanResponderMove: (_, gestureState) => {
          const dy = Math.max(0, gestureState.dy);
          translateY.setValue(dy);
          scale.setValue(Math.max(0.85, 1 - dy / 1500));
          backdropOpacity.setValue(Math.max(0, 1 - dy / 400));
        },
        onPanResponderRelease: (_, gestureState) => {
          setIsSwipingDown(false);
          const {
            swipeToCloseThreshold: threshold,
            closeWithAnimation: doClose,
          } = swipeConfigRef.current;
          if (gestureState.dy > threshold || gestureState.vy > 0.8) {
            doClose();
          } else {
            Animated.parallel([
              Animated.spring(translateY, {
                toValue: 0,
                useNativeDriver: true,
              }),
              Animated.spring(scale, {
                toValue: 1,
                useNativeDriver: true,
              }),
              Animated.timing(backdropOpacity, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
              }),
            ]).start();
          }
        },
        onPanResponderTerminate: () => {
          setIsSwipingDown(false);
          Animated.parallel([
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
            }),
            Animated.spring(scale, {
              toValue: 1,
              useNativeDriver: true,
            }),
            Animated.timing(backdropOpacity, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }),
          ]).start();
        },
      }),
    [backdropOpacity, scale, translateY]
  );

  const handlePageSelected = useCallback(
    (event: NativeSyntheticEvent<PageSelectedEvent>) => {
      const nextIndex = event.nativeEvent.position;
      if (activeStoryIndexRef.current !== nextIndex) {
        activeStoryIndexRef.current = nextIndex;
        setActiveStoryIndex(nextIndex);
      }
      const story = stories[nextIndex];
      if (story) {
        onStoryChange?.(nextIndex, story);
        const items = resolveItems(story);
        const itemIdx = itemIndices[nextIndex] ?? 0;
        const item = items[itemIdx];
        if (item) {
          onItemChange?.(itemIdx, item, nextIndex, story);
        }
      }
    },
    [itemIndices, onItemChange, onStoryChange, resolveItems, stories]
  );

  const handlePageScrollStateChanged = useCallback(
    (event: NativeSyntheticEvent<PageScrollStateChangedEvent>) => {
      const nextState = event.nativeEvent.pageScrollState;
      setScrollState((prev) => {
        if ((prev === 'dragging') === (nextState === 'dragging')) {
          return prev;
        }
        return nextState;
      });
    },
    []
  );

  const handlePressIn = useCallback(() => {
    wasLongPressRef.current = false;
  }, []);

  const handleLongPress = useCallback(() => {
    if (!pauseOnHold && !hideOverlaysOnHold) return;
    wasLongPressRef.current = true;
    setIsHolding(true);
  }, [hideOverlaysOnHold, pauseOnHold]);

  const handlePressOut = useCallback(() => {
    if (isHolding) {
      setIsHolding(false);
    }
  }, [isHolding]);

  const handleTapLeft = useCallback(() => {
    if (wasLongPressRef.current || !tapToNavigate) return;
    goPrev();
  }, [goPrev, tapToNavigate]);

  const handleTapRight = useCallback(() => {
    if (wasLongPressRef.current || !tapToNavigate) return;
    goNext();
  }, [goNext, tapToNavigate]);

  const handleItemVideoLoad = useCallback(
    (
      story: TStory,
      storyIndex: number,
      item: TItem,
      itemIndex: number,
      itemIdentity: string,
      event: StoryVideoLoadEvent
    ) => {
      const durationMs =
        typeof event.duration === 'number' && event.duration > 0
          ? event.duration
          : undefined;
      preloadedVideoMetaRef.current[itemIdentity] = {
        isLoaded: true,
        durationMs,
        hasError: false,
      };
      onVideoLoad?.({ ...event, item, story, itemIndex, storyIndex });

      if (
        storyIndex !== activeStoryIndexRef.current ||
        itemIndex !== activeItemIndexRef.current
      ) {
        return;
      }
      const expectedKey = currentKeyRef.current;
      setVideoState((prev) => {
        const base =
          prev.key === expectedKey
            ? prev
            : buildInitialVideoState(expectedKey, false);
        return {
          ...base,
          key: expectedKey,
          hasExternalCallbacks: true,
          isLoaded: true,
          isBuffering: false,
          hasError: false,
          durationMs: durationMs ?? base.durationMs,
        };
      });
    },
    [buildInitialVideoState, onVideoLoad]
  );

  const handleItemVideoProgress = useCallback(
    (
      storyIndex: number,
      itemIndex: number,
      itemIdentity: string,
      event: StoryVideoProgressEvent
    ) => {
      if (
        storyIndex !== activeStoryIndexRef.current ||
        itemIndex !== activeItemIndexRef.current
      ) {
        return;
      }
      const durationMs =
        typeof event.duration === 'number' && event.duration > 0
          ? event.duration
          : undefined;
      if (durationMs !== undefined) {
        const prevMeta = preloadedVideoMetaRef.current[itemIdentity];
        if (!prevMeta?.isLoaded || prevMeta.durationMs !== durationMs) {
          preloadedVideoMetaRef.current[itemIdentity] = {
            isLoaded: true,
            durationMs,
            hasError: false,
          };
        }
      }

      const expectedKey = currentKeyRef.current;
      setVideoState((prev) => {
        if (
          prev.key === expectedKey &&
          prev.hasExternalCallbacks &&
          prev.isLoaded &&
          (durationMs === undefined || prev.durationMs === durationMs)
        ) {
          return prev;
        }
        const base =
          prev.key === expectedKey
            ? prev
            : buildInitialVideoState(expectedKey, false);
        return {
          ...base,
          key: expectedKey,
          hasExternalCallbacks: true,
          isLoaded: true,
          isBuffering: false,
          durationMs: durationMs ?? base.durationMs,
        };
      });

      const targetDuration = durationMs ?? activeDurationRef.current;
      if (targetDuration > 0 && event.currentTime >= 0) {
        const actualRatio = Math.min(
          1,
          Math.max(0, event.currentTime / targetDuration)
        );
        if (
          Math.abs(actualRatio - currentProgressRef.current) >
          PROGRESS_DRIFT_THRESHOLD
        ) {
          skipStopSaveRef.current = true;
          remainingRatioRef.current = Math.max(0, 1 - actualRatio);
          currentProgressRef.current = actualRatio;
          progressAnim.setValue(actualRatio);
          setVideoSyncTick((tick) => tick + 1);
        }
      }
    },
    [buildInitialVideoState, progressAnim]
  );

  const handleItemVideoBuffer = useCallback(
    (storyIndex: number, itemIndex: number, isBuffering: boolean) => {
      if (
        storyIndex !== activeStoryIndexRef.current ||
        itemIndex !== activeItemIndexRef.current
      ) {
        return;
      }
      const expectedKey = currentKeyRef.current;
      setVideoState((prev) => {
        const base =
          prev.key === expectedKey
            ? prev
            : buildInitialVideoState(expectedKey, false);
        if (
          prev.key === expectedKey &&
          prev.hasExternalCallbacks &&
          prev.isBuffering === isBuffering
        ) {
          return prev;
        }
        return {
          ...base,
          key: expectedKey,
          hasExternalCallbacks: true,
          isBuffering,
        };
      });
    },
    [buildInitialVideoState]
  );

  const handleItemVideoEnd = useCallback(
    (story: TStory, storyIndex: number, item: TItem, itemIndex: number) => {
      if (
        !visible ||
        storyIndex !== activeStoryIndexRef.current ||
        itemIndex !== activeItemIndexRef.current
      ) {
        return;
      }
      onVideoEnd?.({ item, story, itemIndex, storyIndex });
      if (autoPlay && !repeatVideo) {
        progressAnim.setValue(1);
        remainingRatioRef.current = 0;
        currentProgressRef.current = 1;
        goNextRef.current();
      }
    },
    [autoPlay, onVideoEnd, progressAnim, repeatVideo, visible]
  );

  const handleItemVideoError = useCallback(
    (
      story: TStory,
      storyIndex: number,
      item: TItem,
      itemIndex: number,
      itemIdentity: string,
      error?: unknown
    ) => {
      preloadedVideoMetaRef.current[itemIdentity] = {
        isLoaded: false,
        durationMs: undefined,
        hasError: true,
      };
      onVideoError?.({ error, item, story, itemIndex, storyIndex });

      if (
        storyIndex !== activeStoryIndexRef.current ||
        itemIndex !== activeItemIndexRef.current
      ) {
        return;
      }
      const expectedKey = currentKeyRef.current;
      setVideoState((prev) => {
        const base =
          prev.key === expectedKey
            ? prev
            : buildInitialVideoState(expectedKey, false);
        return {
          ...base,
          key: expectedKey,
          hasExternalCallbacks: true,
          isLoaded: false,
          isBuffering: false,
          hasError: true,
        };
      });
    },
    [buildInitialVideoState, onVideoError]
  );

  useEffect(() => {
    const prevReplayTick = prevReplayTickRef.current;
    prevReplayTickRef.current = replayTick;

    if (!visible || !isBuiltInVideo) {
      return;
    }

    const activePosKey = `${activeStoryIndex}:${activeItemIndex}`;
    const targetChanged = prevSeekTargetRef.current !== activePosKey;
    prevSeekTargetRef.current = activePosKey;

    if (
      prevReplayTick !== replayTick ||
      (targetChanged && startedBuiltInVideosRef.current.has(activePosKey))
    ) {
      storyViewRef.current?.seekVideo(activeStoryIndex, 0);
    }

    if (!isPaused) {
      startedBuiltInVideosRef.current.add(activePosKey);
    }
  }, [
    activeItemIndex,
    activeStoryIndex,
    isBuiltInVideo,
    isPaused,
    replayTick,
    visible,
  ]);

  const resolvedStoryPages = useMemo(
    () =>
      stories.map((story, storyIndex) => {
        const items = resolveItems(story);
        const rawIdx = itemIndices[storyIndex] ?? 0;
        const currentIdx = Math.max(
          0,
          Math.min(rawIdx, Math.max(0, items.length - 1))
        );
        const currentItem = items[currentIdx];
        const storyKey = resolveStoryKey(story, storyIndex);
        const mediaType: StoryMediaType = currentItem
          ? resolveItemType(currentItem, story)
          : 'image';
        const resolvedVideoUri =
          currentItem && mediaType === 'video'
            ? resolveItemVideo(currentItem, story, mediaType)
            : undefined;
        const resolvedPosterUri =
          currentItem && mediaType === 'video'
            ? resolveItemPoster(currentItem, story)
            : undefined;
        const fallbackImage =
          currentItem && mediaType === 'image'
            ? resolveItemImage(currentItem, story)
            : undefined;
        const itemMuted =
          typeof (currentItem as StoryItemData | undefined)?.muted === 'boolean'
            ? Boolean((currentItem as StoryItemData).muted)
            : muted;
        const itemIdentity = `${storyKey}:${currentIdx}:${resolvedVideoUri ?? ''}`;
        const isBuiltInVideoPage = Boolean(
          currentItem &&
          mediaType === 'video' &&
          resolvedVideoUri &&
          !renderItem &&
          !renderVideo
        );

        return {
          story,
          storyIndex,
          items,
          currentIdx,
          currentItem,
          storyKey,
          mediaType,
          resolvedVideoUri,
          resolvedPosterUri,
          fallbackImage,
          itemMuted,
          itemIdentity,
          isBuiltInVideoPage,
        };
      }),
    [
      itemIndices,
      muted,
      renderItem,
      renderVideo,
      resolveItemImage,
      resolveItemPoster,
      resolveItemType,
      resolveItemVideo,
      resolveItems,
      resolveStoryKey,
      stories,
    ]
  );

  const resolvedStoryPagesRef = useRef(resolvedStoryPages);
  resolvedStoryPagesRef.current = resolvedStoryPages;

  const pageMedia = useMemo<StoryPageMediaConfig[]>(
    () =>
      resolvedStoryPages.map((page) =>
        page.isBuiltInVideoPage && page.resolvedVideoUri
          ? {
              enabled: true,
              mediaType: 'video',
              uri: page.resolvedVideoUri,
              posterUri: page.resolvedPosterUri,
              muted: page.itemMuted,
            }
          : { enabled: false }
      ),
    [resolvedStoryPages]
  );

  const handleViewVideoLoad = useCallback(
    (event: NativeSyntheticEvent<StoryViewVideoLoadEvent>) => {
      const { position, duration: rawDur, width, height } = event.nativeEvent;
      const page = resolvedStoryPagesRef.current[position];
      if (!page?.currentItem) return;
      handleItemVideoLoad(
        page.story,
        position,
        page.currentItem,
        page.currentIdx,
        page.itemIdentity,
        { duration: rawDur, width, height }
      );
    },
    [handleItemVideoLoad]
  );

  const handleViewVideoProgress = useCallback(
    (event: NativeSyntheticEvent<StoryViewVideoProgressEvent>) => {
      const { position, currentTime, duration: rawDur } = event.nativeEvent;
      const page = resolvedStoryPagesRef.current[position];
      if (!page?.currentItem) return;
      handleItemVideoProgress(position, page.currentIdx, page.itemIdentity, {
        currentTime,
        duration: rawDur,
      });
    },
    [handleItemVideoProgress]
  );

  const handleViewVideoBuffer = useCallback(
    (event: NativeSyntheticEvent<StoryViewVideoBufferEvent>) => {
      const { position, isBuffering } = event.nativeEvent;
      const page = resolvedStoryPagesRef.current[position];
      if (!page?.currentItem) return;
      handleItemVideoBuffer(position, page.currentIdx, isBuffering);
    },
    [handleItemVideoBuffer]
  );

  const handleViewVideoEnd = useCallback(
    (event: NativeSyntheticEvent<StoryViewVideoEndEvent>) => {
      const { position } = event.nativeEvent;
      const page = resolvedStoryPagesRef.current[position];
      if (!page?.currentItem) return;
      handleItemVideoEnd(
        page.story,
        position,
        page.currentItem,
        page.currentIdx
      );
    },
    [handleItemVideoEnd]
  );

  const handleViewVideoError = useCallback(
    (event: NativeSyntheticEvent<StoryViewVideoErrorEvent>) => {
      const { position, message } = event.nativeEvent;
      const page = resolvedStoryPagesRef.current[position];
      if (!page?.currentItem) return;
      handleItemVideoError(
        page.story,
        position,
        page.currentItem,
        page.currentIdx,
        page.itemIdentity,
        { message }
      );
    },
    [handleItemVideoError]
  );

  const nativeStoryData = useMemo(() => ({ stories }), [stories]);

  if (!visible || stories.length === 0) {
    return null;
  }

  return (
    <View style={[styles.root, style]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.backdrop,
          {
            backgroundColor: backdropColor,
            opacity: backdropOpacity,
          },
        ]}
      />
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.sheet,
          {
            transform: [{ translateY }, { scale }],
          },
        ]}
      >
        <AndroidStoryView
          ref={storyViewRef}
          style={styles.pager}
          storyData={nativeStoryData}
          pageMedia={pageMedia}
          paused={!visible || isPaused}
          muted={muted}
          repeat={repeatVideo}
          videoResizeMode={videoResizeMode}
          initialPage={clampedInitialStory}
          perspective={perspective}
          cubeAngle={cubeAngle}
          overScrollMode="never"
          onPageSelected={handlePageSelected}
          onPageScrollStateChanged={handlePageScrollStateChanged}
          onVideoLoad={handleViewVideoLoad}
          onVideoProgress={handleViewVideoProgress}
          onVideoBuffer={handleViewVideoBuffer}
          onVideoEnd={handleViewVideoEnd}
          onVideoError={handleViewVideoError}
        >
          {resolvedStoryPages.map((page) => {
            const {
              story,
              storyIndex,
              items,
              currentIdx,
              currentItem,
              storyKey,
              mediaType,
              resolvedVideoUri,
              resolvedPosterUri,
              fallbackImage,
              itemMuted,
              itemIdentity,
              isBuiltInVideoPage,
            } = page;
            const isActiveStory = storyIndex === activeStoryIndex;

            const itemRenderInfo: StoryRenderItemInfo<TStory, TItem> | null =
              currentItem
                ? {
                    item: currentItem,
                    story,
                    itemIndex: currentIdx,
                    storyIndex,
                    isActive: isActiveStory,
                    isPaused: isActiveStory && isPaused,
                    progress: progressAnim,
                    mediaType,
                    imageUri: fallbackImage,
                    videoUri: resolvedVideoUri,
                    posterUri: resolvedPosterUri,
                    muted: itemMuted,
                    onVideoLoad: (event) =>
                      handleItemVideoLoad(
                        story,
                        storyIndex,
                        currentItem,
                        currentIdx,
                        itemIdentity,
                        event
                      ),
                    onVideoProgress: (event) =>
                      handleItemVideoProgress(
                        storyIndex,
                        currentIdx,
                        itemIdentity,
                        event
                      ),
                    onVideoBuffer: (isBuffering) =>
                      handleItemVideoBuffer(
                        storyIndex,
                        currentIdx,
                        isBuffering
                      ),
                    onVideoEnd: () =>
                      handleItemVideoEnd(
                        story,
                        storyIndex,
                        currentItem,
                        currentIdx
                      ),
                    onVideoError: (error) =>
                      handleItemVideoError(
                        story,
                        storyIndex,
                        currentItem,
                        currentIdx,
                        itemIdentity,
                        error
                      ),
                  }
                : null;

            const storyTitle =
              typeof story.username === 'string'
                ? story.username
                : typeof story.name === 'string'
                  ? story.name
                  : undefined;
            const storyAvatarUri =
              resolveImageUri((story as StoryGroupData).avatarUri) ??
              resolveImageUri((story as StoryGroupData).userUri);

            const showBuiltInSpinner =
              showLoadingIndicator &&
              isActiveStory &&
              isBuiltInVideoPage &&
              currentVideoState.isBuffering &&
              !currentVideoState.hasError;

            const showBuiltInPoster =
              isBuiltInVideoPage &&
              Boolean(resolvedPosterUri) &&
              (!isActiveStory ||
                (!currentVideoState.isLoaded && !currentVideoState.hasError));

            return (
              <View
                key={storyKey}
                style={[
                  styles.storyPage,
                  isBuiltInVideoPage && styles.storyPageTransparent,
                ]}
              >
                {/* Story Item Content */}
                <View style={styles.contentLayer}>
                  {itemRenderInfo ? (
                    renderItem ? (
                      renderItem(itemRenderInfo)
                    ) : mediaType === 'video' && resolvedVideoUri ? (
                      renderVideo ? (
                        renderVideo({
                          ...itemRenderInfo,
                          videoUri: resolvedVideoUri,
                        })
                      ) : (
                        <>
                          {showBuiltInPoster && resolvedPosterUri ? (
                            <Image
                              source={{ uri: resolvedPosterUri }}
                              style={styles.defaultImage}
                              resizeMode={videoResizeMode}
                            />
                          ) : null}
                          {showBuiltInSpinner ? (
                            <View
                              style={styles.loadingOverlay}
                              pointerEvents="none"
                            >
                              <ActivityIndicator size="large" color="#FFFFFF" />
                            </View>
                          ) : null}
                        </>
                      )
                    ) : fallbackImage ? (
                      <Image
                        source={{ uri: fallbackImage }}
                        style={styles.defaultImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.emptyContent} />
                    )
                  ) : (
                    <View style={styles.emptyContent} />
                  )}
                </View>

                {/* Tap Left / Tap Right / Hold-to-Pause Layer */}
                {(tapToNavigate || pauseOnHold || hideOverlaysOnHold) && (
                  <View style={styles.touchLayer} pointerEvents="box-none">
                    <Pressable
                      style={styles.leftTouchZone}
                      delayLongPress={150}
                      onPressIn={handlePressIn}
                      onLongPress={handleLongPress}
                      onPressOut={handlePressOut}
                      onPress={handleTapLeft}
                    />
                    <Pressable
                      style={styles.rightTouchZone}
                      delayLongPress={150}
                      onPressIn={handlePressIn}
                      onLongPress={handleLongPress}
                      onPressOut={handlePressOut}
                      onPress={handleTapRight}
                    />
                  </View>
                )}

                {/* Progress Bar & Header Overlay */}
                <Animated.View
                  style={[styles.topOverlay, { opacity: overlayOpacity }]}
                  pointerEvents={hideOverlays ? 'none' : 'box-none'}
                >
                  {showProgressBar && items.length > 0 && (
                    <View style={styles.progressRow} pointerEvents="none">
                      {items.map((item, idx) => {
                        const segKey =
                          (item as StoryItemData).id != null
                            ? String((item as StoryItemData).id)
                            : String(idx);
                        return (
                          <ProgressSegment
                            key={segKey}
                            index={idx}
                            currentIndex={currentIdx}
                            isActiveStory={isActiveStory}
                            progress={progressAnim}
                            barColor={progressBarColor}
                            trackColor={progressTrackColor}
                          />
                        );
                      })}
                    </View>
                  )}

                  {renderHeader ? (
                    renderHeader({
                      story,
                      item: currentItem,
                      storyIndex,
                      itemIndex: currentIdx,
                      isActive: isActiveStory,
                      showUser,
                      showCloseButton,
                      mediaType,
                      close: closeWithAnimation,
                    })
                  ) : (
                    <View style={styles.defaultHeader} pointerEvents="box-none">
                      {showUser ? (
                        <View style={styles.defaultHeaderUser}>
                          {storyAvatarUri && (
                            <Image
                              source={{ uri: storyAvatarUri }}
                              style={styles.defaultHeaderAvatar}
                            />
                          )}
                          <Text style={styles.defaultHeaderTitle}>
                            {storyTitle ?? ''}
                          </Text>
                        </View>
                      ) : (
                        <View />
                      )}
                      {showCloseButton && onClose && (
                        <Pressable
                          testID="android-story-close-button"
                          accessibilityRole="button"
                          accessibilityLabel="Close story"
                          style={styles.closeButton}
                          hitSlop={12}
                          onPress={closeWithAnimation}
                        >
                          <Text style={styles.closeText}>✕</Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </Animated.View>

                {/* Optional Footer Overlay */}
                {renderFooter && itemRenderInfo && (
                  <Animated.View
                    style={[styles.bottomOverlay, { opacity: overlayOpacity }]}
                    pointerEvents={hideOverlays ? 'none' : 'box-none'}
                  >
                    {renderFooter(itemRenderInfo)}
                  </Animated.View>
                )}
              </View>
            );
          })}
        </AndroidStoryView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  sheet: {
    flex: 1,
  },
  pager: {
    flex: 1,
  },
  storyPage: {
    flex: 1,
    backgroundColor: '#111111',
    borderRadius: 12,
    overflow: 'hidden',
  },
  storyPageTransparent: {
    backgroundColor: 'transparent',
  },
  contentLayer: {
    flex: 1,
  },
  defaultImage: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  emptyContent: {
    flex: 1,
    backgroundColor: '#18181B',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  touchLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    flexDirection: 'row',
  },
  leftTouchZone: {
    flex: 1,
  },
  rightTouchZone: {
    flex: 1,
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    paddingTop: (StatusBar.currentHeight ?? 24) + 10,
    paddingHorizontal: 14,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 5,
  },
  progressTrack: {
    flex: 1,
    height: 3.5,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFillFull: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 2,
  },
  defaultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  defaultHeaderUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  defaultHeaderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  defaultHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  bottomOverlay: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
  },
});
