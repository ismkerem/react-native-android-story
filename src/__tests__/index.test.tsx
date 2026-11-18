import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { ActivityIndicator, Image } from 'react-native';
import { describe, expect, it, jest } from '@jest/globals';

jest.doMock('react', () => {
  const actual = jest.requireActual<typeof import('react')>('react');
  return {
    ...actual,
    useRef: (initialValue: unknown) => ({ current: initialValue }),
    useState: (initialState: unknown) => [
      typeof initialState === 'function'
        ? (initialState as () => unknown)()
        : initialState,
      jest.fn(),
    ],
    useCallback: (fn: unknown) => fn,
    useMemo: (factory: () => unknown) => factory(),
    useEffect: jest.fn(),
    useImperativeHandle: jest.fn(),
  };
});

const { AndroidStory } =
  require('../AndroidStory') as typeof import('../AndroidStory');
const { AndroidStoryView } =
  require('../AndroidStoryView') as typeof import('../AndroidStoryView');
const { inferMediaTypeFromUri, normalizeNativeStoryData, resolveMediaUri } =
  require('../resolveImageUri') as typeof import('../resolveImageUri');

function renderForwardRef(component: unknown, props: Record<string, unknown>) {
  const forwardRefComponent = component as {
    render: (p: Record<string, unknown>, ref: unknown) => ReactNode;
  };
  return forwardRefComponent.render(props, null);
}

function findElements(
  node: unknown,
  predicate: (el: ReactElement<Record<string, unknown>>) => boolean
): ReactElement<Record<string, unknown>>[] {
  if (!node || typeof node !== 'object') {
    return [];
  }
  if (Array.isArray(node)) {
    return node.flatMap((child) => findElements(child, predicate));
  }
  if (!isValidElement(node)) {
    return [];
  }
  const el = node as ReactElement<Record<string, unknown>>;
  const matches = predicate(el) ? [el] : [];
  return [...matches, ...findElements(el.props.children, predicate)];
}

const STORIES = [
  {
    id: 'story-1',
    username: 'testuser',
    items: [{ id: 'item-1', imageUri: 'https://example.com/1.jpg' }],
  },
];

describe('AndroidStory showCloseButton prop', () => {
  it('renders the close button by default when onClose is provided', () => {
    const element = AndroidStory({
      stories: STORIES,
      onClose: jest.fn(),
    });

    const closeButtons = findElements(
      element,
      (el) => el.props.testID === 'android-story-close-button'
    );
    expect(closeButtons).toHaveLength(1);
  });

  it('renders the close button when showCloseButton is true', () => {
    const element = AndroidStory({
      stories: STORIES,
      onClose: jest.fn(),
      showCloseButton: true,
    });

    const closeButtons = findElements(
      element,
      (el) => el.props.testID === 'android-story-close-button'
    );
    expect(closeButtons).toHaveLength(1);
  });

  it('hides the close button when showCloseButton is false', () => {
    const element = AndroidStory({
      stories: STORIES,
      onClose: jest.fn(),
      showCloseButton: false,
    });

    const closeButtons = findElements(
      element,
      (el) => el.props.testID === 'android-story-close-button'
    );
    expect(closeButtons).toHaveLength(0);
  });

  it('passes showCloseButton to renderHeader', () => {
    const renderHeader = jest.fn(() => null);

    AndroidStory({
      stories: STORIES,
      onClose: jest.fn(),
      showCloseButton: false,
      renderHeader,
    });

    expect(renderHeader).toHaveBeenCalledWith(
      expect.objectContaining({
        showCloseButton: false,
      })
    );
  });
});

