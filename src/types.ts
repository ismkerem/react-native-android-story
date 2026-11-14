import type { ReactNode } from 'react';
import type {
  Animated,
  NativeSyntheticEvent,
  StyleProp,
  ViewProps,
  ViewStyle,
} from 'react-native';

export type PageSelectedEvent = Readonly<{
  position: number;
}>;

export type PageScrollEvent = Readonly<{
  position: number;
  offset: number;
}>;

export type PageScrollState = 'idle' | 'dragging' | 'settling';

export type PageScrollStateChangedEvent = Readonly<{
  pageScrollState: PageScrollState;
}>;

export type OverScrollMode = 'auto' | 'always' | 'never';

export type StoryMediaType = 'image' | 'video';

export type StoryVideoResizeMode = 'cover' | 'contain' | 'stretch';

export type StoryMediaSource = string | number | Readonly<{ uri: string }>;

export type StoryImageSource = StoryMediaSource;

export type StoryViewVideoLoadEvent = Readonly<{
  position: number;
  duration: number;
  width: number;
  height: number;
}>;

export type StoryViewVideoProgressEvent = Readonly<{
  position: number;
  currentTime: number;
  duration: number;
}>;

export type StoryViewVideoBufferEvent = Readonly<{
  position: number;
  isBuffering: boolean;
}>;

export type StoryViewVideoEndEvent = Readonly<{
  position: number;
  finished: boolean;
}>;

export type StoryViewVideoErrorEvent = Readonly<{
  position: number;
  message: string;
}>;

export interface StoryPageMediaConfig {
  enabled?: boolean;
  mediaType?: StoryMediaType;
  uri?: StoryMediaSource;
  posterUri?: StoryImageSource;
  muted?: boolean;
}

export interface InstagramStoryViewRef {
  setPage: (selectedPage: number) => void;
  setPageWithoutAnimation: (selectedPage: number) => void;
  seekVideo: (position: number, positionMs: number) => void;
}

export interface InstagramStoryViewProps extends ViewProps {
  /**
   * Flexible story data object (or array of story objects) passed directly to the native view.
   * Supports custom backend JSON structures containing fundamental properties like `avatarUri`, `userUri`, and `imageUri`.
   */
  storyData?: Record<string, unknown> | readonly Record<string, unknown>[];
  /**
   * Per-page media configuration (image or video) for each page index.
   * Useful when rendering pages inside the unified `InstagramStoryView` component.
   */
  pageMedia?: readonly StoryPageMediaConfig[];
  /**
   * Explicit media type ('image' | 'video') when rendering standalone media directly in `InstagramStoryView`.
   */
  mediaType?: StoryMediaType;
  /**
   * Unified standalone media source (image or video URI, `{ uri }`, or local `require(...)` asset).
   */
  source?: StoryMediaSource;
  /**
   * Explicit standalone image source when rendering an image directly in `InstagramStoryView`.
   */
  imageUri?: StoryImageSource;
  /**
   * Explicit standalone video source when rendering a video directly in `InstagramStoryView`.
   */
  videoUri?: StoryMediaSource;
  /**
   * Optional poster/thumbnail image displayed before video playback becomes ready.
   */
  posterUri?: StoryImageSource;
  /**
   * Pause active video playback (default: false).
   */
  paused?: boolean;
  /**
   * Mute video audio (default: false).
   */
  muted?: boolean;
  /**
   * Loop video playback when finished (default: false).
   */
  repeat?: boolean;
  /**
   * Resize mode for built-in video and standalone image rendering (default: 'cover').
   */
  videoResizeMode?: StoryVideoResizeMode;
  /**
   * Initial story page index when mounted (default: 0).
   */
  initialPage?: number;
  /**
   * Enable or disable horizontal user swiping (default: true).
   */
  scrollEnabled?: boolean;
  /**
   * Number of pages to keep mounted offscreen on either side (default: 1).
   */
  offscreenPageLimit?: number;
  /**
   * Camera distance multiplier relative to view width for 3D cube perspective (default: 4.5).
   */
  perspective?: number;
  /**
   * Maximum Y-axis rotation angle in degrees at full page offset (default: 90).
   */
  cubeAngle?: number;
  /**
   * Edge overscroll glow behavior on Android (default: 'never').
   */
  overScrollMode?: OverScrollMode;
  /**
   * Called when a story page becomes selected.
   */
  onPageSelected?: (event: NativeSyntheticEvent<PageSelectedEvent>) => void;
  /**
   * Called continuously while scrolling/animating between story pages.
   */
  onPageScroll?: (event: NativeSyntheticEvent<PageScrollEvent>) => void;
  /**
   * Called when the scroll state changes ('idle' | 'dragging' | 'settling').
   */
  onPageScrollStateChanged?: (
    event: NativeSyntheticEvent<PageScrollStateChangedEvent>
  ) => void;
  /**
   * Called when a video inside a page finishes loading its metadata.
   */
  onVideoLoad?: (event: NativeSyntheticEvent<StoryViewVideoLoadEvent>) => void;
  /**
   * Called periodically while a video plays inside a page.
   */
  onVideoProgress?: (
    event: NativeSyntheticEvent<StoryViewVideoProgressEvent>
  ) => void;
  /**
   * Called when video buffering state changes for a page.
   */
  onVideoBuffer?: (
    event: NativeSyntheticEvent<StoryViewVideoBufferEvent>
  ) => void;
  /**
   * Called when a video finishes playing inside a page.
   */
  onVideoEnd?: (event: NativeSyntheticEvent<StoryViewVideoEndEvent>) => void;
  /**
   * Called when video loading or playback fails for a page.
   */
  onVideoError?: (
    event: NativeSyntheticEvent<StoryViewVideoErrorEvent>
  ) => void;
}

