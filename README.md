# react-native-android-story

> **Android Only:** This library supports **Android (New Architecture / Fabric) only**. iOS is not supported.

React Native Android Story library powered by a native Android Fabric `ViewPager2` container with hardware-accelerated 3D cube transitions.

## Features

- **Native 3D Cube Transition (Android Fabric):** Smooth page-to-page 3D cube rotation driven natively via `ViewPager2`, `RecyclerView` view recycling, and a custom `PageTransformer` (`perspective`, `cubeAngle`) running on the Android UI/RenderThread.
- **Image & Video Story Support (Zero Extra Dependencies):** Supports both image and video stories out of the box (`videoUri`, `video`, `type: 'video'`, `mediaType: 'video'`, or video URL extensions), powered by Android's built-in native player (`TextureView` + `MediaPlayer`) with automatic progress bar synchronization, buffering indicator, poster thumbnails, pause-on-hold, and optional custom `renderVideo`.
- **Flexible JSON & Mixed Media Sources:** Pass any custom backend JSON object shape. Supports remote URLs, `{ uri }` objects, and local `require(...)` assets for `avatarUri`, `userUri`, `imageUri`, `videoUri`, `video`, `posterUri`, and `thumbnailUri`.
- **Auto-Next & Gesture Controls:**
  - Configurable auto-advance timer (default `10000` ms / 10 seconds per image item, or natural video duration for video stories)
  - Tap left/right edges to navigate previous/next
  - Press and hold to pause progress (and pause video playback) with optional overlay hiding
  - Swipe down to close with customizable drag threshold
- **Watch Progress, Resume & Story Ordering (`useStoryProgress`):**
  - Tracks seen story items per avatar
  - Resumes an avatar from its first unwatched story item when reopened
  - Moves fully watched avatars to the end of `orderedStories` when the viewer closes (so you can render their ring gray)
- **Custom Rendering:** Full control over story item content (`renderItem`), video player (`renderVideo`), header (`renderHeader`), footer (`renderFooter`), and per-item duration (`getItemDuration`).

## Performance Benchmark (Native Fabric vs. Pure JS)

Side-by-side 3D cube transition recordings and empirical measurements captured on the same Android device (`emulator-5554`, `1080×2400 @ 60 Hz`) under the same ~`4.84 s` horizontal swipe workload comparing the native Fabric `ViewPager2` + Android `Camera`/`Matrix` `PageTransformer` implementation against a Pure JS `PanResponder` + `Animated.Value` (`useNativeDriver: false`) implementation:

<table>
  <thead>
    <tr>
      <th align="center">Native Fabric (<code>ViewPager2</code>)</th>
      <th align="center">Pure JS (<code>PanResponder</code> + <code>Animated</code>)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="center">
        <img src="./assets/benchmark-native.gif" width="240" alt="Native Fabric 3D Cube Transition Benchmark" />
      </td>
      <td align="center">
        <img src="./assets/benchmark-js.gif" width="240" alt="Pure JS 3D Cube Transition Benchmark" />
      </td>
    </tr>
    <tr>
      <td align="center"><b>6.56% OS jank</b> · <code>244</code> frames rendered</td>
      <td align="center"><b>70.93% OS jank</b> · <code>86</code> frames rendered</td>
    </tr>
  </tbody>
</table>

### Layer 1 — JavaScript Thread & React Reconciler Telemetry

Measured via an in-app `requestAnimationFrame` delta sampler (`Δt > 16.67 ms` jank, `Δt > 33.33 ms` severe jank) and React `<Profiler>` commit counter:

| Metric | Native Fabric (`ViewPager2`) | Pure JS (`PanResponder` + `Animated`) |
| --- | ---: | ---: |
| Duration | `4840.96 ms` | `4833.24 ms` |
| rAF Samples | `123` | `74` |
| Effective JS FPS | `25.4 FPS` | `15.3 FPS` |
| Mean Frame Time (`μ`) | `39.36 ms` | `65.31 ms` |
| Frame Time StdDev (`σ`) | `44.48 ms` | `31.53 ms` |
| Median Frame Time (P<sub>50</sub>) | `17.85 ms` | `75.80 ms` |
| P<sub>90</sub> / P<sub>95</sub> / P<sub>99</sub> | `132.28` / `141.19` / `170.04 ms` | `94.45` / `105.89` / `146.34 ms` |
| Max Frame Time | `176.41 ms` | `146.34 ms` |
| Jank Frames (`> 16.67 ms`) | `60` (`48.78%`) | `60` (`81.08%`) |
| Severe Jank (`> 33.33 ms`) | `31` | `56` |
| 60 FPS Budget Compliance | `51.22%` | `18.92%` |
| React `<Profiler>` Commits | `155` | `280` |

### Layer 2 — Android OS Frame Rendering (`adb shell dumpsys gfxinfo`)

