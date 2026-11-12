import type * as React from 'react';
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

export interface InstagramStoryViewRef {
  setPage: (selectedPage: number) => void;
  setPageWithoutAnimation: (selectedPage: number) => void;
}

export interface InstagramStoryViewProps extends ViewProps {
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
}

/**
 * Default flexible item object. Developers can pass any custom object shape.
 */
export interface StoryItemData {
  id?: string | number;
  image?: string;
  uri?: string;
  url?: string;
  duration?: number;
  [key: string]: unknown;
}

/**
 * Default flexible story group object. Developers can pass any custom object shape.
 */
export interface StoryGroupData<TItem = StoryItemData> {
  id?: string | number;
  items?: readonly TItem[];
  [key: string]: unknown;
}

export interface StoryRenderItemInfo<TStory, TItem> {
  item: TItem;
  story: TStory;
  itemIndex: number;
  storyIndex: number;
  isActive: boolean;
  isPaused: boolean;
  progress: Animated.Value;
}

export interface StoryRenderHeaderInfo<TStory, TItem> {
  story: TStory;
  item: TItem | undefined;
  storyIndex: number;
  itemIndex: number;
  isActive: boolean;
  close: () => void;
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
   * Show progress bars at the top of each story (default: true).
   */
  showProgressBar?: boolean;
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
   * Extract image URI for default item rendering (defaults to `item.image ?? item.uri ?? item.url`).
   */
  getItemImage?: (item: TItem, story: TStory) => string | undefined;
  /**
   * Custom renderer for each story item's content.
   */
  renderItem?: (info: StoryRenderItemInfo<TStory, TItem>) => React.ReactNode;
  /**
   * Custom header renderer (placed below the progress bar).
   */
  renderHeader?: (
    info: StoryRenderHeaderInfo<TStory, TItem>
  ) => React.ReactNode;
  /**
   * Custom footer renderer (e.g., reply input, reactions).
   */
  renderFooter?: (info: StoryRenderItemInfo<TStory, TItem>) => React.ReactNode;
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
   * Called when the user swipes down to close or taps close.
   */
  onClose?: () => void;
  /**
   * Called when auto-next or tap-next reaches the end of the last story (falls back to `onClose` if omitted).
   */
  onFinish?: () => void;
}
