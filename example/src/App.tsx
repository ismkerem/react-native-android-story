import { useCallback, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  InstagramStory,
  resolveImageUri,
  resolveMediaUri,
  useStoryProgress,
  type StoryGroupData,
  type StoryItemData,
  type StoryVideoResizeMode,
} from 'react-native-android-story';

interface DemoStoryItem extends StoryItemData {
  id: string;
  caption: string;
}

interface DemoStoryUser extends StoryGroupData<DemoStoryItem> {
  id: string;
  username: string;
  avatarUri: string;
  items: DemoStoryItem[];
}

const IMAGE_LAKE =
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1080&q=80';
const IMAGE_OCEAN =
  'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1080&q=80';
const IMAGE_HILLS =
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1080&q=80';
const IMAGE_VALLEY =
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1080&q=80';

const VIDEO_BUTTERFLY =
  'https://flutter.github.io/assets-for-api-docs/assets/videos/butterfly.mp4';
const VIDEO_BEE =
  'https://flutter.github.io/assets-for-api-docs/assets/videos/bee.mp4';

const STORY_DATA: DemoStoryUser[] = [
  {
    id: 'user-1',
    username: 'alex.dev',
    avatarUri:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=80',
    items: [
      {
        id: '1-1',
        imageUri: IMAGE_LAKE,
        caption: 'Real Remote Image URI · Mountain Lake',
      },
      {
        id: '1-2',
        type: 'video',
        videoUri: VIDEO_BUTTERFLY,
        posterUri: IMAGE_OCEAN,
        caption: 'Real Remote MP4 Video · Butterfly (Native MediaPlayer)',
      },
      {
        id: '1-3',
        imageUri: IMAGE_OCEAN,
        caption: 'Real Remote Image URI · Ocean Waves',
      },
    ],
  },
  {
    id: 'user-2',
    username: 'sarah.ui',
    avatarUri:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80',
    items: [
      {
        id: '2-1',
        videoUri: VIDEO_BEE,
        posterUri: IMAGE_HILLS,
        caption: 'Auto-Detected MP4 Video · Honeybee (Native MediaPlayer)',
      },
      {
        id: '2-2',
        imageUri: IMAGE_HILLS,
        caption: 'Real Remote Image URI · Misty Hills',
      },
    ],
  },
  {
    id: 'user-3',
    username: 'kerem.rn',
    avatarUri:
      'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=300&q=80',
    items: [
      {
        id: '3-1',
        imageUri: IMAGE_VALLEY,
        caption: 'Real Remote Image URI · Valley Sunrise',
      },
    ],
  },
];

const STATUS_BAR_PADDING = StatusBar.currentHeight ?? 24;

const DURATION_OPTIONS = [3000, 5000, 10000] as const;
const SWIPE_THRESHOLD_OPTIONS = [60, 120, 220] as const;
const RESIZE_MODE_OPTIONS: readonly StoryVideoResizeMode[] = [
  'cover',
  'contain',
  'stretch',
];
const BAR_COLOR_OPTIONS = ['#FFFFFF', '#38BDF8', '#F43F5E', '#22C55E'] as const;
const TRACK_COLOR_OPTIONS = [
  { label: 'white32', value: 'rgba(255, 255, 255, 0.32)' },
  { label: 'white65', value: 'rgba(255, 255, 255, 0.65)' },
  { label: 'dark45', value: 'rgba(0, 0, 0, 0.45)' },
] as const;
const BACKDROP_COLOR_OPTIONS = ['#000000', '#0F172A', '#312E81'] as const;
const PERSPECTIVE_OPTIONS = [2.5, 4.5, 8.0] as const;
const CUBE_ANGLE_OPTIONS = [45, 60, 90] as const;

interface PropButtonProps {
  label: string;
  value: string;
  active?: boolean;
  onPress: () => void;
  testID?: string;
}

function PropButton({
  label,
  value,
  active = false,
  onPress,
  testID,
}: PropButtonProps) {
  return (
    <Pressable
      testID={testID}
      style={[styles.propButton, active && styles.propButtonActive]}
      onPress={onPress}
    >
      <Text style={[styles.propLabel, active && styles.propLabelActive]}>
        {label}:{' '}
      </Text>
      <Text style={[styles.propValue, active && styles.propValueActive]}>
        {value}
      </Text>
    </Pressable>
  );
}

