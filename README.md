# react-native-instagram-story

React Native Instagram Story library powered by a native Android Fabric `ViewPager2` container with hardware-accelerated 3D cube transitions.

## Features

- **Native 3D Cube Transition (Android Fabric):** Smooth page-to-page 3D cube rotation driven natively via `ViewPager2` and a custom `PageTransformer` (`perspective`, `cubeAngle`).
- **Flexible JSON & Mixed Image Sources:** Pass any custom backend JSON object shape. Supports both remote URLs, `{ uri }` objects, and local `require(...)` assets for `avatarUri`, `userUri`, and `imageUri`, forwarding normalized `storyData` directly to the native view.
- **Auto-Next & Gesture Controls:**
  - Configurable auto-advance timer (default `10000` ms / 10 seconds per story item)
  - Tap left/right edges to navigate previous/next
  - Press and hold to pause progress
  - Swipe down to close with customizable drag threshold
- **Watch Progress, Resume & Story Ordering (`useStoryProgress`):**
  - Tracks seen story items per avatar
  - Resumes an avatar from its first unwatched story item when reopened
  - Moves fully watched avatars to the end of `orderedStories` when the viewer closes (so you can render their ring gray)
- **Custom Rendering:** Full control over story item content (`renderItem`), header (`renderHeader`), footer (`renderFooter`), and per-item duration (`getItemDuration`).

> **Platform note:** Native 3D cube transitions and `storyData` parsing are implemented for **Android (New Architecture / Fabric)**.

## Installation

```sh
npm install react-native-instagram-story
# or
yarn add react-native-instagram-story
```

### Requirements

- React Native with **New Architecture (Fabric)** enabled on Android.
- Codegen artifacts are generated automatically during Android Gradle builds. After installing in your app, rebuild your Android app so native specs and autolinking are compiled.

## Usage

### Story Viewer with Watch Progress & Flexible Data (`InstagramStory` + `useStoryProgress`)

`stories` accepts any object structure from your backend. Both remote URLs and local `require(...)` assets are supported on `avatarUri`, `userUri`, and `imageUri` (or resolved via `getItemImage`).

```tsx
import * as React from 'react';
import { Image, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import {
  InstagramStory,
  resolveImageUri,
  useStoryProgress,
} from 'react-native-instagram-story';

interface CustomStoryItem {
  id: string;
  imageUri: string | number;
  caption?: string;
  duration?: number;
  [key: string]: unknown;
}

interface CustomStoryUser {
  id: string;
  username: string;
  avatarUri: string | number;
  userUri?: string | number;
  items: CustomStoryItem[];
  [key: string]: unknown;
}

const STORIES: CustomStoryUser[] = [
  {
    id: 'user-1',
    username: 'alex.dev',
    avatarUri: 'https://example.com/avatars/alex.jpg',
    userUri: 'https://example.com/users/alex',
    items: [
      {
        id: 'a1',
        imageUri: 'https://example.com/stories/a1.jpg',
        caption: 'Morning coffee',
      },
      {
        id: 'a2',
        imageUri: require('./assets/local-story.png'),
        caption: 'Local asset story',
        duration: 8000,
      },
    ],
  },
];

export function App() {
  const {
    orderedStories,
    isOpen,
    initialStoryIndex,
    openStory,
    closeStory,
    isStoryWatched,
    getInitialItemIndex,
    markItemSeen,
  } = useStoryProgress({ stories: STORIES });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.avatarRow}>
        {orderedStories.map((story) => {
          const watched = isStoryWatched(story);
          const avatar = resolveImageUri(story.avatarUri ?? story.userUri);

          return (
            <Pressable
              key={story.id}
              onPress={() => openStory(story)}
              style={styles.avatarButton}
            >
              <View
                style={[
                  styles.ring,
                  watched ? styles.ringWatched : styles.ringUnwatched,
                ]}
              >
                {avatar ? (
                  <Image source={{ uri: avatar }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatar} />
                )}
              </View>
              <Text style={styles.username}>{story.username}</Text>
            </Pressable>
          );
        })}
      </View>

      <InstagramStory
        stories={orderedStories}
        visible={isOpen}
        initialStoryIndex={initialStoryIndex}
        getInitialItemIndex={getInitialItemIndex}
        onStoryItemSeen={markItemSeen}
        onClose={closeStory}
        duration={10000}
        swipeToClose
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  avatarRow: { flexDirection: 'row', gap: 12, padding: 16 },
  avatarButton: { alignItems: 'center' },
  ring: { padding: 3, borderRadius: 36, borderWidth: 2.5 },
  ringUnwatched: { borderColor: '#E1306C' },
  ringWatched: { borderColor: '#B8BDC7' },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#EEE' },
  username: { marginTop: 6, fontSize: 12 },
});
```