Hardware UI / RenderThread metrics collected directly from Android Graphics Info for the same swipe window:

| Android `gfxinfo` Metric | Native Fabric (`ViewPager2`) | Pure JS (`PanResponder` + `Animated`) |
| --- | ---: | ---: |
| Total Frames Rendered | `244` | `86` |
| Janky Frames | `16` (`6.56%`) | `61` (`70.93%`) |
| P<sub>50</sub> GPU/UI Frame Time | `29 ms` | `32 ms` |
| P<sub>90</sub> Frame Time | `42 ms` | `36 ms` |
| P<sub>95</sub> Frame Time | `48 ms` | `48 ms` |
| P<sub>99</sub> Frame Time | `57 ms` | `77 ms` |
| Slow UI Thread Frames | `9` | `12` |
| Slow Issue Draw Commands | `14` | `57` |
| Active Native `Views` | `246` | `360` |

## Installation

This package is not published on npm. You can install it directly from GitHub or embed it locally into your React Native Android app:

### Option 1: Install from GitHub

```sh
yarn add https://github.com/ismkerem/react-native-android-story.git
# or
npm install https://github.com/ismkerem/react-native-android-story.git
```

### Option 2: Embed locally in your app

1. Clone or copy this repository into your project (for example, `packages/react-native-android-story`).
2. Add it as a local dependency in your app's `package.json`:

```json
"react-native-android-story": "file:./packages/react-native-android-story"
```

3. Install dependencies and rebuild your Android app so React Native autolinking & Codegen compile the native `AndroidStoryView` Fabric component.

### Requirements

- React Native with **New Architecture (Fabric)** enabled on Android.
- No extra JS peer dependencies (`react-native-reanimated`, `react-native-gesture-handler`, or external video packages are not required).
- Codegen artifacts are generated automatically during Android Gradle builds. After installing in your app, rebuild your Android app so native specs and autolinking are compiled.

## Usage

### Story Viewer with Watch Progress & Flexible Data (`AndroidStory` + `useStoryProgress`)

`stories` accepts any object structure from your backend. Both remote URLs and local `require(...)` assets are supported on `avatarUri`, `userUri`, `imageUri`, `videoUri`, `video`, `posterUri`, and `thumbnailUri` (or resolved via custom `getItem*` extractors).

```tsx
import {
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  AndroidStory,
  resolveImageUri,
  useStoryProgress,
} from 'react-native-android-story';

interface CustomStoryItem {
  id: string;
  type?: 'image' | 'video';
  imageUri?: string | number;
  videoUri?: string | number;
  posterUri?: string | number;
  caption?: string;
  duration?: number;
  muted?: boolean;
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
      {
        id: 'a3',
        type: 'video',
        videoUri: 'https://example.com/stories/a3.mp4',
        posterUri: 'https://example.com/stories/a3-thumb.jpg',
        caption: 'Video story with auto duration & synced progress bar',
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

      <AndroidStory
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

### Video Auto-Detection

Without `getItemType`, each item is automatically detected as `'video'` when any of the following is true:

1. `item.type` or `item.mediaType` is `'video'`
2. `item.videoUri` or `item.video` is provided (or `getItemVideo` returns a URI)
3. `item.uri` or `item.url` ends with a video extension (`.mp4`, `.mov`, `.m4v`, `.webm`, `.m3u8`, `.mkv`, `.3gp`, `.avi`, `.ts`)

### Custom Video Player (`renderVideo`)

By default, video items play in the native Android `TextureView` + `MediaPlayer` layer. If you prefer `react-native-video` or `expo-video`, pass `renderVideo` and forward the lifecycle callbacks so the progress bar stays synced:

```tsx
<AndroidStory
  stories={orderedStories}
  visible={isOpen}
  onClose={closeStory}
  renderVideo={({
    videoUri,
    isActive,
    isPaused,
    muted,
    onVideoLoad,
    onVideoProgress,
    onVideoBuffer,
    onVideoEnd,
    onVideoError,
  }) => (
    <Video
      source={{ uri: videoUri }}
      style={StyleSheet.absoluteFill}
      resizeMode="cover"
      paused={!isActive || isPaused}
      muted={muted}
      onLoad={(e) => onVideoLoad({ duration: e.duration * 1000 })}
      onProgress={(e) =>
        onVideoProgress({
          currentTime: e.currentTime * 1000,
          duration: e.playableDuration * 1000,
        })
      }
      onBuffer={({ isBuffering }) => onVideoBuffer(isBuffering)}
      onEnd={onVideoEnd}
      onError={onVideoError}
    />
  )}