describe('media URI resolution and inference', () => {
  it('resolves string, object, and numeric asset sources', () => {
    const spy = jest.spyOn(Image, 'resolveAssetSource').mockReturnValue({
      uri: 'file:///bundle/clip.mp4',
      width: 0,
      height: 0,
      scale: 1,
    });

    expect(resolveMediaUri('  https://example.com/clip.mp4  ')).toBe(
      'https://example.com/clip.mp4'
    );
    expect(resolveMediaUri({ uri: 'https://example.com/clip.mov' })).toBe(
      'https://example.com/clip.mov'
    );
    expect(resolveMediaUri(42)).toBe('file:///bundle/clip.mp4');
    expect(resolveMediaUri('   ')).toBeUndefined();

    spy.mockRestore();
  });

  it('infers video media type from video URL extensions with query strings', () => {
    expect(
      inferMediaTypeFromUri('https://cdn.example.com/clip.mp4?token=abc')
    ).toBe('video');
    expect(inferMediaTypeFromUri('https://cdn.example.com/stream.m3u8')).toBe(
      'video'
    );
    expect(inferMediaTypeFromUri('https://cdn.example.com/photo.jpg')).toBe(
      undefined
    );
  });

  it('normalizes videoUri, video, posterUri, and thumbnailUri in native storyData', () => {
    const spy = jest
      .spyOn(Image, 'resolveAssetSource')
      .mockImplementation((id) => ({
        uri: `asset:///media_${String(id)}`,
        width: 0,
        height: 0,
        scale: 1,
      }));

    const normalized = normalizeNativeStoryData({
      stories: [
        {
          id: 'u1',
          avatarUri: 1,
          items: [
            {
              id: 'i1',
              videoUri: 2,
              video: 3,
              posterUri: 4,
              thumbnailUri: 5,
            },
          ],
        },
      ],
    }) as {
      stories: Array<{
        avatarUri: string;
        items: Array<Record<string, unknown>>;
      }>;
    };

    expect(normalized.stories[0]?.avatarUri).toBe('asset:///media_1');
    expect(normalized.stories[0]?.items[0]?.videoUri).toBe('asset:///media_2');
    expect(normalized.stories[0]?.items[0]?.video).toBe('asset:///media_3');
    expect(normalized.stories[0]?.items[0]?.posterUri).toBe('asset:///media_4');
    expect(normalized.stories[0]?.items[0]?.thumbnailUri).toBe(
      'asset:///media_5'
    );

    spy.mockRestore();
  });
});