export default function App() {
  const {
    orderedStories,
    isOpen,
    initialStoryIndex: progressStoryIndex,
    openStory,
    closeStory,
    isStoryWatched,
    getInitialItemIndex: progressGetInitialItemIndex,
    markItemSeen,
    resetProgress,
  } = useStoryProgress<DemoStoryUser, DemoStoryItem>({
    stories: STORY_DATA,
  });

  // Visibility & initial index optional props
  const [visibleProp, setVisibleProp] = useState(true);
  const [customStoryIndex, setCustomStoryIndex] = useState(0);
  const [customItemIndex, setCustomItemIndex] = useState(0);
  const [useResumeResolver, setUseResumeResolver] = useState(true);

  // Playback & gesture optional props
  const [durationIdx, setDurationIdx] = useState(1); // 5000ms
  const [autoPlay, setAutoPlay] = useState(true);
  const [swipeToClose, setSwipeToClose] = useState(true);
  const [swipeThresholdIdx, setSwipeThresholdIdx] = useState(1); // 120px
  const [tapToNavigate, setTapToNavigate] = useState(true);
  const [pauseOnHold, setPauseOnHold] = useState(true);
  const [hideOverlaysOnHold, setHideOverlaysOnHold] = useState(true);

  // UI visibility & styling optional props
  const [showProgressBar, setShowProgressBar] = useState(true);
  const [showUser, setShowUser] = useState(true);
  const [showCloseButton, setShowCloseButton] = useState(true);
  const [showLoadingIndicator, setShowLoadingIndicator] = useState(true);
  const [barColorIdx, setBarColorIdx] = useState(0);
  const [trackColorIdx, setTrackColorIdx] = useState(0);
  const [backdropColorIdx, setBackdropColorIdx] = useState(0);
  const [useCustomStyle, setUseCustomStyle] = useState(false);

  // Video optional props
  const [muted, setMuted] = useState(false);
  const [resizeModeIdx, setResizeModeIdx] = useState(0);
  const [repeatVideo, setRepeatVideo] = useState(false);

  // 3D cube optional props
  const [perspectiveIdx, setPerspectiveIdx] = useState(1); // 4.5
  const [cubeAngleIdx, setCubeAngleIdx] = useState(2); // 90

  // Data extractor optional props
  const [enableKeyExtractor, setEnableKeyExtractor] = useState(true);
  const [enableGetItems, setEnableGetItems] = useState(true);
  const [enableGetItemDuration, setEnableGetItemDuration] = useState(false);
  const [enableGetItemImage, setEnableGetItemImage] = useState(false);
  const [enableGetItemType, setEnableGetItemType] = useState(false);
  const [enableGetItemVideo, setEnableGetItemVideo] = useState(false);
  const [enableGetItemPoster, setEnableGetItemPoster] = useState(false);

  // Custom renderer optional props
  const [enableRenderItem, setEnableRenderItem] = useState(false);
  const [enableRenderVideo, setEnableRenderVideo] = useState(false);
  const [enableRenderHeader, setEnableRenderHeader] = useState(false);
  const [enableRenderFooter, setEnableRenderFooter] = useState(true);

  // Callback optional props
  const [enableOnStoryChange, setEnableOnStoryChange] = useState(true);
  const [enableOnItemChange, setEnableOnItemChange] = useState(true);
  const [enableOnStoryItemSeen, setEnableOnStoryItemSeen] = useState(true);
  const [enableOnVideoLoad, setEnableOnVideoLoad] = useState(true);
  const [enableOnVideoEnd, setEnableOnVideoEnd] = useState(true);
  const [enableOnVideoError, setEnableOnVideoError] = useState(true);
  const [enableOnClose, setEnableOnClose] = useState(true);
  const [enableOnFinish, setEnableOnFinish] = useState(true);

  const [manualOpen, setManualOpen] = useState(false);
  const [statusLog, setStatusLog] = useState(
    'Tap any prop button below to update it, then tap an avatar or Open Story.'
  );

  const logEvent = useCallback((message: string) => {
    console.log('[StoryTest]', message);
    setStatusLog(message);
  }, []);

  const resetAllProps = useCallback(() => {
    setVisibleProp(true);
    setCustomStoryIndex(0);
    setCustomItemIndex(0);
    setUseResumeResolver(true);
    setDurationIdx(1);
    setAutoPlay(true);
    setSwipeToClose(true);
    setSwipeThresholdIdx(1);
    setTapToNavigate(true);
    setPauseOnHold(true);
    setHideOverlaysOnHold(true);
    setShowProgressBar(true);
    setShowUser(true);
    setShowCloseButton(true);
    setShowLoadingIndicator(true);
    setBarColorIdx(0);
    setTrackColorIdx(0);
    setBackdropColorIdx(0);
    setUseCustomStyle(false);
    setMuted(false);
    setResizeModeIdx(0);
    setRepeatVideo(false);
    setPerspectiveIdx(1);
    setCubeAngleIdx(2);
    setEnableKeyExtractor(true);
    setEnableGetItems(true);
    setEnableGetItemDuration(false);
    setEnableGetItemImage(false);
    setEnableGetItemType(false);
    setEnableGetItemVideo(false);
    setEnableGetItemPoster(false);
    setEnableRenderItem(false);
    setEnableRenderVideo(false);
    setEnableRenderHeader(false);
    setEnableRenderFooter(true);
    setEnableOnStoryChange(true);
    setEnableOnItemChange(true);
    setEnableOnStoryItemSeen(true);
    setEnableOnVideoLoad(true);
    setEnableOnVideoEnd(true);
    setEnableOnVideoError(true);
    setEnableOnClose(true);
    setEnableOnFinish(true);
    logEvent('Reset all optional props to defaults');
  }, [logEvent]);

  const handleCloseViewer = useCallback(() => {
    setManualOpen(false);
    closeStory();
  }, [closeStory]);

  const duration = DURATION_OPTIONS[durationIdx] ?? 5000;
  const swipeToCloseThreshold =
    SWIPE_THRESHOLD_OPTIONS[swipeThresholdIdx] ?? 120;
  const videoResizeMode = RESIZE_MODE_OPTIONS[resizeModeIdx] ?? 'cover';
  const progressBarColor = BAR_COLOR_OPTIONS[barColorIdx] ?? '#FFFFFF';
  const progressTrack = TRACK_COLOR_OPTIONS[trackColorIdx] ?? {
    label: 'white32',
    value: 'rgba(255, 255, 255, 0.32)',
  };
  const backdropColor = BACKDROP_COLOR_OPTIONS[backdropColorIdx] ?? '#000000';
  const perspective = PERSPECTIVE_OPTIONS[perspectiveIdx] ?? 4.5;
  const cubeAngle = CUBE_ANGLE_OPTIONS[cubeAngleIdx] ?? 90;

  const isViewerMounted = isOpen || manualOpen;
  const activeInitialStoryIndex = manualOpen
    ? Math.min(customStoryIndex, Math.max(0, orderedStories.length - 1))
    : progressStoryIndex;

  return (
    <View style={styles.root}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={
          isViewerMounted && visibleProp ? 'light-content' : 'dark-content'
        }
      />

      <View style={styles.feedContainer}>
        <Text style={styles.appTitle}>Instagram Story Demo (Android)</Text>

        <ScrollView
          horizontal
          style={styles.avatarScroll}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.avatarList}
        >
          {orderedStories.map((user, index) => {
            const watched = isStoryWatched(user);
            const avatar = resolveImageUri(user.avatarUri);
            return (
              <Pressable
                key={user.id}
                testID={`story-avatar-${user.id}`}
                style={styles.avatarItem}
                onPress={() => {
                  setManualOpen(false);
                  logEvent(`Opened ${user.username} at index ${index}`);
                  openStory(index);
                }}
              >
                <View
                  style={[
                    styles.avatarRing,
                    watched
                      ? styles.avatarRingWatched
                      : styles.avatarRingActive,
                  ]}
                >
                  {avatar ? (
                    <Image
                      source={{ uri: avatar }}
                      style={styles.avatarCircle}
                    />
                  ) : (
                    <View style={styles.avatarCircle} />
                  )}
                </View>
                <Text
                  style={[
                    styles.avatarLabel,
                    watched && styles.avatarLabelWatched,
                  ]}
                  numberOfLines={1}
                >
                  {user.username}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView
          style={styles.controlsScroll}
          contentContainerStyle={styles.controlsContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.statusBanner}>
            <Text style={styles.statusLabel}>Last Event</Text>
            <Text style={styles.statusText}>{statusLog}</Text>
            <View style={styles.primaryActionsRow}>
              <Pressable
                testID="open-story-with-props"
                style={styles.primaryButton}
                onPress={() => {
                  setManualOpen(true);
                  logEvent(
                    `Opened story[${activeInitialStoryIndex}] item[${customItemIndex}] (visible=${visibleProp})`
                  );
                }}
              >
                <Text style={styles.primaryButtonText}>
                  Open Story With Current Props
                </Text>
              </Pressable>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => {
                  resetProgress();
                  logEvent('Reset watched story progress');
                }}
              >
                <Text style={styles.secondaryButtonText}>Reset Progress</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={resetAllProps}>
                <Text style={styles.secondaryButtonText}>Reset Props</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Visibility & Initial Index</Text>
            <View style={styles.propGrid}>
              <PropButton
                testID="prop-visible"
                label="visible"
                value={String(visibleProp)}
                active={visibleProp}
                onPress={() => setVisibleProp((p) => !p)}
              />
              <PropButton
                testID="prop-initialStoryIndex"
                label="initialStoryIndex"
                value={String(customStoryIndex)}
                active={customStoryIndex !== 0}
                onPress={() =>
                  setCustomStoryIndex((i) => (i + 1) % STORY_DATA.length)
                }
              />
              <PropButton
                testID="prop-initialItemIndex"
                label="initialItemIndex"
                value={String(customItemIndex)}
                active={customItemIndex !== 0}
                onPress={() => setCustomItemIndex((i) => (i + 1) % 3)}
              />
              <PropButton
                testID="prop-getInitialItemIndex"
                label="getInitialItemIndex"
                value={useResumeResolver ? 'resume' : 'off'}
                active={useResumeResolver}
                onPress={() => setUseResumeResolver((p) => !p)}
              />
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Playback & Gestures</Text>
            <View style={styles.propGrid}>
              <PropButton
                testID="prop-duration"
                label="duration"
                value={`${duration}ms`}
                active={duration !== 10000}
                onPress={() =>
                  setDurationIdx((i) => (i + 1) % DURATION_OPTIONS.length)
                }
              />
              <PropButton
                testID="prop-autoPlay"
                label="autoPlay"
                value={String(autoPlay)}
                active={autoPlay}
                onPress={() => setAutoPlay((p) => !p)}
              />
              <PropButton
                testID="prop-swipeToClose"
                label="swipeToClose"
                value={String(swipeToClose)}
                active={swipeToClose}
                onPress={() => setSwipeToClose((p) => !p)}
              />
              <PropButton
                testID="prop-swipeToCloseThreshold"
                label="swipeToCloseThreshold"
                value={`${swipeToCloseThreshold}px`}
                active={swipeToCloseThreshold !== 120}
                onPress={() =>
                  setSwipeThresholdIdx(
                    (i) => (i + 1) % SWIPE_THRESHOLD_OPTIONS.length
                  )
                }
              />
              <PropButton
                testID="prop-tapToNavigate"
                label="tapToNavigate"
                value={String(tapToNavigate)}
                active={tapToNavigate}
                onPress={() => setTapToNavigate((p) => !p)}
              />
              <PropButton
                testID="prop-pauseOnHold"
                label="pauseOnHold"
                value={String(pauseOnHold)}
                active={pauseOnHold}
                onPress={() => setPauseOnHold((p) => !p)}
              />
              <PropButton
                testID="prop-hideOverlaysOnHold"
                label="hideOverlaysOnHold"
                value={String(hideOverlaysOnHold)}
                active={hideOverlaysOnHold}
                onPress={() => setHideOverlaysOnHold((p) => !p)}
              />
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>UI, Colors & Style</Text>
            <View style={styles.propGrid}>
              <PropButton
                testID="prop-showProgressBar"
                label="showProgressBar"
                value={String(showProgressBar)}
                active={showProgressBar}
                onPress={() => setShowProgressBar((p) => !p)}
              />
              <PropButton
                testID="prop-showUser"
                label="showUser"
                value={String(showUser)}
                active={showUser}
                onPress={() => setShowUser((p) => !p)}
              />
              <PropButton
                testID="prop-showCloseButton"
                label="showCloseButton"
                value={String(showCloseButton)}
                active={showCloseButton}
                onPress={() => setShowCloseButton((p) => !p)}
              />
              <PropButton
                testID="prop-showLoadingIndicator"
                label="showLoadingIndicator"
                value={String(showLoadingIndicator)}
                active={showLoadingIndicator}
                onPress={() => setShowLoadingIndicator((p) => !p)}
              />
              <PropButton
                testID="prop-progressBarColor"
                label="progressBarColor"
                value={progressBarColor}
                active={barColorIdx !== 0}
                onPress={() =>
                  setBarColorIdx((i) => (i + 1) % BAR_COLOR_OPTIONS.length)
                }
              />
              <PropButton
                testID="prop-progressTrackColor"
                label="progressTrackColor"
                value={progressTrack.label}
                active={trackColorIdx !== 0}
                onPress={() =>
                  setTrackColorIdx((i) => (i + 1) % TRACK_COLOR_OPTIONS.length)
                }
              />
              <PropButton
                testID="prop-backdropColor"
                label="backdropColor"
                value={backdropColor}
                active={backdropColorIdx !== 0}
                onPress={() =>
                  setBackdropColorIdx(
                    (i) => (i + 1) % BACKDROP_COLOR_OPTIONS.length
                  )
                }
              />
              <PropButton
                testID="prop-style"
                label="style"
                value={useCustomStyle ? 'insetCard' : 'default'}
                active={useCustomStyle}
                onPress={() => setUseCustomStyle((p) => !p)}
              />
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Video & 3D Cube</Text>
            <View style={styles.propGrid}>
              <PropButton
                testID="prop-muted"
                label="muted"
                value={String(muted)}
                active={muted}
                onPress={() => setMuted((p) => !p)}
              />
              <PropButton
                testID="prop-videoResizeMode"
                label="videoResizeMode"
                value={videoResizeMode}
                active={resizeModeIdx !== 0}
                onPress={() =>
                  setResizeModeIdx((i) => (i + 1) % RESIZE_MODE_OPTIONS.length)
                }
              />
              <PropButton
                testID="prop-repeatVideo"
                label="repeatVideo"
                value={String(repeatVideo)}
                active={repeatVideo}
                onPress={() => setRepeatVideo((p) => !p)}
              />
              <PropButton
                testID="prop-perspective"
                label="perspective"
                value={String(perspective)}
                active={perspectiveIdx !== 1}
                onPress={() =>
                  setPerspectiveIdx((i) => (i + 1) % PERSPECTIVE_OPTIONS.length)
                }
              />
              <PropButton
                testID="prop-cubeAngle"
                label="cubeAngle"
                value={`${cubeAngle}°`}
                active={cubeAngleIdx !== 2}
                onPress={() =>
                  setCubeAngleIdx((i) => (i + 1) % CUBE_ANGLE_OPTIONS.length)
                }
              />
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Data Resolvers</Text>
            <View style={styles.propGrid}>
              <PropButton
                label="keyExtractor"
                value={enableKeyExtractor ? 'custom' : 'default'}
                active={enableKeyExtractor}
                onPress={() => setEnableKeyExtractor((p) => !p)}
              />
              <PropButton
                label="getItems"
                value={enableGetItems ? 'custom' : 'default'}
                active={enableGetItems}
                onPress={() => setEnableGetItems((p) => !p)}
              />
              <PropButton
                label="getItemDuration"
                value={enableGetItemDuration ? '2500ms' : 'off'}
                active={enableGetItemDuration}
                onPress={() => setEnableGetItemDuration((p) => !p)}
              />
              <PropButton
                label="getItemImage"
                value={enableGetItemImage ? 'custom' : 'off'}
                active={enableGetItemImage}
                onPress={() => setEnableGetItemImage((p) => !p)}
              />
              <PropButton
                label="getItemType"
                value={enableGetItemType ? 'custom' : 'off'}
                active={enableGetItemType}
                onPress={() => setEnableGetItemType((p) => !p)}
              />
              <PropButton
                label="getItemVideo"
                value={enableGetItemVideo ? 'custom' : 'off'}
                active={enableGetItemVideo}
                onPress={() => setEnableGetItemVideo((p) => !p)}
              />
              <PropButton
                label="getItemPoster"
                value={enableGetItemPoster ? 'custom' : 'off'}
                active={enableGetItemPoster}
                onPress={() => setEnableGetItemPoster((p) => !p)}
              />
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Custom Renderers</Text>
            <View style={styles.propGrid}>
              <PropButton
                label="renderItem"
                value={enableRenderItem ? 'custom' : 'default'}
                active={enableRenderItem}
                onPress={() => setEnableRenderItem((p) => !p)}
              />
              <PropButton
                label="renderVideo"
                value={enableRenderVideo ? 'custom' : 'default'}
                active={enableRenderVideo}
                onPress={() => setEnableRenderVideo((p) => !p)}
              />
              <PropButton
                label="renderHeader"
                value={enableRenderHeader ? 'custom' : 'default'}
                active={enableRenderHeader}
                onPress={() => setEnableRenderHeader((p) => !p)}
              />
              <PropButton
                label="renderFooter"
                value={enableRenderFooter ? 'caption' : 'off'}
                active={enableRenderFooter}
                onPress={() => setEnableRenderFooter((p) => !p)}
              />
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Callbacks (Live Log)</Text>
            <View style={styles.propGrid}>
              <PropButton
                label="onStoryChange"
                value={enableOnStoryChange ? 'on' : 'off'}
                active={enableOnStoryChange}
                onPress={() => setEnableOnStoryChange((p) => !p)}
              />
              <PropButton
                label="onItemChange"
                value={enableOnItemChange ? 'on' : 'off'}
                active={enableOnItemChange}
                onPress={() => setEnableOnItemChange((p) => !p)}
              />
              <PropButton
                label="onStoryItemSeen"
                value={enableOnStoryItemSeen ? 'on' : 'off'}
                active={enableOnStoryItemSeen}
                onPress={() => setEnableOnStoryItemSeen((p) => !p)}
              />
              <PropButton
                label="onVideoLoad"
                value={enableOnVideoLoad ? 'on' : 'off'}
                active={enableOnVideoLoad}
                onPress={() => setEnableOnVideoLoad((p) => !p)}
              />
              <PropButton
                label="onVideoEnd"
                value={enableOnVideoEnd ? 'on' : 'off'}
                active={enableOnVideoEnd}
                onPress={() => setEnableOnVideoEnd((p) => !p)}
              />
              <PropButton
                label="onVideoError"
                value={enableOnVideoError ? 'on' : 'off'}
                active={enableOnVideoError}
                onPress={() => setEnableOnVideoError((p) => !p)}
              />
              <PropButton
                label="onClose"
                value={enableOnClose ? 'on' : 'off'}
                active={enableOnClose}
                onPress={() => setEnableOnClose((p) => !p)}
              />
              <PropButton
                label="onFinish"
                value={enableOnFinish ? 'on' : 'off'}
                active={enableOnFinish}
                onPress={() => setEnableOnFinish((p) => !p)}
              />
            </View>
          </View>
        </ScrollView>
      </View>

      {isViewerMounted && (
        <View
          style={[
            styles.modalOverlay,
            !visibleProp && styles.modalOverlayHidden,
          ]}
          pointerEvents={visibleProp ? 'auto' : 'none'}
        >
          <InstagramStory<DemoStoryUser, DemoStoryItem>
            stories={orderedStories}
            visible={visibleProp}
            initialStoryIndex={activeInitialStoryIndex}
            initialItemIndex={customItemIndex}
            getInitialItemIndex={
              useResumeResolver && !manualOpen
                ? progressGetInitialItemIndex
                : undefined
            }
            duration={duration}
            autoPlay={autoPlay}
            swipeToClose={swipeToClose}
            swipeToCloseThreshold={swipeToCloseThreshold}
            tapToNavigate={tapToNavigate}
            pauseOnHold={pauseOnHold}
            hideOverlaysOnHold={hideOverlaysOnHold}
            showProgressBar={showProgressBar}
            showUser={showUser}
            showCloseButton={showCloseButton}
            showLoadingIndicator={showLoadingIndicator}
            muted={muted}
            videoResizeMode={videoResizeMode}
            repeatVideo={repeatVideo}
            progressBarColor={progressBarColor}
            progressTrackColor={progressTrack.value}
            backdropColor={backdropColor}
            perspective={perspective}
            cubeAngle={cubeAngle}
            style={useCustomStyle ? styles.customStoryStyle : undefined}
            keyExtractor={
              enableKeyExtractor ? (story) => `story-${story.id}` : undefined
            }
            getItems={enableGetItems ? (story) => story.items : undefined}
            getItemDuration={enableGetItemDuration ? () => 2500 : undefined}
            getItemImage={
              enableGetItemImage
                ? (item) => resolveMediaUri(item.imageUri)
                : undefined
            }
            getItemType={
              enableGetItemType
                ? (item) => (item.videoUri ? 'video' : 'image')
                : undefined
            }
            getItemVideo={
              enableGetItemVideo
                ? (item) => resolveMediaUri(item.videoUri)
                : undefined
            }
            getItemPoster={
              enableGetItemPoster
                ? (item) => resolveMediaUri(item.posterUri)
                : undefined
            }
            renderItem={
              enableRenderItem
                ? ({ item, story, mediaType }) => (
                    <View style={styles.customRenderedItem}>
                      <Text style={styles.customRenderedBadge}>
                        renderItem ({mediaType.toUpperCase()})
                      </Text>
                      <Text style={styles.customRenderedUser}>
                        @{story.username}
                      </Text>
                      <Text style={styles.customRenderedCaption}>
                        {item.caption}
                      </Text>
                    </View>
                  )
                : undefined
            }
            renderVideo={
              enableRenderVideo
                ? ({ story, videoUri, item }) => (
                    <View style={styles.customRenderedItem}>
                      <Text style={styles.customRenderedBadge}>
                        renderVideo custom slot
                      </Text>
                      <Text style={styles.customRenderedUser}>
                        @{story.username}
                      </Text>
                      <Text style={styles.customRenderedCaption}>
                        {item.caption}
                      </Text>
                      <Text style={styles.customRenderedUri} numberOfLines={2}>
                        {videoUri}
                      </Text>
                    </View>
                  )
                : undefined
            }
            renderHeader={
              enableRenderHeader
                ? ({ story, itemIndex, mediaType, close }) => (
                    <View style={styles.customHeader}>
                      <Text style={styles.customHeaderText}>
                        @{story.username} · #{itemIndex + 1} ·{' '}
                        {mediaType.toUpperCase()}
                      </Text>
                      {showCloseButton && (
                        <Pressable
                          style={styles.customHeaderClose}
                          onPress={close}
                        >
                          <Text style={styles.customHeaderCloseText}>
                            Close
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  )
                : undefined
            }
            renderFooter={
              enableRenderFooter
                ? ({ item, mediaType }) => (
                    <View style={styles.footerCard} pointerEvents="none">
                      <View style={styles.mediaBadge}>
                        <Text style={styles.mediaBadgeText}>
                          {mediaType.toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.footerCaption}>{item.caption}</Text>
                    </View>
                  )
                : undefined
            }
            onStoryChange={
              enableOnStoryChange
                ? (storyIndex, story) => {
                    logEvent(
                      `onStoryChange -> #${storyIndex} (${story.username})`
                    );
                  }
                : undefined
            }
            onItemChange={
              enableOnItemChange
                ? (itemIndex, _item, storyIndex, story) => {
                    logEvent(
                      `onItemChange -> ${story.username} [${storyIndex}:${itemIndex}]`
                    );
                  }
                : undefined
            }
            onStoryItemSeen={
              enableOnStoryItemSeen
                ? (info) => {
                    markItemSeen(info);
                    logEvent(
                      `Seen ${info.story.username} item ${info.itemIndex + 1}/${info.story.items.length}`
                    );
                  }
                : undefined
            }
            onVideoLoad={
              enableOnVideoLoad
                ? ({ duration: loadedMs, width, height, itemIndex, story }) => {
                    logEvent(
                      `VideoLoaded ${story.username} #${itemIndex + 1}: ${Math.round(loadedMs)}ms (${width}x${height})`
                    );
                  }
                : undefined
            }
            onVideoEnd={
              enableOnVideoEnd
                ? ({ story, itemIndex }) => {
                    logEvent(`VideoEnded ${story.username} #${itemIndex + 1}`);
                  }
                : undefined
            }
            onVideoError={
              enableOnVideoError
                ? ({ error, story, itemIndex }) => {
                    logEvent(
                      `VideoError ${story.username} #${itemIndex + 1}: ${JSON.stringify(error)}`
                    );
                  }
                : undefined
            }
            onClose={enableOnClose ? handleCloseViewer : undefined}
            onFinish={
              enableOnFinish
                ? () => {
                    logEvent('onFinish reached end of last story');
                    handleCloseViewer();
                  }
                : undefined
            }
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#EEF2FF',
  },
  feedContainer: {
    flex: 1,
    paddingTop: STATUS_BAR_PADDING + 12,
  },
  appTitle: {
    color: '#1E1B4B',
    fontSize: 21,
    fontWeight: '800',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  avatarScroll: {
    flexGrow: 0,
  },
  avatarList: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 14,
  },
  avatarItem: {
    alignItems: 'center',
    width: 76,
  },
  avatarRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    padding: 3,
    borderWidth: 2.5,
    marginBottom: 5,
  },
  avatarRingActive: {
    borderColor: '#E1306C',
  },
  avatarRingWatched: {
    borderColor: '#9CA3AF',
  },
  avatarCircle: {
    flex: 1,
    borderRadius: 30,
    backgroundColor: '#CBD5E1',
  },
  avatarLabel: {
    color: '#1E293B',
    fontSize: 12,
    fontWeight: '600',
  },
  avatarLabelWatched: {
    color: '#9CA3AF',
  },
  controlsScroll: {
    flex: 1,
  },
  controlsContent: {
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 32,
    gap: 10,
  },
  statusBanner: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  statusLabel: {
    color: '#4F46E5',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  statusText: {
    color: '#1E293B',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
    marginBottom: 10,
  },
  primaryActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  primaryButton: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#4F46E5',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#E0E7FF',
  },
  secondaryButtonText: {
    color: '#3730A3',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionCard: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    color: '#1E1B4B',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },
  propGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  propButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 9,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  propButtonActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  propLabel: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
  },
  propLabelActive: {
    color: '#312E81',
  },
  propValue: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '800',
  },
  propValueActive: {
    color: '#4F46E5',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#000000',
  },
  modalOverlayHidden: {
    opacity: 0,
  },
  customStoryStyle: {
    margin: 14,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#818CF8',
  },
  customRenderedItem: {
    flex: 1,
    backgroundColor: '#1E1B4B',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  customRenderedBadge: {
    color: '#A5B4FC',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  customRenderedUser: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  customRenderedCaption: {
    color: '#E0E7FF',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 10,
  },
  customRenderedUri: {
    color: '#94A3B8',
    fontSize: 11,
    textAlign: 'center',
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(30, 27, 75, 0.72)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  customHeaderText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  customHeaderClose: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#EF4444',
  },
  customHeaderCloseText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  footerCard: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    paddingTop: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  mediaBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    marginBottom: 6,
  },
  mediaBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  footerCaption: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