/**
 * Default flexible item object. Developers can pass any custom object shape.
 */
export interface StoryItemData {
  id?: string | number;
  type?: StoryMediaType | string;
  mediaType?: StoryMediaType | string;
  imageUri?: StoryImageSource;
  image?: StoryImageSource;
  videoUri?: StoryMediaSource;
  video?: StoryMediaSource;
  posterUri?: StoryImageSource;
  thumbnailUri?: StoryImageSource;
  uri?: string;
  url?: string;
  duration?: number;
  muted?: boolean;
  [key: string]: unknown;
}

/**
 * Default flexible story group object. Developers can pass any custom object shape.
 */
export interface StoryGroupData<TItem = StoryItemData> {
  id?: string | number;
  avatarUri?: StoryImageSource;
  userUri?: StoryImageSource;
  items?: readonly TItem[];
  [key: string]: unknown;
}

export interface StoryVideoLoadEvent {
  /**
   * Video duration in milliseconds.
   */
  duration: number;
  width?: number;
  height?: number;
}

export interface StoryVideoProgressEvent {
  /**
   * Current playback position in milliseconds.
   */
  currentTime: number;
  /**
   * Total video duration in milliseconds.
   */
  duration: number;
}

export interface StoryRenderItemInfo<TStory, TItem> {
  item: TItem;
  story: TStory;
  itemIndex: number;
  storyIndex: number;
  isActive: boolean;
  isPaused: boolean;
  progress: Animated.Value;
  mediaType: StoryMediaType;
  imageUri?: string;
  videoUri?: string;
  posterUri?: string;
  muted: boolean;
  onVideoLoad: (event: StoryVideoLoadEvent) => void;
  onVideoProgress: (event: StoryVideoProgressEvent) => void;
  onVideoBuffer: (isBuffering: boolean) => void;
  onVideoEnd: () => void;
  onVideoError: (error?: unknown) => void;
}

export interface StoryRenderVideoInfo<
  TStory,
  TItem,
> extends StoryRenderItemInfo<TStory, TItem> {
  videoUri: string;
}

export interface StoryRenderHeaderInfo<TStory, TItem> {
  story: TStory;
  item: TItem | undefined;
  storyIndex: number;
  itemIndex: number;
  isActive: boolean;
  showUser: boolean;
  showCloseButton: boolean;
  mediaType: StoryMediaType;
  close: () => void;
}

export interface StoryItemSeenInfo<TStory, TItem> {
  story: TStory;
  item: TItem;
  storyIndex: number;
  itemIndex: number;
  isLastItem: boolean;
}

export interface InstagramStoryProps<
  TStory extends Record<string, unknown> = StoryGroupData,
  TItem extends Record<string, unknown> = StoryItemData,
