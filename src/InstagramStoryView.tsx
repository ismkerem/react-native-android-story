import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import type { InstagramStoryViewProps, InstagramStoryViewRef } from './types';

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
    { children, storyData: _storyData, initialPage = 0, style, ...rest },
    ref
  ) => {
    const childArray = React.Children.toArray(children);
    const [currentPage, setCurrentPage] = React.useState(initialPage);

    React.useImperativeHandle(
      ref,
      () => ({
        setPage(selectedPage: number) {
          if (selectedPage >= 0 && selectedPage < childArray.length) {
            setCurrentPage(selectedPage);
          }
        },
        setPageWithoutAnimation(selectedPage: number) {
          if (selectedPage >= 0 && selectedPage < childArray.length) {
            setCurrentPage(selectedPage);
          }
        },
      }),
      [childArray.length]
    );

    return (
      <View {...rest} style={[styles.container, style]}>
        {childArray[currentPage] ?? null}
      </View>
    );
  }
);

InstagramStoryView.displayName = 'InstagramStoryView';

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
