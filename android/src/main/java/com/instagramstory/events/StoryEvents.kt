package com.instagramstory.events

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event

class PageSelectedEvent(
  surfaceId: Int,
  viewTag: Int,
  private val position: Int
) : Event<PageSelectedEvent>(surfaceId, viewTag) {

  override fun getEventName(): String = EVENT_NAME

  override fun getEventData(): WritableMap = Arguments.createMap().apply {
    putInt("position", position)
  }

  companion object {
    const val EVENT_NAME = "topPageSelected"
  }
}

class PageScrollEvent(
  surfaceId: Int,
  viewTag: Int,
  private val position: Int,
  private val offset: Double
) : Event<PageScrollEvent>(surfaceId, viewTag) {

  override fun getEventName(): String = EVENT_NAME

  override fun getEventData(): WritableMap = Arguments.createMap().apply {
    putInt("position", position)
    putDouble("offset", offset)
  }

  companion object {
    const val EVENT_NAME = "topPageScroll"
  }
}

class PageScrollStateChangedEvent(
  surfaceId: Int,
  viewTag: Int,
  private val pageScrollState: String
) : Event<PageScrollStateChangedEvent>(surfaceId, viewTag) {

  override fun getEventName(): String = EVENT_NAME

  override fun getEventData(): WritableMap = Arguments.createMap().apply {
    putString("pageScrollState", pageScrollState)
  }

  companion object {
    const val EVENT_NAME = "topPageScrollStateChanged"
  }
}