> {
  /**
   * Array of story group objects (supports any custom object structure).
   */
  stories: readonly TStory[];
  /**
   * Whether the story viewer is visible (default: true).
   */
  visible?: boolean;
  /**
   * Initial story group index when opened (default: 0).
   */
  initialStoryIndex?: number;
  /**
   * Initial item index inside the initial story group (default: 0).
   */
  initialItemIndex?: number;
  /**
   * Resolve the starting item index for any story (e.g. to resume from last unwatched item).
   */
  getInitialItemIndex?: (story: TStory, storyIndex: number) => number;
  /**
   * Auto-advance duration in milliseconds per story item (default: 10000 = 10s).
   */
  duration?: number;
  /**
   * Enable automatic advancement to the next item/story (default: true).
   */
  autoPlay?: boolean;
  /**
   * Enable swipe-down gesture to close the story viewer (default: true).
   */
  swipeToClose?: boolean;
  /**
   * Vertical drag distance in pixels required to dismiss (default: 120).
   */
  swipeToCloseThreshold?: number;
  /**
   * Enable tapping left/right sides to go to previous/next item (default: true).
   */
  tapToNavigate?: boolean;
  /**
   * Pause the timer while pressing and holding a story (default: true).
   */
  pauseOnHold?: boolean;
  /**
   * Hide progress bar, header, and footer overlays while pressing and holding a story (default: true).
   */
  hideOverlaysOnHold?: boolean;
  /**
   * Show progress bars at the top of each story (default: true).
   */
  showProgressBar?: boolean;
  /**
   * Show user avatar and username on the story view (default: true).
   */
  showUser?: boolean;
  /**
   * Show the close button in the story header (default: true).
   */
  showCloseButton?: boolean;
  /**
   * Show a loading spinner while a video story is buffering (default: true).
   */
  showLoadingIndicator?: boolean;
  /**
   * Mute audio for video stories (default: false). Can also be overridden per item via `item.muted`.
   */
  muted?: boolean;
  /**
   * Resize mode for built-in video stories (default: 'cover').
   */
  videoResizeMode?: StoryVideoResizeMode;
  /**
   * Loop video stories when playback ends instead of advancing (default: false).
   */
  repeatVideo?: boolean;
  /**
   * Filled progress bar color (default: '#FFFFFF').
   */
  progressBarColor?: string;
  /**
   * Unfilled progress track color (default: 'rgba(255,255,255,0.3)').
   */
  progressTrackColor?: string;
  /**
   * Backdrop color behind the story during swipe-down (default: '#000000').
   */
  backdropColor?: string;
  /**
   * Camera distance multiplier for native 3D cube perspective (default: 4.5).
   */
  perspective?: number;
  /**
   * Maximum 3D cube rotation angle in degrees (default: 90).
   */
  cubeAngle?: number;
  /**
   * Optional container style.
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Extract unique key from a story object (defaults to `story.id ?? index`).
   */
  keyExtractor?: (story: TStory, index: number) => string;
  /**
   * Extract items array from a story object (defaults to `story.items ?? []`).
   */
  getItems?: (story: TStory) => readonly TItem[];
  /**
   * Extract per-item auto-next duration in ms (defaults to `item.duration ?? duration`).
   */
  getItemDuration?: (item: TItem, story: TStory) => number;
  /**
   * Extract image URI for default item rendering (defaults to `item.imageUri ?? item.image ?? item.uri ?? item.url`).
   */
  getItemImage?: (item: TItem, story: TStory) => string | undefined;
  /**
   * Determine media type ('image' | 'video') for an item.
   * Defaults to checking `item.type` / `item.mediaType`, `videoUri` / `video`, or video file extensions on `uri` / `url`.
   */
  getItemType?: (item: TItem, story: TStory) => StoryMediaType;
  /**
   * Extract video URI for video story rendering (defaults to `item.videoUri ?? item.video`, or `item.uri ?? item.url` when type is `'video'`).
   */
  getItemVideo?: (item: TItem, story: TStory) => string | undefined;
  /**
   * Extract poster/thumbnail image URI shown while a video story loads (defaults to `item.posterUri ?? item.thumbnailUri ?? item.imageUri ?? item.image`).
   */
  getItemPoster?: (item: TItem, story: TStory) => string | undefined;
  /**
   * Custom renderer for each story item's content (overrides both image and video default rendering).
   */
  renderItem?: (info: StoryRenderItemInfo<TStory, TItem>) => ReactNode;
  /**
   * Custom renderer specifically for video story items (overrides only the built-in video player).
   */
  renderVideo?: (info: StoryRenderVideoInfo<TStory, TItem>) => ReactNode;
  /**
   * Custom header renderer (placed below the progress bar).
   */
  renderHeader?: (info: StoryRenderHeaderInfo<TStory, TItem>) => ReactNode;
  /**
   * Custom footer renderer (e.g., reply input, reactions).
   */
  renderFooter?: (info: StoryRenderItemInfo<TStory, TItem>) => ReactNode;
  /**
   * Called when the active story group changes.
   */
  onStoryChange?: (storyIndex: number, story: TStory) => void;
  /**
   * Called when the active item inside a story group changes.
   */
  onItemChange?: (
    itemIndex: number,
    item: TItem,
    storyIndex: number,
    story: TStory
  ) => void;
  /**
   * Called when a story item becomes visible/seen while the viewer is open.
   */
  onStoryItemSeen?: (info: StoryItemSeenInfo<TStory, TItem>) => void;
  /**
   * Called when a video story finishes loading its metadata.
   */
  onVideoLoad?: (
    info: StoryVideoLoadEvent & {
      item: TItem;
      story: TStory;
      itemIndex: number;
      storyIndex: number;
    }
  ) => void;
  /**
   * Called when a video story finishes playing.
   */
  onVideoEnd?: (info: {
    item: TItem;
    story: TStory;
    itemIndex: number;
    storyIndex: number;
  }) => void;
  /**
   * Called when a video story fails to load or play.
   */
  onVideoError?: (info: {
    error: unknown;
    item: TItem;
    story: TStory;
    itemIndex: number;
    storyIndex: number;
  }) => void;
  /**
   * Called when the user swipes down to close or taps close.
   */
  onClose?: () => void;
  /**
   * Called when auto-next or tap-next reaches the end of the last story (falls back to `onClose` if omitted).
   */
  onFinish?: () => void;
}