describe('AndroidStory unified video support', () => {
  it('configures unified AndroidStoryView pageMedia for video items and disables built-in media on image pages', () => {
    const element = AndroidStory({
      stories: [
        {
          id: 's1',
          items: [
            {
              id: 'v1',
              videoUri: 'https://example.com/video-1.mp4',
              posterUri: 'https://example.com/thumb-1.jpg',
            },
          ],
        },
        {
          id: 's2',
          items: [
            {
              id: 'v2',
              type: 'video',
              uri: 'https://example.com/video-2.mp4',
              muted: true,
            },
          ],
        },
        {
          id: 's3',
          items: [
            {
              id: 'i1',
              imageUri: 'https://example.com/photo-3.jpg',
            },
          ],
        },
      ],
      muted: false,
      videoResizeMode: 'contain',
      repeatVideo: true,
    });

    const storyViews = findElements(
      element,
      (el) => el.type === AndroidStoryView
    );

    expect(storyViews).toHaveLength(1);
    expect(storyViews[0]?.props).toMatchObject({
      paused: false,
      muted: false,
      repeat: true,
      videoResizeMode: 'contain',
      pageMedia: [
        {
          enabled: true,
          mediaType: 'video',
          uri: 'https://example.com/video-1.mp4',
          posterUri: 'https://example.com/thumb-1.jpg',
          muted: false,
        },
        {
          enabled: true,
          mediaType: 'video',
          uri: 'https://example.com/video-2.mp4',
          muted: true,
        },
        {
          enabled: false,
        },
      ],
    });
  });

  it('auto-detects video items from .mp4 uri without explicit type', () => {
    const renderHeader = jest.fn(() => null);
    const element = AndroidStory({
      stories: [
        {
          id: 's1',
          items: [{ id: 'v1', uri: 'https://example.com/clip.mp4?v=1' }],
        },
      ],
      renderHeader,
    });

    const storyViews = findElements(
      element,
      (el) => el.type === AndroidStoryView
    );
    expect(storyViews).toHaveLength(1);
    expect(storyViews[0]?.props.pageMedia).toEqual([
      {
        enabled: true,
        mediaType: 'video',
        uri: 'https://example.com/clip.mp4?v=1',
        posterUri: undefined,
        muted: false,
      },
    ]);
    expect(renderHeader).toHaveBeenCalledWith(
      expect.objectContaining({ mediaType: 'video' })
    );
  });

  it('routes unified AndroidStoryView native video events to onVideoLoad, onVideoEnd, and onVideoError', () => {
    const onVideoLoad = jest.fn();
    const onVideoEnd = jest.fn();
    const onVideoError = jest.fn();

    const element = AndroidStory({
      stories: [
        {
          id: 's1',
          items: [
            {
              id: 'v1',
              type: 'video',
              videoUri: 'https://example.com/clip.mp4',
            },
          ],
        },
      ],
      onVideoLoad,
      onVideoEnd,
      onVideoError,
    });

    const storyView = findElements(
      element,
      (el) => el.type === AndroidStoryView
    )[0];

    expect(storyView).toBeDefined();

    const handlers = storyView?.props as {
      onVideoLoad: (e: {
        nativeEvent: {
          position: number;
          duration: number;
          width: number;
          height: number;
        };
      }) => void;
      onVideoEnd: (e: {
        nativeEvent: { position: number; finished: boolean };
      }) => void;
      onVideoError: (e: {
        nativeEvent: { position: number; message: string };
      }) => void;
    };

    handlers.onVideoLoad({
      nativeEvent: { position: 0, duration: 15000, width: 1080, height: 1920 },
    });
    expect(onVideoLoad).toHaveBeenCalledWith(
      expect.objectContaining({
        duration: 15000,
        width: 1080,
        height: 1920,
        storyIndex: 0,
        itemIndex: 0,
      })
    );

    handlers.onVideoEnd({
      nativeEvent: { position: 0, finished: true },
    });
    expect(onVideoEnd).toHaveBeenCalledWith(
      expect.objectContaining({ storyIndex: 0, itemIndex: 0 })
    );

    handlers.onVideoError({
      nativeEvent: { position: 0, message: 'Codec error' },
    });
    expect(onVideoError).toHaveBeenCalledWith(
      expect.objectContaining({
        error: { message: 'Codec error' },
        storyIndex: 0,
        itemIndex: 0,
      })
    );
  });

  it('supports custom renderVideo and forwards video lifecycle callbacks', () => {
    const onVideoLoad = jest.fn();
    const onVideoEnd = jest.fn();
    const onVideoError = jest.fn();
    const renderVideo = jest.fn((_info: unknown) => null);

    const element = AndroidStory({
      stories: [
        {
          id: 's1',
          items: [
            {
              id: 'v1',
              type: 'video',
              videoUri: 'https://example.com/custom.mp4',
              posterUri: 'https://example.com/poster.jpg',
            },
          ],
        },
      ],
      muted: true,
      renderVideo,
      onVideoLoad,
      onVideoEnd,
      onVideoError,
    });

    const storyView = findElements(
      element,
      (el) => el.type === AndroidStoryView
    )[0];
    expect(storyView?.props.pageMedia).toEqual([{ enabled: false }]);

    expect(renderVideo).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaType: 'video',
        videoUri: 'https://example.com/custom.mp4',
        posterUri: 'https://example.com/poster.jpg',
        muted: true,
        isActive: true,
        isPaused: false,
      })
    );

    const renderArg = renderVideo.mock.calls[0]?.[0] as unknown as {
      onVideoLoad: (e: {
        duration: number;
        width: number;
        height: number;
      }) => void;
      onVideoEnd: () => void;
      onVideoError: (err: unknown) => void;
    };

    renderArg.onVideoLoad({ duration: 15000, width: 1080, height: 1920 });
    expect(onVideoLoad).toHaveBeenCalledWith(
      expect.objectContaining({
        duration: 15000,
        width: 1080,
        height: 1920,
        storyIndex: 0,
        itemIndex: 0,
      })
    );

    renderArg.onVideoEnd();
    expect(onVideoEnd).toHaveBeenCalledWith(
      expect.objectContaining({ storyIndex: 0, itemIndex: 0 })
    );

    const error = new Error('Network error');
    renderArg.onVideoError(error);
    expect(onVideoError).toHaveBeenCalledWith(
      expect.objectContaining({ error, storyIndex: 0, itemIndex: 0 })
    );
  });

  it('supports custom getItemType, getItemVideo, and getItemPoster resolvers', () => {
    const element = AndroidStory({
      stories: [
        {
          id: 's1',
          items: [
            {
              id: 'custom-1',
              kind: 'clip',
              streamPath: 'https://example.com/stream',
              thumb: 'https://example.com/thumb.png',
            },
          ],
        },
      ],
      getItemType: (item) => (item.kind === 'clip' ? 'video' : 'image'),
      getItemVideo: (item) =>
        typeof item.streamPath === 'string' ? item.streamPath : undefined,
      getItemPoster: (item) =>
        typeof item.thumb === 'string' ? item.thumb : undefined,
    });

    const storyViews = findElements(
      element,
      (el) => el.type === AndroidStoryView
    );
    expect(storyViews).toHaveLength(1);
    expect(storyViews[0]?.props.pageMedia).toEqual([
      {
        enabled: true,
        mediaType: 'video',
        uri: 'https://example.com/stream',
        posterUri: 'https://example.com/thumb.png',
        muted: false,
      },
    ]);
  });

  it('shows a loading indicator while a built-in video is buffering unless disabled', () => {
    const withSpinner = AndroidStory({
      stories: [
        {
          id: 's1',
          items: [{ id: 'v1', videoUri: 'https://example.com/video.mp4' }],
        },
      ],
    });

    expect(
      findElements(withSpinner, (el) => el.type === ActivityIndicator)
    ).toHaveLength(1);

    const withoutSpinner = AndroidStory({
      stories: [
        {
          id: 's1',
          items: [{ id: 'v1', videoUri: 'https://example.com/video.mp4' }],
        },
      ],
      showLoadingIndicator: false,
    });

    expect(
      findElements(withoutSpinner, (el) => el.type === ActivityIndicator)
    ).toHaveLength(0);
  });
});

