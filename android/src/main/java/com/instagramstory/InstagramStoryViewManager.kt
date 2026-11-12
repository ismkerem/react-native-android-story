package com.instagramstory

import android.graphics.Color
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.InstagramStoryViewManagerInterface
import com.facebook.react.viewmanagers.InstagramStoryViewManagerDelegate

@ReactModule(name = InstagramStoryViewManager.NAME)
class InstagramStoryViewManager : SimpleViewManager<InstagramStoryView>(),
  InstagramStoryViewManagerInterface<InstagramStoryView> {
  private val mDelegate: ViewManagerDelegate<InstagramStoryView>

  init {
    mDelegate = InstagramStoryViewManagerDelegate(this)
  }

  override fun getDelegate(): ViewManagerDelegate<InstagramStoryView>? {
    return mDelegate
  }

  override fun getName(): String {
    return NAME
  }

  public override fun createViewInstance(context: ThemedReactContext): InstagramStoryView {
    return InstagramStoryView(context)
  }

  @ReactProp(name = "color")
  override fun setColor(view: InstagramStoryView?, color: Int?) {
    view?.setBackgroundColor(color ?: Color.TRANSPARENT)
  }

  companion object {
    const val NAME = "InstagramStoryView"
  }
}
