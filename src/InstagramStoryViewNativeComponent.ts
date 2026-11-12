import type * as React from 'react';
import {
  codegenNativeCommands,
  codegenNativeComponent,
  type CodegenTypes,
  type HostComponent,
  type ViewProps,
} from 'react-native';

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

export interface NativeProps extends ViewProps {
  initialPage?: CodegenTypes.Int32;
  scrollEnabled?: boolean;
  offscreenPageLimit?: CodegenTypes.Int32;
  perspective?: CodegenTypes.Float;
  cubeAngle?: CodegenTypes.Float;
  overScrollMode?: string;
  onPageSelected?: CodegenTypes.DirectEventHandler<PageSelectedEventData>;
  onPageScroll?: CodegenTypes.DirectEventHandler<PageScrollEventData>;
  onPageScrollStateChanged?: CodegenTypes.DirectEventHandler<PageScrollStateChangedEventData>;
}

type ComponentType = HostComponent<NativeProps>;

export interface NativeCommands {
  setPage: (
    viewRef: React.ElementRef<ComponentType>,
    selectedPage: CodegenTypes.Int32
  ) => void;
  setPageWithoutAnimation: (
    viewRef: React.ElementRef<ComponentType>,
    selectedPage: CodegenTypes.Int32
  ) => void;
}

export const Commands: NativeCommands = codegenNativeCommands<NativeCommands>({
  supportedCommands: ['setPage', 'setPageWithoutAnimation'],
});

export default codegenNativeComponent<NativeProps>('InstagramStoryView');
