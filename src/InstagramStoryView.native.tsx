import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import NativeInstagramStoryView, {
  Commands,
} from './InstagramStoryViewNativeComponent';
import { normalizeNativeStoryData } from './resolveImageUri';
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
} from './types';

export const InstagramStoryView = React.forwardRef<
  InstagramStoryViewRef,
  InstagramStoryViewProps
>(
  (
    {
      children,
      storyData,
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
      React.useRef<React.ComponentRef<typeof NativeInstagramStoryView>>(null);

    React.useImperativeHandle(
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
      }),
      []
    );

    const wrappedChildren = React.useMemo(
      () =>
        React.Children.toArray(children).map((child, index) => {
          const key =
            React.isValidElement(child) && child.key != null
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

    const handlePageScrollStateChanged = React.useCallback(
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

    const normalizedStoryData = React.useMemo(
      () =>
        storyData !== undefined
          ? normalizeNativeStoryData(storyData)
          : undefined,
      [storyData]
    );

    return (
      <NativeInstagramStoryView
        ref={nativeRef}
        storyData={normalizedStoryData}
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
