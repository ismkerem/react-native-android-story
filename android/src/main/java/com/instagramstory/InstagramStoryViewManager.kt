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

  override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> {
    return mutableMapOf(
      PageSelectedEvent.EVENT_NAME to mapOf("registrationName" to "onPageSelected"),
      PageScrollEvent.EVENT_NAME to mapOf("registrationName" to "onPageScroll"),
      PageScrollStateChangedEvent.EVENT_NAME to mapOf("registrationName" to "onPageScrollStateChanged")
    )
  }

  companion object {
    const val NAME = "InstagramStoryView"
  }
}
