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

class VideoLoadEvent(
  surfaceId: Int,
  viewTag: Int,
  private val position: Int,
  private val duration: Double,
  private val width: Int,
  private val height: Int
) : Event<VideoLoadEvent>(surfaceId, viewTag) {

  override fun getEventName(): String = EVENT_NAME

  override fun getEventData(): WritableMap = Arguments.createMap().apply {
    putInt("position", position)
    putDouble("duration", duration)
    putInt("width", width)
    putInt("height", height)
  }

  companion object {
    const val EVENT_NAME = "topVideoLoad"
  }
}

class VideoProgressEvent(
  surfaceId: Int,
  viewTag: Int,
  private val position: Int,
  private val currentTime: Double,
  private val duration: Double
) : Event<VideoProgressEvent>(surfaceId, viewTag) {

  override fun getEventName(): String = EVENT_NAME

  override fun getEventData(): WritableMap = Arguments.createMap().apply {
    putInt("position", position)
    putDouble("currentTime", currentTime)
    putDouble("duration", duration)
  }

  companion object {
    const val EVENT_NAME = "topVideoProgress"
  }
}

class VideoBufferEvent(
  surfaceId: Int,
  viewTag: Int,
  private val position: Int,
  private val isBuffering: Boolean
) : Event<VideoBufferEvent>(surfaceId, viewTag) {

  override fun getEventName(): String = EVENT_NAME

  override fun getEventData(): WritableMap = Arguments.createMap().apply {
    putInt("position", position)
    putBoolean("isBuffering", isBuffering)
  }

  companion object {
    const val EVENT_NAME = "topVideoBuffer"
  }
}

class VideoEndEvent(
  surfaceId: Int,
  viewTag: Int,
  private val position: Int,
  private val finished: Boolean = true
) : Event<VideoEndEvent>(surfaceId, viewTag) {

  override fun getEventName(): String = EVENT_NAME

  override fun getEventData(): WritableMap = Arguments.createMap().apply {
    putInt("position", position)
    putBoolean("finished", finished)
  }

  companion object {
    const val EVENT_NAME = "topVideoEnd"
  }
}

class VideoErrorEvent(
  surfaceId: Int,
  viewTag: Int,
  private val position: Int,
  private val message: String
) : Event<VideoErrorEvent>(surfaceId, viewTag) {

  override fun getEventName(): String = EVENT_NAME

  override fun getEventData(): WritableMap = Arguments.createMap().apply {
    putInt("position", position)
    putString("message", message)
  }

  companion object {
    const val EVENT_NAME = "topVideoError"
  }
}