### Low-Level Native Cube Container (`InstagramStoryView`)

If you want to control only the native 3D cube pager and pass an arbitrary `storyData` object directly to the native view:

```tsx
import * as React from 'react';
import { Text, View } from 'react-native';
import {
  InstagramStoryView,
  type InstagramStoryViewRef,
} from 'react-native-instagram-story';

export function CustomCubePager() {
  const pagerRef = React.useRef<InstagramStoryViewRef>(null);

  return (
    <InstagramStoryView
      ref={pagerRef}
      style={{ flex: 1 }}
      storyData={{
        stories: [
          {
            id: '1',
            avatarUri: 'https://example.com/avatar.jpg',
            userUri: 'https://example.com/user.jpg',
            items: [{ id: '1-1', imageUri: 'https://example.com/story.jpg' }],
          },
        ],
      }}
      initialPage={0}
      perspective={4.5}
      cubeAngle={90}
      onPageSelected={(e) => {
        console.log('Selected story index:', e.nativeEvent.position);
      }}
    >
      <View style={{ flex: 1 }}>
        <Text>Story Page 1</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text>Story Page 2</Text>
      </View>
    </InstagramStoryView>
  );
}
```

## API Reference

### `<InstagramStory />` Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `stories` | `readonly TStory[]` | **Required** | Array of story group objects (supports custom backend shapes). |
| `visible` | `boolean` | `true` | Controls modal/viewer visibility. |
| `initialStoryIndex` | `number` | `0` | Initial story group index when opened. |
| `initialItemIndex` | `number` | `0` | Initial item index inside the initial story group. |
| `getInitialItemIndex` | `(story, storyIndex) => number` | — | Resolve the starting item index per story (e.g. from `useStoryProgress`). |
| `duration` | `number` | `10000` | Default auto-advance duration per story item in milliseconds. |
| `autoPlay` | `boolean` | `true` | Automatically advance to the next item/story when duration elapses. |
| `swipeToClose` | `boolean` | `true` | Enable vertical swipe-down gesture to close the viewer. |
| `swipeToCloseThreshold` | `number` | `120` | Vertical drag distance in pixels required to dismiss. |
| `tapToNavigate` | `boolean` | `true` | Tap left/right areas of the screen to move to previous/next item. |
| `pauseOnHold` | `boolean` | `true` | Pause the timer while pressing and holding the story. |
| `showProgressBar` | `boolean` | `true` | Show segmented progress bars at the top of each story. |
| `progressBarColor` | `string` | `'#FFFFFF'` | Filled progress bar color. |
| `progressTrackColor` | `string` | `'rgba(255,255,255,0.3)'` | Background track color for progress segments. |
| `backdropColor` | `string` | `'#000000'` | Backdrop color visible behind the viewer during swipe-down. |
| `perspective` | `number` | `4.5` | Camera distance multiplier relative to view width for 3D cube perspective. |
| `cubeAngle` | `number` | `90` | Maximum Y-axis rotation angle in degrees at full page offset. |
| `style` | `StyleProp<ViewStyle>` | — | Optional container style. |
| `keyExtractor` | `(story, index) => string` | `story.id ?? index` | Extract a unique key for each story group. |
| `getItems` | `(story) => readonly TItem[]` | `story.items ?? []` | Extract the items array from a custom story object. |
| `getItemDuration` | `(item, story) => number` | `item.duration ?? duration` | Override duration in milliseconds for an individual story item. |
| `getItemImage` | `(item, story) => string \| undefined` | `resolveImageUri(item.imageUri ?? item.image ?? item.uri ?? item.url)` | Resolve an image URI for default item rendering. |
| `renderItem` | `(info) => ReactNode` | Default full-screen image | Custom renderer for each story item (`{ item, story, itemIndex, storyIndex, isActive, isPaused, progress }`). |
| `renderHeader` | `(info) => ReactNode` | Default avatar + title + close | Custom header renderer below the progress bar (`{ story, item, storyIndex, itemIndex, isActive, close }`). |
| `renderFooter` | `(info) => ReactNode` | — | Custom footer renderer (e.g. reply input, reactions). |
| `onStoryChange` | `(storyIndex, story) => void` | — | Called when the active story group changes. |
| `onItemChange` | `(itemIndex, item, storyIndex, story) => void` | — | Called when the active item inside a story group changes. |
| `onStoryItemSeen` | `(info) => void` | — | Called when an item becomes visible (`{ story, item, storyIndex, itemIndex, isLastItem }`). |
| `onClose` | `() => void` | — | Called when the user swipes down or taps close. |
| `onFinish` | `() => void` | Falls back to `onClose` | Called when navigation/auto-play passes the final item of the last story. |