/>
```

## API Reference

### `<AndroidStory />` Props

| Prop                    | Type                                           | Default                                                                               | Description                                                                                                                                                                                                                           |
| ----------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stories`               | `readonly TStory[]`                            | **Required**                                                                          | Array of story group objects (supports custom backend shapes).                                                                                                                                                                        |
| `visible`               | `boolean`                                      | `true`                                                                                | Controls modal/viewer visibility.                                                                                                                                                                                                     |
| `initialStoryIndex`     | `number`                                       | `0`                                                                                   | Initial story group index when opened.                                                                                                                                                                                                |
| `initialItemIndex`      | `number`                                       | `0`                                                                                   | Initial item index inside the initial story group.                                                                                                                                                                                    |
| `getInitialItemIndex`   | `(story, storyIndex) => number`                | —                                                                                     | Resolve the starting item index per story (e.g. from `useStoryProgress`).                                                                                                                                                             |
| `duration`              | `number`                                       | `10000`                                                                               | Default auto-advance duration per story item in milliseconds.                                                                                                                                                                         |
| `autoPlay`              | `boolean`                                      | `true`                                                                                | Automatically advance to the next item/story when duration elapses.                                                                                                                                                                   |
| `swipeToClose`          | `boolean`                                      | `true`                                                                                | Enable vertical swipe-down gesture to close the viewer.                                                                                                                                                                               |
| `swipeToCloseThreshold` | `number`                                       | `120`                                                                                 | Vertical drag distance in pixels required to dismiss.                                                                                                                                                                                 |
| `tapToNavigate`         | `boolean`                                      | `true`                                                                                | Tap left/right areas of the screen to move to previous/next item.                                                                                                                                                                     |
| `pauseOnHold`           | `boolean`                                      | `true`                                                                                | Pause the timer while pressing and holding the story.                                                                                                                                                                                 |
| `hideOverlaysOnHold`    | `boolean`                                      | `true`                                                                                | Hide progress bar, header, and footer overlays while holding the story so only story content is visible.                                                                                                                              |
| `showProgressBar`       | `boolean`                                      | `true`                                                                                | Show segmented progress bars at the top of each story.                                                                                                                                                                                |
| `showUser`              | `boolean`                                      | `true`                                                                                | Show user avatar and username on the story view (set `false` to hide user info).                                                                                                                                                      |
| `showCloseButton`       | `boolean`                                      | `true`                                                                                | Show the close (`✕`) button in the story header (set `false` to hide it).                                                                                                                                                             |
| `showLoadingIndicator`  | `boolean`                                      | `true`                                                                                | Show a centered loading spinner while a video story is buffering.                                                                                                                                                                     |
| `muted`                 | `boolean`                                      | `false`                                                                               | Mute audio for video stories (can also be overridden per item via `item.muted`).                                                                                                                                                      |
| `videoResizeMode`       | `'cover' \| 'contain' \| 'stretch'`            | `'cover'`                                                                             | Resize mode for built-in video playback.                                                                                                                                                                                              |
| `repeatVideo`           | `boolean`                                      | `false`                                                                               | Loop video stories when playback finishes instead of advancing.                                                                                                                                                                       |
| `progressBarColor`      | `string`                                       | `'#FFFFFF'`                                                                           | Filled progress bar color.                                                                                                                                                                                                            |
| `progressTrackColor`    | `string`                                       | `'rgba(255, 255, 255, 0.32)'`                                                         | Background track color for progress segments.                                                                                                                                                                                         |
| `backdropColor`         | `string`                                       | `'#000000'`                                                                           | Backdrop color visible behind the viewer during swipe-down.                                                                                                                                                                           |
| `perspective`           | `number`                                       | `4.5`                                                                                 | Camera distance multiplier relative to view width for 3D cube perspective.                                                                                                                                                            |
| `cubeAngle`             | `number`                                       | `90`                                                                                  | Maximum Y-axis rotation angle in degrees at full page offset.                                                                                                                                                                         |
| `style`                 | `StyleProp<ViewStyle>`                         | —                                                                                     | Optional container style.                                                                                                                                                                                                             |
| `keyExtractor`          | `(story, index) => string`                     | `story.id ?? index`                                                                   | Extract a unique key for each story group.                                                                                                                                                                                            |
| `getItems`              | `(story) => readonly TItem[]`                  | `story.items ?? []`                                                                   | Extract the items array from a custom story object.                                                                                                                                                                                   |
| `getItemDuration`       | `(item, story) => number`                      | `item.duration ?? duration`                                                           | Override duration in milliseconds for an individual story item (for videos without an explicit duration, the video's natural duration is used).                                                                                       |
| `getItemImage`          | `(item, story) => string \| undefined`         | `resolveImageUri(item.imageUri ?? item.image ?? item.uri ?? item.url)`                | Resolve an image URI for default item rendering.                                                                                                                                                                                      |
| `getItemType`           | `(item, story) => 'image' \| 'video'`          | Auto-detected                                                                         | Determine whether an item is `'image'` or `'video'` (checks `type`/`mediaType`, `videoUri`/`video`, and video extensions on `uri`/`url`).                                                                                             |
| `getItemVideo`          | `(item, story) => string \| undefined`         | `resolveMediaUri(item.videoUri ?? item.video)`                                        | Resolve a video URI (falls back to `uri`/`url` when type is `'video'`).                                                                                                                                                               |
| `getItemPoster`         | `(item, story) => string \| undefined`         | `resolveMediaUri(item.posterUri ?? item.thumbnailUri ?? item.imageUri ?? item.image)` | Resolve a poster/thumbnail URI displayed while a video loads.                                                                                                                                                                         |
| `renderItem`            | `(info) => ReactNode`                          | Default image / video                                                                 | Custom renderer for each story item (`{ item, story, itemIndex, storyIndex, isActive, isPaused, progress, mediaType, imageUri, videoUri, posterUri, muted, onVideoLoad, onVideoProgress, onVideoBuffer, onVideoEnd, onVideoError }`). |
| `renderVideo`           | `(info) => ReactNode`                          | Built-in player inside `<AndroidStoryView />`                                       | Custom video renderer (e.g., `react-native-video` or `expo-video`) receiving video URI, `isPaused`, `muted`, and progress sync callbacks.                                                                                             |
| `renderHeader`          | `(info) => ReactNode`                          | Default avatar + title + close                                                        | Custom header renderer below the progress bar (`{ story, item, storyIndex, itemIndex, isActive, showUser, showCloseButton, mediaType, close }`).                                                                                      |
| `renderFooter`          | `(info) => ReactNode`                          | —                                                                                     | Custom footer renderer (e.g. reply input, reactions).                                                                                                                                                                                 |
| `onStoryChange`         | `(storyIndex, story) => void`                  | —                                                                                     | Called when the active story group changes.                                                                                                                                                                                           |
| `onItemChange`          | `(itemIndex, item, storyIndex, story) => void` | —                                                                                     | Called when the active item inside a story group changes.                                                                                                                                                                             |
| `onStoryItemSeen`       | `(info) => void`                               | —                                                                                     | Called when an item becomes visible (`{ story, item, storyIndex, itemIndex, isLastItem }`).                                                                                                                                           |
| `onVideoLoad`           | `(info) => void`                               | —                                                                                     | Called when a video story finishes loading its metadata (`{ duration, width, height, item, story, itemIndex, storyIndex }`).                                                                                                          |
| `onVideoEnd`            | `(info) => void`                               | —                                                                                     | Called when a video story finishes playing.                                                                                                                                                                                           |
| `onVideoError`          | `(info) => void`                               | —                                                                                     | Called when a video story fails to load or play.                                                                                                                                                                                      |
| `onClose`               | `() => void`                                   | —                                                                                     | Called when the user swipes down or taps close.                                                                                                                                                                                       |
| `onFinish`              | `() => void`                                   | Falls back to `onClose`                                                               | Called when navigation/auto-play passes the final item of the last story.                                                                                                                                                             |

### `useStoryProgress(options)`

Manages per-item seen tracking, resume-at-unwatched-item logic, and moving watched avatars to the end when the story viewer closes.

**Options:**

- `stories: readonly TStory[]`
- `keyExtractor?: (story, index) => string`
- `getItems?: (story) => readonly TItem[]`
- `getItemKey?: (item, index, story) => string`

**Returns:**

- `orderedStories`: Reordered array with unwatched stories first and fully watched stories moved to the end after `closeStory()`.
- `isOpen`: Boolean state for `<AndroidStory visible={isOpen} />`.
- `initialStoryIndex`: Index inside `orderedStories` for `<AndroidStory initialStoryIndex={initialStoryIndex} />`.
- `openStory(storyOrIndex)`: Open the viewer at a specific story object or index.
- `closeStory()`: Close the viewer and reorder completed avatars to the end.
- `isStoryWatched(story)`: Returns `true` once every item in the story has been seen.
- `getInitialItemIndex(story)`: Pass to `<AndroidStory getInitialItemIndex={getInitialItemIndex} />` to resume from the first unwatched item.
- `markItemSeen(info)`: Pass to `<AndroidStory onStoryItemSeen={markItemSeen} />`.
- `resetProgress()`: Clears all recorded progress.

### Media Helpers

- `resolveMediaUri(source)` / `resolveImageUri(source)`: Converts a URL string, `{ uri: string }` object, or numeric local `require(...)` asset ID into a resolved URI string (`string | undefined`).
- `inferMediaTypeFromUri(uri)`: Returns `'video'` when a URI path ends with a recognized video extension (ignoring query strings and hashes), otherwise `undefined`.

## Example App

Run the interactive Android example app (includes toggles for all props, built-in video playback, and live event logs):

```sh
yarn example android
```

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
