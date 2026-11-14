package com.instagramstory

import android.view.View
import com.facebook.react.bridge.Dynamic
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.InstagramStoryViewManagerDelegate
import com.facebook.react.viewmanagers.InstagramStoryViewManagerInterface
import com.instagramstory.events.PageScrollEvent
import com.instagramstory.events.PageScrollStateChangedEvent
import com.instagramstory.events.PageSelectedEvent
import com.instagramstory.events.VideoBufferEvent
import com.instagramstory.events.VideoEndEvent
import com.instagramstory.events.VideoErrorEvent
import com.instagramstory.events.VideoLoadEvent
import com.instagramstory.events.VideoProgressEvent

@ReactModule(name = InstagramStoryViewManager.NAME)
class InstagramStoryViewManager :
  ViewGroupManager<InstagramStoryView>(),
  InstagramStoryViewManagerInterface<InstagramStoryView> {

  private val delegate: ViewManagerDelegate<InstagramStoryView> =
    InstagramStoryViewManagerDelegate(this)

  override fun getDelegate(): ViewManagerDelegate<InstagramStoryView> = delegate

  override fun getName(): String = NAME

  override fun createViewInstance(reactContext: ThemedReactContext): InstagramStoryView {
    return InstagramStoryView(reactContext)
  }

  override fun addView(parent: InstagramStoryView, child: View, index: Int) {
    parent.addPage(child, index)
  }

  override fun getChildCount(parent: InstagramStoryView): Int {
    return parent.getPageCount()
  }

  override fun getChildAt(parent: InstagramStoryView, index: Int): View? {
    return parent.getPageAt(index)
  }

  override fun removeViewAt(parent: InstagramStoryView, index: Int) {
    parent.removePageAt(index)
  }

  override fun removeAllViews(parent: InstagramStoryView) {
    parent.removeAllPages()
  }

  override fun needsCustomLayoutForChildren(): Boolean = true

  @ReactProp(name = "storyData")
  override fun setStoryData(view: InstagramStoryView, value: Dynamic) {
    view.setStoryData(value)
  }

  @ReactProp(name = "pageMedia")
  override fun setPageMedia(view: InstagramStoryView, value: Dynamic) {
    view.setPageMedia(value)
  }

  @ReactProp(name = "mediaType")
  override fun setMediaType(view: InstagramStoryView, value: String?) {
    view.setMediaType(value)
  }

  @ReactProp(name = "source")
  override fun setSource(view: InstagramStoryView, value: String?) {
    view.setSource(value)
  }

  @ReactProp(name = "imageUri")
  override fun setImageUri(view: InstagramStoryView, value: String?) {
    view.setImageUri(value)
  }

  @ReactProp(name = "videoUri")
  override fun setVideoUri(view: InstagramStoryView, value: String?) {
    view.setVideoUri(value)
  }

  @ReactProp(name = "posterUri")
  override fun setPosterUri(view: InstagramStoryView, value: String?) {
    view.setPosterUri(value)
  }

  @ReactProp(name = "paused", defaultBoolean = false)
  override fun setPaused(view: InstagramStoryView, value: Boolean) {
    view.setPaused(value)
  }

  @ReactProp(name = "muted", defaultBoolean = false)
  override fun setMuted(view: InstagramStoryView, value: Boolean) {
    view.setMuted(value)
  }

  @ReactProp(name = "repeat", defaultBoolean = false)
  override fun setRepeat(view: InstagramStoryView, value: Boolean) {
    view.setRepeat(value)
  }

  @ReactProp(name = "videoResizeMode")
  override fun setVideoResizeMode(view: InstagramStoryView, value: String?) {
    view.setVideoResizeMode(value)
  }

  @ReactProp(name = "initialPage", defaultInt = 0)
  override fun setInitialPage(view: InstagramStoryView, value: Int) {
    view.setInitialPage(value)
  }

  @ReactProp(name = "scrollEnabled", defaultBoolean = true)
  override fun setScrollEnabled(view: InstagramStoryView, value: Boolean) {
    view.setScrollEnabled(value)
  }

  @ReactProp(name = "offscreenPageLimit", defaultInt = 1)
  override fun setOffscreenPageLimit(view: InstagramStoryView, value: Int) {
    view.setOffscreenPageLimit(value)
  }

  @ReactProp(name = "perspective", defaultFloat = 4.5f)
  override fun setPerspective(view: InstagramStoryView, value: Float) {
    view.setPerspective(value)
  }

  @ReactProp(name = "cubeAngle", defaultFloat = 90f)
  override fun setCubeAngle(view: InstagramStoryView, value: Float) {
    view.setCubeAngle(value)
  }

  @ReactProp(name = "overScrollMode")
  override fun setOverScrollMode(view: InstagramStoryView, value: String?) {
    view.setOverScrollModeValue(value)
  }

  override fun setPage(view: InstagramStoryView, selectedPage: Int) {
    view.setCurrentPage(selectedPage, animated = true)
  }

  override fun setPageWithoutAnimation(view: InstagramStoryView, selectedPage: Int) {
    view.setCurrentPage(selectedPage, animated = false)
  }

  override fun seekVideo(view: InstagramStoryView, position: Int, positionMs: Double) {
    view.seekVideo(position, positionMs)
  }

  override fun onDropViewInstance(view: InstagramStoryView) {
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
    const val NAME = "InstagramStoryView"
  }
}