### `useStoryProgress(options)`

Manages per-item seen tracking, resume-at-unwatched-item logic, and moving watched avatars to the end when the story viewer closes.

**Options:**
- `stories: readonly TStory[]`
- `keyExtractor?: (story, index) => string`
- `getItems?: (story) => readonly TItem[]`
- `getItemKey?: (item, index, story) => string`

**Returns:**
- `orderedStories`: Reordered array with unwatched stories first and fully watched stories moved to the end after `closeStory()`.
- `isOpen`: Boolean state for `<InstagramStory visible={isOpen} />`.
- `initialStoryIndex`: Index inside `orderedStories` for `<InstagramStory initialStoryIndex={initialStoryIndex} />`.
- `openStory(storyOrIndex)`: Open the viewer at a specific story object or index.
- `closeStory()`: Close the viewer and reorder completed avatars to the end.
- `isStoryWatched(story)`: Returns `true` once every item in the story has been seen.
- `getInitialItemIndex(story)`: Pass to `<InstagramStory getInitialItemIndex={getInitialItemIndex} />` to resume from the first unwatched item.
- `markItemSeen(info)`: Pass to `<InstagramStory onStoryItemSeen={markItemSeen} />`.
- `resetProgress()`: Clears all recorded progress.

### `<InstagramStoryView />` Props & Ref

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `storyData` | `Record<string, unknown> \| readonly Record<string, unknown>[]` | — | Flexible story payload forwarded to native Fabric; `avatarUri`, `userUri`, and `imageUri` asset IDs are automatically resolved to URI strings. |
| `initialPage` | `number` | `0` | Initial page index on mount. |
| `scrollEnabled` | `boolean` | `true` | Enable/disable horizontal user swiping. |
| `offscreenPageLimit` | `number` | `1` | Number of pages kept mounted offscreen on either side. |
| `perspective` | `number` | `4.5` | Camera distance multiplier for 3D cube perspective. |
| `cubeAngle` | `number` | `90` | Maximum Y-axis cube rotation angle in degrees. |
| `overScrollMode` | `'auto' \| 'always' \| 'never'` | `'never'` | Android overscroll glow mode. |
| `onPageSelected` | `(event) => void` | — | Native callback with `{ position }`. |
| `onPageScroll` | `(event) => void` | — | Native callback with `{ position, offset }`. |
| `onPageScrollStateChanged` | `(event) => void` | — | Native callback with `{ pageScrollState }`. |

**Ref methods (`InstagramStoryViewRef`):**
- `setPage(selectedPage: number): void`
- `setPageWithoutAnimation(selectedPage: number): void`

### `resolveImageUri(source)`

Helper that converts a URL string, `{ uri: string }` object, or numeric local `require(...)` asset ID into a resolved URI string (`string | undefined`).

## Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
