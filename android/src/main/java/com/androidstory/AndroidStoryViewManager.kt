package com.androidstory

import android.view.View
import com.facebook.react.bridge.Dynamic
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.AndroidStoryViewManagerDelegate
import com.facebook.react.viewmanagers.AndroidStoryViewManagerInterface
import com.androidstory.events.PageScrollEvent
import com.androidstory.events.PageScrollStateChangedEvent
import com.androidstory.events.PageSelectedEvent
import com.androidstory.events.VideoBufferEvent
import com.androidstory.events.VideoEndEvent
import com.androidstory.events.VideoErrorEvent
import com.androidstory.events.VideoLoadEvent
import com.androidstory.events.VideoProgressEvent

@ReactModule(name = AndroidStoryViewManager.NAME)
class AndroidStoryViewManager :
  ViewGroupManager<AndroidStoryView>(),
  AndroidStoryViewManagerInterface<AndroidStoryView> {

  private val delegate: ViewManagerDelegate<AndroidStoryView> =
    AndroidStoryViewManagerDelegate(this)

  override fun getDelegate(): ViewManagerDelegate<AndroidStoryView> = delegate

  override fun getName(): String = NAME

  override fun createViewInstance(reactContext: ThemedReactContext): AndroidStoryView {
    return AndroidStoryView(reactContext)
  }

  override fun addView(parent: AndroidStoryView, child: View, index: Int) {
    parent.addPage(child, index)
  }

  override fun getChildCount(parent: AndroidStoryView): Int {
    return parent.getPageCount()
  }

  override fun getChildAt(parent: AndroidStoryView, index: Int): View? {
    return parent.getPageAt(index)
  }

  override fun removeViewAt(parent: AndroidStoryView, index: Int) {
    parent.removePageAt(index)
  }

  override fun removeAllViews(parent: AndroidStoryView) {
    parent.removeAllPages()
  }

  override fun needsCustomLayoutForChildren(): Boolean = true

  @ReactProp(name = "storyData")
  override fun setStoryData(view: AndroidStoryView, value: Dynamic) {
    view.setStoryData(value)
  }

  @ReactProp(name = "pageMedia")
  override fun setPageMedia(view: AndroidStoryView, value: Dynamic) {
    view.setPageMedia(value)
  }

  @ReactProp(name = "mediaType")
  override fun setMediaType(view: AndroidStoryView, value: String?) {
    view.setMediaType(value)
  }

  @ReactProp(name = "source")
  override fun setSource(view: AndroidStoryView, value: String?) {
    view.setSource(value)
  }

  @ReactProp(name = "imageUri")
  override fun setImageUri(view: AndroidStoryView, value: String?) {
    view.setImageUri(value)
  }

  @ReactProp(name = "videoUri")
  override fun setVideoUri(view: AndroidStoryView, value: String?) {
    view.setVideoUri(value)
  }

  @ReactProp(name = "posterUri")
  override fun setPosterUri(view: AndroidStoryView, value: String?) {
    view.setPosterUri(value)
  }

  @ReactProp(name = "paused", defaultBoolean = false)
  override fun setPaused(view: AndroidStoryView, value: Boolean) {
    view.setPaused(value)
  }

  @ReactProp(name = "muted", defaultBoolean = false)
  override fun setMuted(view: AndroidStoryView, value: Boolean) {
    view.setMuted(value)
  }

  @ReactProp(name = "repeat", defaultBoolean = false)
  override fun setRepeat(view: AndroidStoryView, value: Boolean) {
    view.setRepeat(value)
  }

  @ReactProp(name = "videoResizeMode")
  override fun setVideoResizeMode(view: AndroidStoryView, value: String?) {
    view.setVideoResizeMode(value)
  }

  @ReactProp(name = "initialPage", defaultInt = 0)
  override fun setInitialPage(view: AndroidStoryView, value: Int) {
    view.setInitialPage(value)
  }

  @ReactProp(name = "scrollEnabled", defaultBoolean = true)
  override fun setScrollEnabled(view: AndroidStoryView, value: Boolean) {
    view.setScrollEnabled(value)
  }

  @ReactProp(name = "offscreenPageLimit", defaultInt = 1)
  override fun setOffscreenPageLimit(view: AndroidStoryView, value: Int) {
    view.setOffscreenPageLimit(value)
  }

  @ReactProp(name = "perspective", defaultFloat = 4.5f)
  override fun setPerspective(view: AndroidStoryView, value: Float) {
    view.setPerspective(value)
  }

  @ReactProp(name = "cubeAngle", defaultFloat = 90f)
  override fun setCubeAngle(view: AndroidStoryView, value: Float) {
    view.setCubeAngle(value)
  }

  @ReactProp(name = "overScrollMode")
  override fun setOverScrollMode(view: AndroidStoryView, value: String?) {
    view.setOverScrollModeValue(value)
  }

  override fun setPage(view: AndroidStoryView, selectedPage: Int) {
    view.setCurrentPage(selectedPage, animated = true)
  }

  override fun setPageWithoutAnimation(view: AndroidStoryView, selectedPage: Int) {
    view.setCurrentPage(selectedPage, animated = false)
  }

  override fun seekVideo(view: AndroidStoryView, position: Int, positionMs: Double) {
    view.seekVideo(position, positionMs)
  }

  override fun onDropViewInstance(view: AndroidStoryView) {
    super.onDropViewInstance(view)
    view.release()
  }

  override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> {
    return mutableMapOf(
      PageSelectedEvent.EVENT_NAME to mapOf("registrationName" to "onPageSelected"),
      PageScrollEvent.EVENT_NAME to mapOf("registrationName" to "onPageScroll"),
      PageScrollStateChangedEvent.EVENT_NAME to mapOf("registrationName" to "onPageScrollStateChanged"),
      VideoLoadEvent.EVENT_NAME to mapOf("registrationName" to "onVideoLoad"),
      VideoProgressEvent.EVENT_NAME to mapOf("registrationName" to "onVideoProgress"),
      VideoBufferEvent.EVENT_NAME to mapOf("registrationName" to "onVideoBuffer"),
      VideoEndEvent.EVENT_NAME to mapOf("registrationName" to "onVideoEnd"),
      VideoErrorEvent.EVENT_NAME to mapOf("registrationName" to "onVideoError")
    )
  }

  companion object {
    const val NAME = "AndroidStoryView"
  }
}
