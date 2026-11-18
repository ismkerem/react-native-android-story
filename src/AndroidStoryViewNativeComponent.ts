import type * as React from 'react';
import {
  codegenNativeCommands,
  codegenNativeComponent,
  type CodegenTypes,
  type HostComponent,
  type ViewProps,
} from 'react-native';
/**
 *
 * CODEGEN
 */
export type PageSelectedEventData = Readonly<{
  position: CodegenTypes.Int32;
}>;

export type PageScrollEventData = Readonly<{
  position: CodegenTypes.Int32;
  offset: CodegenTypes.Double;
}>;

export type PageScrollStateChangedEventData = Readonly<{
  pageScrollState: string;
}>;

export type VideoLoadEventData = Readonly<{
  position: CodegenTypes.Int32;
  duration: CodegenTypes.Double;
  width: CodegenTypes.Int32;
  height: CodegenTypes.Int32;
}>;

export type VideoProgressEventData = Readonly<{
  position: CodegenTypes.Int32;
  currentTime: CodegenTypes.Double;
  duration: CodegenTypes.Double;
}>;

export type VideoBufferEventData = Readonly<{
  position: CodegenTypes.Int32;
  isBuffering: boolean;
}>;

export type VideoEndEventData = Readonly<{
  position: CodegenTypes.Int32;
  finished: boolean;
}>;

export type VideoErrorEventData = Readonly<{
  position: CodegenTypes.Int32;
  message: string;
}>;

export interface NativeProps extends ViewProps {
  storyData?: CodegenTypes.UnsafeMixed;
  pageMedia?: CodegenTypes.UnsafeMixed;
  mediaType?: string;
  source?: string;
  imageUri?: string;
  videoUri?: string;
  posterUri?: string;
  paused?: boolean;
  muted?: boolean;
  repeat?: boolean;
  videoResizeMode?: string;
  initialPage?: CodegenTypes.Int32;
  scrollEnabled?: boolean;
  offscreenPageLimit?: CodegenTypes.Int32;
  perspective?: CodegenTypes.Float;
  cubeAngle?: CodegenTypes.Float;
  overScrollMode?: string;
  onPageSelected?: CodegenTypes.DirectEventHandler<PageSelectedEventData>;
  onPageScroll?: CodegenTypes.DirectEventHandler<PageScrollEventData>;
  onPageScrollStateChanged?: CodegenTypes.DirectEventHandler<PageScrollStateChangedEventData>;
  onVideoLoad?: CodegenTypes.DirectEventHandler<VideoLoadEventData>;
  onVideoProgress?: CodegenTypes.DirectEventHandler<VideoProgressEventData>;
  onVideoBuffer?: CodegenTypes.DirectEventHandler<VideoBufferEventData>;
  onVideoEnd?: CodegenTypes.DirectEventHandler<VideoEndEventData>;
  onVideoError?: CodegenTypes.DirectEventHandler<VideoErrorEventData>;
}

type ComponentType = HostComponent<NativeProps>;

export interface NativeCommands {
  setPage: (
    viewRef: React.ComponentRef<ComponentType>,
    selectedPage: CodegenTypes.Int32
  ) => void;
  setPageWithoutAnimation: (
    viewRef: React.ComponentRef<ComponentType>,
    selectedPage: CodegenTypes.Int32
  ) => void;
  seekVideo: (
    viewRef: React.ComponentRef<ComponentType>,
    position: CodegenTypes.Int32,
    positionMs: CodegenTypes.Double
  ) => void;
}

export const Commands: NativeCommands = codegenNativeCommands<NativeCommands>({
  supportedCommands: ['setPage', 'setPageWithoutAnimation', 'seekVideo'],
});

export default codegenNativeComponent<NativeProps>('AndroidStoryView');