describe('AndroidStoryView unified standalone image and video rendering', () => {
  it('forwards normalized standalone video and image props to NativeAndroidStoryView', () => {
    const videoTree = renderForwardRef(AndroidStoryView, {
      mediaType: 'video',
      videoUri: { uri: 'https://example.com/story.mp4' },
      posterUri: { uri: 'https://example.com/poster.jpg' },
      paused: true,
      muted: false,
      repeat: true,
      videoResizeMode: 'contain',
    });

    expect(isValidElement(videoTree)).toBe(true);
    const nativeVideoEl = videoTree as ReactElement<Record<string, unknown>>;
    expect(nativeVideoEl.props).toMatchObject({
      mediaType: 'video',
      videoUri: 'https://example.com/story.mp4',
      posterUri: 'https://example.com/poster.jpg',
      paused: true,
      muted: false,
      repeat: true,
      videoResizeMode: 'contain',
    });

    const imageTree = renderForwardRef(AndroidStoryView, {
      mediaType: 'image',
      source: { uri: 'https://example.com/photo.jpg' },
      videoResizeMode: 'cover',
    });

    expect(isValidElement(imageTree)).toBe(true);
    const nativeImageEl = imageTree as ReactElement<Record<string, unknown>>;
    expect(nativeImageEl.props).toMatchObject({
      mediaType: 'image',
      source: 'https://example.com/photo.jpg',
      videoResizeMode: 'cover',
    });
  });
});
