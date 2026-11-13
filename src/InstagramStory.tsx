import * as React from 'react';
import {
  Animated,
  Easing,
  Image,
  PanResponder,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeSyntheticEvent,
} from 'react-native';
import { InstagramStoryView } from './InstagramStoryView';
import { resolveImageUri } from './resolveImageUri';
import type {
  InstagramStoryProps,
  InstagramStoryViewRef,
  PageScrollState,
  PageScrollStateChangedEvent,
  PageSelectedEvent,
  StoryGroupData,
  StoryItemData,
} from './types';

const DEFAULT_DURATION = 10000;
const DEFAULT_SWIPE_THRESHOLD = 120;

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
  const [trackWidth, setTrackWidth] = React.useState(0);

  const isCompleted = index < currentIndex;
  const isCurrent = index === currentIndex && isActiveStory;

  const translateX = React.useMemo(
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

export function InstagramStory<
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
  renderItem,
  renderHeader,
  renderFooter,
  onStoryChange,
  onItemChange,
  onStoryItemSeen,
  onClose,
  onFinish,
}: InstagramStoryProps<TStory, TItem>) {
  const { height: windowHeight } = useWindowDimensions();

  const storyViewRef = React.useRef<InstagramStoryViewRef>(null);

  const clampedInitialStory = Math.max(
    0,
    Math.min(initialStoryIndex, Math.max(0, stories.length - 1))
  );

  const resolveItems = React.useCallback(
    (story: TStory): readonly TItem[] => {
      if (getItems) return getItems(story);
      const raw = (story as StoryGroupData<TItem>).items;
      return Array.isArray(raw) ? raw : [];
    },
    [getItems]
  );

  const buildInitialItemIndices = React.useCallback(
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

  const [activeStoryIndex, setActiveStoryIndex] =
    React.useState(clampedInitialStory);
  const [itemIndices, setItemIndices] = React.useState<Record<number, number>>(
    () => buildInitialItemIndices(clampedInitialStory)
  );
  const [scrollState, setScrollState] = React.useState<PageScrollState>('idle');
  const [isHolding, setIsHolding] = React.useState(false);
  const [isSwipingDown, setIsSwipingDown] = React.useState(false);
  const [replayTick, setReplayTick] = React.useState(0);

  const progressAnim = React.useRef(new Animated.Value(0)).current;
  const remainingRatioRef = React.useRef(1);
  const activeKeyRef = React.useRef('');
  const lastSeenKeyRef = React.useRef('');
  const wasLongPressRef = React.useRef(false);

  const translateY = React.useRef(new Animated.Value(0)).current;
  const scale = React.useRef(new Animated.Value(1)).current;
  const backdropOpacity = React.useRef(new Animated.Value(1)).current;
  const overlayOpacity = React.useRef(new Animated.Value(1)).current;

  const resolveItemDuration = React.useCallback(
    (item: TItem, story: TStory): number => {
      if (getItemDuration) return getItemDuration(item, story);
      const itemDuration = (item as StoryItemData).duration;
      return typeof itemDuration === 'number' && itemDuration > 0
        ? itemDuration
        : duration;
    },
    [duration, getItemDuration]
  );

  const resolveItemImage = React.useCallback(
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

  const resolveStoryKey = React.useCallback(
    (story: TStory, index: number): string => {
      if (keyExtractor) return keyExtractor(story, index);
      const rawId = (story as StoryGroupData).id;
      return rawId != null ? String(rawId) : String(index);
    },
    [keyExtractor]
  );

  // Reset state whenever visibility opens
  const prevVisibleRef = React.useRef(visible);
  React.useEffect(() => {
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
      progressAnim.setValue(0);
      remainingRatioRef.current = 1;
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

  const activeStory = stories[activeStoryIndex];
  const activeItems = React.useMemo(
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
    (pauseOnHold && isHolding) || isSwipingDown || scrollState !== 'idle';
  const hideOverlays = hideOverlaysOnHold && isHolding;

  React.useEffect(() => {
    Animated.timing(overlayOpacity, {
      toValue: hideOverlays ? 0 : 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [hideOverlays, overlayOpacity]);

  React.useEffect(() => {
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

  const closeWithAnimation = React.useCallback(() => {
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

  const finishOrClose = React.useCallback(() => {
    if (onFinish) {
      onFinish();
    } else {
      closeWithAnimation();
    }
  }, [closeWithAnimation, onFinish]);

  const goNext = React.useCallback(() => {
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

  const goPrev = React.useCallback(() => {
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

  const goNextRef = React.useRef(goNext);
  goNextRef.current = goNext;

  // Auto-next 10s timer
  const currentKey = `${activeStoryIndex}:${activeItemIndex}:${replayTick}`;
  const activeDuration =
    activeStory && activeItem
      ? resolveItemDuration(activeItem, activeStory)
      : duration;

  React.useEffect(() => {
    if (activeKeyRef.current !== currentKey) {
      activeKeyRef.current = currentKey;
      progressAnim.setValue(0);
      remainingRatioRef.current = 1;
    }

    if (!visible || !autoPlay || isPaused || !activeStory || !activeItem) {
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
    anim.start(({ finished }) => {
      if (finished && activeKeyRef.current === capturedKey) {
        remainingRatioRef.current = 0;
        goNextRef.current();
      }
    });

    return () => {
      anim.stop();
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
    isPaused,
    progressAnim,
    visible,
  ]);

  // Keep latest swipe config in refs for PanResponder
  const swipeConfigRef = React.useRef({
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

  const panResponder = React.useMemo(
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

  const handlePageSelected = React.useCallback(
    (event: NativeSyntheticEvent<PageSelectedEvent>) => {
      const nextIndex = event.nativeEvent.position;
      setActiveStoryIndex(nextIndex);
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

  const handlePageScrollStateChanged = React.useCallback(
    (event: NativeSyntheticEvent<PageScrollStateChangedEvent>) => {
      setScrollState(event.nativeEvent.pageScrollState);
    },
    []
  );

  const handlePressIn = React.useCallback(() => {
    wasLongPressRef.current = false;
  }, []);

  const handleLongPress = React.useCallback(() => {
    if (!pauseOnHold && !hideOverlaysOnHold) return;
    wasLongPressRef.current = true;
    setIsHolding(true);
  }, [hideOverlaysOnHold, pauseOnHold]);

  const handlePressOut = React.useCallback(() => {
    if (isHolding) {
      setIsHolding(false);
    }
  }, [isHolding]);

  const handleTapLeft = React.useCallback(() => {
    if (wasLongPressRef.current || !tapToNavigate) return;
    goPrev();
  }, [goPrev, tapToNavigate]);

  const handleTapRight = React.useCallback(() => {
    if (wasLongPressRef.current || !tapToNavigate) return;
    goNext();
  }, [goNext, tapToNavigate]);

  const nativeStoryData = React.useMemo(() => ({ stories }), [stories]);

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
        <InstagramStoryView
          ref={storyViewRef}
          style={styles.pager}
          storyData={nativeStoryData}
          initialPage={clampedInitialStory}
          perspective={perspective}
          cubeAngle={cubeAngle}
          overScrollMode="never"
          onPageSelected={handlePageSelected}
          onPageScrollStateChanged={handlePageScrollStateChanged}
        >
          {stories.map((story, storyIndex) => {
            const items = resolveItems(story);
            const rawIdx = itemIndices[storyIndex] ?? 0;
            const currentIdx = Math.max(
              0,
              Math.min(rawIdx, Math.max(0, items.length - 1))
            );
            const currentItem = items[currentIdx];
            const isActiveStory = storyIndex === activeStoryIndex;
            const fallbackImage = currentItem
              ? resolveItemImage(currentItem, story)
              : undefined;
            const storyTitle =
              typeof story.username === 'string'
                ? story.username
                : typeof story.name === 'string'
                  ? story.name
                  : undefined;
            const storyAvatarUri =
              resolveImageUri((story as StoryGroupData).avatarUri) ??
              resolveImageUri((story as StoryGroupData).userUri);

            return (
              <View
                key={resolveStoryKey(story, storyIndex)}
                style={styles.storyPage}
              >
                {/* Story Item Content */}
                <View style={styles.contentLayer}>
                  {currentItem ? (
                    renderItem ? (
                      renderItem({
                        item: currentItem,
                        story,
                        itemIndex: currentIdx,
                        storyIndex,
                        isActive: isActiveStory,
                        isPaused: isActiveStory && isPaused,
                        progress: progressAnim,
                      })
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
                      {onClose && (
                        <Pressable
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
                {renderFooter && currentItem && (
                  <Animated.View
                    style={[styles.bottomOverlay, { opacity: overlayOpacity }]}
                    pointerEvents={hideOverlays ? 'none' : 'box-none'}
                  >
                    {renderFooter({
                      item: currentItem,
                      story,
                      itemIndex: currentIdx,
                      storyIndex,
                      isActive: isActiveStory,
                      isPaused: isActiveStory && isPaused,
                      progress: progressAnim,
                    })}
                  </Animated.View>
                )}
              </View>
            );
          })}
        </InstagramStoryView>
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
    paddingTop:
      (Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 14) + 10,
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
