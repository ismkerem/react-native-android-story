import {
  Children,
  forwardRef,
  isValidElement,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  type ComponentRef,
} from 'react';
import { StyleSheet, View } from 'react-native';
import NativeInstagramStoryView, {
  Commands,
} from './InstagramStoryViewNativeComponent';
import { normalizeNativeStoryData, resolveMediaUri } from './resolveImageUri';
import type {
  InstagramStoryViewProps,
  InstagramStoryViewRef,
  PageScrollState,
} from './types';

export type {
  InstagramStoryViewProps,
  InstagramStoryViewRef,
  OverScrollMode,
  PageScrollEvent,
  PageScrollState,
  PageScrollStateChangedEvent,
  PageSelectedEvent,
  StoryMediaSource,
  StoryMediaType,
  StoryPageMediaConfig,
  StoryVideoResizeMode,
  StoryViewVideoBufferEvent,
  StoryViewVideoEndEvent,
  StoryViewVideoErrorEvent,
  StoryViewVideoLoadEvent,
  StoryViewVideoProgressEvent,
} from './types';

export const InstagramStoryView = forwardRef<
  InstagramStoryViewRef,
  InstagramStoryViewProps
>(
  (
    {
      children,
      storyData,
      pageMedia,
      mediaType,
      source,
      imageUri,
      videoUri,
      posterUri,
      paused = false,
      muted = false,
      repeat = false,
      videoResizeMode = 'cover',
      initialPage = 0,
      scrollEnabled = true,
      offscreenPageLimit = 1,
      perspective = 4.5,
      cubeAngle = 90,
      overScrollMode = 'never',
      onPageScrollStateChanged,
      ...rest
    },
    ref
  ) => {
    const nativeRef =
      useRef<ComponentRef<typeof NativeInstagramStoryView>>(null);

    useImperativeHandle(
      ref,
      () => ({
        setPage(selectedPage: number) {
          if (nativeRef.current != null) {
            Commands.setPage(nativeRef.current, selectedPage);
          }
        },
        setPageWithoutAnimation(selectedPage: number) {
          if (nativeRef.current != null) {
            Commands.setPageWithoutAnimation(nativeRef.current, selectedPage);
          }
        },
        seekVideo(position: number, positionMs: number) {
          if (nativeRef.current != null) {
            Commands.seekVideo(nativeRef.current, position, positionMs);
          }
        },
      }),
      []
    );

    const wrappedChildren = useMemo(
      () =>
        Children.toArray(children).map((child, index) => {
          const key =
            isValidElement(child) && child.key != null
              ? String(child.key)
              : String(index);
          return (
            <View key={key} style={styles.page} collapsable={false}>
              {child}
            </View>
          );
        }),
      [children]
    );

    const handlePageScrollStateChanged = useCallback(
      (event: { nativeEvent: { pageScrollState: string } }) => {
        if (!onPageScrollStateChanged) return;
        onPageScrollStateChanged({
          ...event,
          nativeEvent: {
            pageScrollState: event.nativeEvent
              .pageScrollState as PageScrollState,
          },
        } as Parameters<NonNullable<typeof onPageScrollStateChanged>>[0]);
      },
      [onPageScrollStateChanged]
    );

    const normalizedStoryData = useMemo(
      () =>
        storyData !== undefined
          ? normalizeNativeStoryData(storyData)
          : undefined,
      [storyData]
    );

    const normalizedPageMedia = useMemo(
      () =>
        pageMedia?.map((entry) => ({
          ...(entry.enabled !== undefined ? { enabled: entry.enabled } : {}),
          ...(entry.mediaType !== undefined
            ? { mediaType: entry.mediaType }
            : {}),
          ...(entry.uri !== undefined
            ? { uri: resolveMediaUri(entry.uri) }
            : {}),
          ...(entry.posterUri !== undefined
            ? { posterUri: resolveMediaUri(entry.posterUri) }
            : {}),
          ...(entry.muted !== undefined ? { muted: entry.muted } : {}),
        })),
      [pageMedia]
    );

    const resolvedSource = useMemo(() => resolveMediaUri(source), [source]);
    const resolvedImageUri = useMemo(
      () => resolveMediaUri(imageUri),
      [imageUri]
    );
    const resolvedVideoUri = useMemo(
      () => resolveMediaUri(videoUri),
      [videoUri]
    );
    const resolvedPosterUri = useMemo(
      () => resolveMediaUri(posterUri),
      [posterUri]
    );

    return (
      <NativeInstagramStoryView
        ref={nativeRef}
        storyData={normalizedStoryData}
        pageMedia={normalizedPageMedia}
        mediaType={mediaType}
        source={resolvedSource}
        imageUri={resolvedImageUri}
        videoUri={resolvedVideoUri}
        posterUri={resolvedPosterUri}
        paused={paused}
        muted={muted}
        repeat={repeat}
        videoResizeMode={videoResizeMode}
        initialPage={initialPage}
        scrollEnabled={scrollEnabled}
        offscreenPageLimit={offscreenPageLimit}
        perspective={perspective}
        cubeAngle={cubeAngle}
        overScrollMode={overScrollMode}
        onPageScrollStateChanged={
          onPageScrollStateChanged ? handlePageScrollStateChanged : undefined
        }
        {...rest}
      >
        {wrappedChildren}
      </NativeInstagramStoryView>
    );
  }
);

InstagramStoryView.displayName = 'InstagramStoryView';

const styles = StyleSheet.create({
  page: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
});
