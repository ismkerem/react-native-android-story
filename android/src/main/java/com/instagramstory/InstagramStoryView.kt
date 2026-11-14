package com.instagramstory

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.SurfaceTexture
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.util.Base64
import android.util.LruCache
import android.view.MotionEvent
import android.view.Surface
import android.view.TextureView
import android.view.View
import android.view.ViewConfiguration
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.ImageView
import androidx.recyclerview.widget.RecyclerView
import androidx.viewpager2.widget.ViewPager2
import com.facebook.react.bridge.Dynamic
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.facebook.react.uimanager.UIManagerHelper
import com.instagramstory.events.PageScrollEvent
import com.instagramstory.events.PageScrollStateChangedEvent
import com.instagramstory.events.PageSelectedEvent
import com.instagramstory.events.VideoBufferEvent
import com.instagramstory.events.VideoEndEvent
import com.instagramstory.events.VideoErrorEvent
import com.instagramstory.events.VideoLoadEvent
import com.instagramstory.events.VideoProgressEvent
import java.net.HttpURLConnection
import java.net.URL
import java.util.IdentityHashMap
import java.util.concurrent.Executors
import kotlin.math.abs
import kotlin.math.max

class InstagramStoryView(context: Context) : FrameLayout(context), LifecycleEventListener {

  private enum class GestureAxis {
    NONE,
    HORIZONTAL,
    VERTICAL
  }

  private enum class MediaKind {
    NONE,
    IMAGE,
    VIDEO
  }

  private data class PageMediaConfig(
    val enabled: Boolean?,
    val mediaType: String?,
    val uri: String?,
    val posterUri: String?,
    val muted: Boolean?
  )

  private data class ResolvedPageMedia(
    val kind: MediaKind,
    val uri: String? = null,
    val posterUri: String? = null,
    val muted: Boolean = false
  )

  private enum class PlayerState {
    IDLE,
    PREPARING,
    PREPARED,
    STARTED,
    PAUSED,
    COMPLETED,
    ERROR,
    RELEASED
  }

  private val pages = mutableListOf<View>()
  private val pageIds = IdentityHashMap<View, Long>()
  private var nextPageId = 1L

  private val pageMediaConfigs = mutableListOf<PageMediaConfig>()
  private var storyData: StoryDataPayload? = null

  private var mediaTypeProp: String? = null
  private var sourceProp: String? = null
  private var imageUriProp: String? = null
  private var videoUriProp: String? = null
  private var posterUriProp: String? = null
  private var pausedProp = false
  private var mutedProp = false
  private var repeatProp = false
  private var videoResizeModeProp = "cover"

  private var initialPageIndex = 0
  private var hasAppliedInitialPage = false
  private var currentPageIndex = 0
  private var perspectiveMultiplier = DEFAULT_PERSPECTIVE
  private var cubeRotationAngle = DEFAULT_CUBE_ANGLE
  private var scrollEnabledProp = true
  private var hostLifecyclePaused = false
  private var isViewAttached = false
  private var isReleased = false

  private val boundHolders = LinkedHashSet<PageViewHolder>()
  private var usingReactChildren = false

  private val touchSlop = ViewConfiguration.get(context).scaledTouchSlop
  private var downX = 0f
  private var downY = 0f
  private var gestureAxis = GestureAxis.NONE

  private val mainHandler = Handler(Looper.getMainLooper())
  private val viewPager: ViewPager2
  private val pagerAdapter = StoryPagerAdapter()

  private var isLayoutEnqueued = false
  private val measureAndLayout = Runnable {
    isLayoutEnqueued = false
    if (width > 0 && height > 0) {
      measure(
        MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
        MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY)
      )
      layout(left, top, right, bottom)
    }
  }

  private val cubePageTransformer = ViewPager2.PageTransformer { page, position ->
    val pageWidth = page.width
    val pageHeight = page.height
    if (pageWidth <= 0 || pageHeight <= 0) return@PageTransformer

    val density = page.resources.displayMetrics.density
    val safePerspective = if (perspectiveMultiplier > 0f) perspectiveMultiplier else DEFAULT_PERSPECTIVE
    page.cameraDistance = max(pageWidth * safePerspective, DEFAULT_MIN_CAMERA_DISTANCE * density)

    when {
      position < -1f || position > 1f -> {
        page.alpha = 0f
        page.rotationY = 0f
        page.pivotX = pageWidth * 0.5f
        page.pivotY = pageHeight * 0.5f
      }
      position <= 0f -> {
        page.alpha = 1f
        page.pivotX = pageWidth.toFloat()
        page.pivotY = pageHeight * 0.5f
        page.rotationY = cubeRotationAngle * position
      }
      else -> {
        page.alpha = 1f
        page.pivotX = 0f
        page.pivotY = pageHeight * 0.5f
        page.rotationY = cubeRotationAngle * position
      }
    }
  }

  init {
    clipChildren = false
    clipToPadding = false
    (context as? ReactContext)?.addLifecycleEventListener(this)

    viewPager = ViewPager2(context).apply {
      orientation = ViewPager2.ORIENTATION_HORIZONTAL
      offscreenPageLimit = 1
      clipChildren = false
      clipToPadding = false
      adapter = pagerAdapter
      setPageTransformer(cubePageTransformer)

      // Disable overscroll glow and clipping on internal RecyclerView
      (getChildAt(0) as? RecyclerView)?.apply {
        clipChildren = false
        clipToPadding = false
        overScrollMode = OVER_SCROLL_NEVER
      }

      registerOnPageChangeCallback(object : ViewPager2.OnPageChangeCallback() {
        override fun onPageSelected(position: Int) {
          currentPageIndex = position
          refreshBoundHoldersPlayback()
          dispatchEvent(PageSelectedEvent(getSurfaceId(), this@InstagramStoryView.id, position))
        }

        override fun onPageScrolled(
          position: Int,
          positionOffset: Float,
          positionOffsetPixels: Int
        ) {
          dispatchEvent(
            PageScrollEvent(
              getSurfaceId(),
              this@InstagramStoryView.id,
              position,
              positionOffset.toDouble()
            )
          )
        }

        override fun onPageScrollStateChanged(state: Int) {
          val stateName = when (state) {
            ViewPager2.SCROLL_STATE_DRAGGING -> "dragging"
            ViewPager2.SCROLL_STATE_SETTLING -> "settling"
            else -> "idle"
          }
          dispatchEvent(
            PageScrollStateChangedEvent(getSurfaceId(), this@InstagramStoryView.id, stateName)
          )
        }
      })
    }

    addView(
      viewPager,
      LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
    )
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    isViewAttached = true
    refreshBoundHoldersPlayback()
  }

  override fun onDetachedFromWindow() {
    isViewAttached = false
    for (holder in boundHolders) {
      holder.mediaController.pausePlayback()
    }
    super.onDetachedFromWindow()
  }

  override fun onHostResume() {
    hostLifecyclePaused = false
    refreshBoundHoldersPlayback()
  }

  override fun onHostPause() {
    hostLifecyclePaused = true
    for (holder in boundHolders) {
      holder.mediaController.pausePlayback()
    }
  }

  override fun onHostDestroy() {
    release()
  }

  override fun dispatchTouchEvent(ev: MotionEvent): Boolean {
    when (ev.actionMasked) {
      MotionEvent.ACTION_DOWN -> {
        downX = ev.x
        downY = ev.y
        gestureAxis = GestureAxis.NONE
        viewPager.isUserInputEnabled = scrollEnabledProp
      }
      MotionEvent.ACTION_MOVE -> {
        if (gestureAxis == GestureAxis.NONE) {
          val dx = abs(ev.x - downX)
          val dy = abs(ev.y - downY)
          if (dx > touchSlop || dy > touchSlop) {
            if (dy > dx * 1.1f) {
              gestureAxis = GestureAxis.VERTICAL
              viewPager.isUserInputEnabled = false
            } else {
              gestureAxis = GestureAxis.HORIZONTAL
            }
          }
        }
      }
      MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
        gestureAxis = GestureAxis.NONE
        viewPager.isUserInputEnabled = scrollEnabledProp
      }
    }
    return super.dispatchTouchEvent(ev)
  }

  override fun requestLayout() {
    super.requestLayout()
    if (!isLayoutEnqueued && width > 0 && height > 0) {
      isLayoutEnqueued = true
      post(measureAndLayout)
    }
  }

  fun addPage(child: View, index: Int) {
    val switchedMode = !usingReactChildren
    usingReactChildren = true
    val insertIndex = index.coerceIn(0, pages.size)
    pageIds[child] = nextPageId++
    pages.add(insertIndex, child)
    if (switchedMode) {
      pagerAdapter.notifyDataSetChanged()
    } else {
      pagerAdapter.notifyItemInserted(insertIndex)
    }
    applyInitialPageIfReady()
    requestLayout()
  }

  fun getPageCount(): Int = pages.size

  fun getPageAt(index: Int): View? = pages.getOrNull(index)

  fun removePageAt(index: Int) {
    if (index !in 0 until pages.size) return
    val removed = pages.removeAt(index)
    pageIds.remove(removed)
    (removed.parent as? ViewGroup)?.removeView(removed)
    if (pages.isEmpty() && getEffectivePageCount() > 0) {
      usingReactChildren = false
      pagerAdapter.notifyDataSetChanged()
    } else {
      usingReactChildren = pages.isNotEmpty()
      pagerAdapter.notifyItemRemoved(index)
    }
    requestLayout()
  }

  fun removeAllPages() {
    for (page in pages) {
      (page.parent as? ViewGroup)?.removeView(page)
    }
    pages.clear()
    pageIds.clear()
    usingReactChildren = false
    pagerAdapter.notifyDataSetChanged()
    requestLayout()
  }

  fun setStoryData(value: Dynamic) {
    storyData = StoryDataParser.parse(value)
    if (!usingReactChildren) {
      pagerAdapter.notifyDataSetChanged()
      applyInitialPageIfReady()
    } else {
      refreshBoundHoldersMedia()
    }
  }

  fun getStoryData(): StoryDataPayload? = storyData

  fun setPageMedia(value: Dynamic) {
    pageMediaConfigs.clear()
    if (!value.isNull && value.type == ReadableType.Array) {
      val array: ReadableArray? = value.asArray()
      if (array != null) {
        for (i in 0 until array.size()) {
          if (array.getType(i) == ReadableType.Map) {
            val map = array.getMap(i)
            if (map != null) {
              pageMediaConfigs.add(parsePageMediaEntry(map))
            } else {
              pageMediaConfigs.add(PageMediaConfig(enabled = false, mediaType = null, uri = null, posterUri = null, muted = null))
            }
          } else {
            pageMediaConfigs.add(PageMediaConfig(enabled = false, mediaType = null, uri = null, posterUri = null, muted = null))
          }
        }
      }
    }
    if (!usingReactChildren) {
      pagerAdapter.notifyDataSetChanged()
      applyInitialPageIfReady()
    } else {
      refreshBoundHoldersMedia()
    }
  }

  fun setMediaType(value: String?) {
    val normalized = value?.trim()?.lowercase()?.takeIf { it.isNotEmpty() }
    if (mediaTypeProp != normalized) {
      mediaTypeProp = normalized
      onStandaloneMediaPropChanged()
    }
  }

  fun setSource(value: String?) {
    val normalized = value?.trim()?.takeIf { it.isNotEmpty() }
    if (sourceProp != normalized) {
      sourceProp = normalized
      onStandaloneMediaPropChanged()
    }
  }

  fun setImageUri(value: String?) {
    val normalized = value?.trim()?.takeIf { it.isNotEmpty() }
    if (imageUriProp != normalized) {
      imageUriProp = normalized
      onStandaloneMediaPropChanged()
    }
  }

  fun setVideoUri(value: String?) {
    val normalized = value?.trim()?.takeIf { it.isNotEmpty() }
    if (videoUriProp != normalized) {
      videoUriProp = normalized
      onStandaloneMediaPropChanged()
    }
  }

  fun setPosterUri(value: String?) {
    val normalized = value?.trim()?.takeIf { it.isNotEmpty() }
    if (posterUriProp != normalized) {
      posterUriProp = normalized
      refreshBoundHoldersMedia()
    }
  }

  fun setPaused(paused: Boolean) {
    if (pausedProp != paused) {
      pausedProp = paused
      refreshBoundHoldersPlayback()
    }
  }

  fun setMuted(muted: Boolean) {
    if (mutedProp != muted) {
      mutedProp = muted
      refreshBoundHoldersMedia()
    }
  }

  fun setRepeat(repeat: Boolean) {
    if (repeatProp != repeat) {
      repeatProp = repeat
      refreshBoundHoldersMedia()
    }
  }

  fun setVideoResizeMode(mode: String?) {
    val normalized = when (mode?.lowercase()) {
      "contain" -> "contain"
      "stretch" -> "stretch"
      else -> "cover"
    }
    if (videoResizeModeProp != normalized) {
      videoResizeModeProp = normalized
      refreshBoundHoldersMedia()
    }
  }

  fun setInitialPage(page: Int) {
    initialPageIndex = max(0, page)
    applyInitialPageIfReady()
  }

  fun setScrollEnabled(enabled: Boolean) {
    scrollEnabledProp = enabled
    if (gestureAxis != GestureAxis.VERTICAL) {
      viewPager.isUserInputEnabled = enabled
    }
  }

  fun setOffscreenPageLimit(limit: Int) {
    // Keep at least 1 offscreen page so 3D cube edges are always mounted before swipe starts
    viewPager.offscreenPageLimit = max(1, limit)
  }

  fun setPerspective(value: Float) {
    perspectiveMultiplier = if (value > 0f) value else DEFAULT_PERSPECTIVE
    viewPager.requestTransform()
  }

  fun setCubeAngle(angle: Float) {
    cubeRotationAngle = angle
    viewPager.requestTransform()
  }

  fun setOverScrollModeValue(mode: String?) {
    val androidMode = when (mode) {
      "always" -> OVER_SCROLL_ALWAYS
      "auto" -> OVER_SCROLL_IF_CONTENT_SCROLLS
      else -> OVER_SCROLL_NEVER
    }
    (viewPager.getChildAt(0) as? RecyclerView)?.overScrollMode = androidMode
  }

  fun setCurrentPage(selectedPage: Int, animated: Boolean) {
    val count = getEffectivePageCount()
    if (selectedPage in 0 until count) {
      currentPageIndex = selectedPage
      viewPager.setCurrentItem(selectedPage, animated)
      refreshBoundHoldersPlayback()
    }
  }

  fun seekVideo(position: Int, positionMs: Double) {
    val clamped = max(0L, positionMs.toLong())
    for (holder in boundHolders) {
      if (holder.boundPosition == position) {
        holder.mediaController.seekTo(clamped)
      }
    }
  }

  fun release() {
    if (isReleased) return
    isReleased = true
    (context as? ReactContext)?.removeLifecycleEventListener(this)
    for (holder in boundHolders) {
      holder.mediaController.release()
    }
    boundHolders.clear()
  }

  private fun onStandaloneMediaPropChanged() {
    if (!usingReactChildren) {
      pagerAdapter.notifyDataSetChanged()
      applyInitialPageIfReady()
    } else {
      refreshBoundHoldersMedia()
    }
  }

  private fun applyInitialPageIfReady() {
    val count = getEffectivePageCount()
    if (!hasAppliedInitialPage && initialPageIndex < count) {
      hasAppliedInitialPage = true
      currentPageIndex = initialPageIndex
      if (initialPageIndex > 0) {
        viewPager.setCurrentItem(initialPageIndex, false)
      }
      refreshBoundHoldersPlayback()
    }
  }

  private fun hasDirectMediaProps(): Boolean {
    return mediaTypeProp != null ||
      sourceProp != null ||
      imageUriProp != null ||
      videoUriProp != null
  }

  private fun getEffectivePageCount(): Int {
    return when {
      pages.isNotEmpty() -> pages.size
      pageMediaConfigs.isNotEmpty() -> pageMediaConfigs.size
      storyData?.groups?.isNotEmpty() == true -> storyData!!.groups.size
      hasDirectMediaProps() -> 1
      else -> 0
    }
  }

  private fun refreshBoundHoldersMedia() {
    for (holder in boundHolders) {
      bindMediaForHolder(holder)
    }
  }

  private fun refreshBoundHoldersPlayback() {
    for (holder in boundHolders) {
      holder.mediaController.updatePlaybackState(shouldPagePlay(holder.boundPosition))
    }
  }

  private fun shouldPagePlay(position: Int): Boolean {
    return position >= 0 &&
      position == currentPageIndex &&
      !pausedProp &&
      !hostLifecyclePaused &&
      isViewAttached &&
      !isReleased
  }

  private fun bindMediaForHolder(holder: PageViewHolder) {
    val pos = holder.boundPosition
    if (pos < 0) return
    val resolved = resolveMediaForPosition(pos)
    holder.mediaController.configure(
      position = pos,
      media = resolved,
      resizeMode = videoResizeModeProp,
      repeat = repeatProp,
      shouldPlay = shouldPagePlay(pos)
    )
  }

  private fun parsePageMediaEntry(map: ReadableMap): PageMediaConfig {
    val enabled = if (map.hasKey("enabled") && map.getType("enabled") == ReadableType.Boolean) {
      map.getBoolean("enabled")
    } else {
      null
    }
    val mediaType = readString(map, "mediaType")?.lowercase()
    val uri = readString(map, "uri")
    val posterUri = readString(map, "posterUri")
    val muted = if (map.hasKey("muted") && map.getType("muted") == ReadableType.Boolean) {
      map.getBoolean("muted")
    } else {
      null
    }
    return PageMediaConfig(
      enabled = enabled,
      mediaType = mediaType,
      uri = uri,
      posterUri = posterUri,
      muted = muted
    )
  }

  private fun readString(map: ReadableMap, key: String): String? {
    if (!map.hasKey(key) || map.isNull(key)) return null
    return if (map.getType(key) == ReadableType.String) {
      map.getString(key)?.trim()?.takeIf { it.isNotEmpty() }
    } else {
      null
    }
  }

  private fun resolveMediaForPosition(position: Int): ResolvedPageMedia {
    val pageEntry = pageMediaConfigs.getOrNull(position)
    if (pageEntry != null) {
      if (pageEntry.enabled == false) {
        return ResolvedPageMedia(MediaKind.NONE)
      }
      if (
        pageEntry.enabled == true ||
        pageEntry.uri != null ||
        pageEntry.mediaType != null ||
        pageEntry.posterUri != null
      ) {
        val kind = when (pageEntry.mediaType) {
          "video" -> MediaKind.VIDEO
          "image" -> MediaKind.IMAGE
          else -> if (isVideoUri(pageEntry.uri)) MediaKind.VIDEO else MediaKind.IMAGE
        }
        return ResolvedPageMedia(
          kind = kind,
          uri = pageEntry.uri,
          posterUri = pageEntry.posterUri,
          muted = pageEntry.muted ?: mutedProp
        )
      }
    }

    if (hasDirectMediaProps() && position == 0) {
      val isVideo = mediaTypeProp == "video" ||
        (mediaTypeProp == null && (videoUriProp != null || isVideoUri(sourceProp)))
      return if (isVideo) {
        ResolvedPageMedia(
          kind = MediaKind.VIDEO,
          uri = videoUriProp ?: sourceProp,
          posterUri = posterUriProp ?: imageUriProp,
          muted = mutedProp
        )
      } else {
        ResolvedPageMedia(
          kind = MediaKind.IMAGE,
          uri = imageUriProp ?: sourceProp ?: posterUriProp,
          posterUri = posterUriProp,
          muted = mutedProp
        )
      }
    }

    if (pages.isEmpty()) {
      val group = storyData?.groups?.getOrNull(position)
      if (group != null) {
        val firstItem = group.items.firstOrNull()
        val rawType = (group.type ?: firstItem?.type)?.lowercase()
        val videoCandidate = group.videoUri ?: firstItem?.videoUri
        val imageCandidate = group.imageUri ?: firstItem?.imageUri
        val posterCandidate = group.posterUri ?: firstItem?.posterUri
        val isVideo = rawType == "video" ||
          (rawType == null && (videoCandidate != null || isVideoUri(imageCandidate)))
        return if (isVideo) {
          ResolvedPageMedia(
            kind = MediaKind.VIDEO,
            uri = videoCandidate ?: imageCandidate,
            posterUri = posterCandidate ?: imageCandidate,
            muted = mutedProp
          )
        } else {
          ResolvedPageMedia(
            kind = MediaKind.IMAGE,
            uri = imageCandidate,
            posterUri = posterCandidate,
            muted = mutedProp
          )
        }
      }
    }

    return ResolvedPageMedia(MediaKind.NONE)
  }

  private fun isVideoUri(uri: String?): Boolean {
    if (uri.isNullOrBlank()) return false
    val clean = uri.substringBefore('?').substringBefore('#').lowercase()
    return VIDEO_EXTENSIONS.any { ext -> clean.endsWith(ext) }
  }

  private fun getSurfaceId(): Int = UIManagerHelper.getSurfaceId(this)

  private fun dispatchEvent(event: com.facebook.react.uimanager.events.Event<*>) {
    val reactContext = context as? ReactContext ?: return
    UIManagerHelper.getEventDispatcher(reactContext)?.dispatchEvent(event)
  }

  private inner class PageViewHolder(
    val container: FrameLayout,
    val mediaLayer: FrameLayout,
    val reactLayer: FrameLayout,
    val mediaController: PageMediaController
  ) : RecyclerView.ViewHolder(container) {
    var boundPosition: Int = RecyclerView.NO_POSITION
  }

  private inner class PageMediaController(
    private val mediaLayer: FrameLayout
  ) : TextureView.SurfaceTextureListener {

    private var boundPosition: Int = RecyclerView.NO_POSITION
    private var currentKind: MediaKind = MediaKind.NONE
    private var currentUri: String? = null
    private var currentPosterUri: String? = null
    private var currentResizeMode: String = "cover"
    private var currentMuted: Boolean = false
    private var currentRepeat: Boolean = false
    private var wantsToPlay: Boolean = false

    private var imageView: ImageView? = null
    private var posterImageView: ImageView? = null
    private var textureView: TextureView? = null
    private var surface: Surface? = null
    private var mediaPlayer: MediaPlayer? = null
    private var playerState: PlayerState = PlayerState.IDLE

    private var videoWidth: Int = 0
    private var videoHeight: Int = 0
    private var durationMs: Int = 0
    private var pendingSeekMs: Long? = null
    private var videoFrameRendered = false
    private var expectedImageRequestUri: String? = null
    private var expectedPosterRequestUri: String? = null

    private val progressRunnable = object : Runnable {
      override fun run() {
        val mp = mediaPlayer
        if (
          mp != null &&
          playerState == PlayerState.STARTED &&
          boundPosition >= 0 &&
          !isReleased
        ) {
          val posMs = runCatching { mp.currentPosition }.getOrDefault(0).coerceAtLeast(0)
          val durMs = durationMs.takeIf { it > 0 } ?: runCatching { mp.duration }.getOrDefault(0).coerceAtLeast(0)
          if (posMs > 0 && !videoFrameRendered) {
            hidePosterAfterRender()
          }
          dispatchEvent(
            VideoProgressEvent(
              getSurfaceId(),
              this@InstagramStoryView.id,
              boundPosition,
              posMs.toDouble(),
              durMs.toDouble()
            )
          )
          mainHandler.postDelayed(this, PROGRESS_INTERVAL_MS)
        }
      }
    }

    fun configure(
      position: Int,
      media: ResolvedPageMedia,
      resizeMode: String,
      repeat: Boolean,
      shouldPlay: Boolean
    ) {
      boundPosition = position
      currentResizeMode = resizeMode
      currentMuted = media.muted
      currentRepeat = repeat
      wantsToPlay = shouldPlay

      if (media.kind == MediaKind.NONE) {
        clearMediaViews()
        return
      }

      mediaLayer.visibility = View.VISIBLE

      if (media.kind == MediaKind.IMAGE) {
        releaseVideoResources()
        ensureImageMode(media.uri)
        return
      }

      // MediaKind.VIDEO
      removeStandaloneImageView()
      mediaLayer.setBackgroundColor(Color.BLACK)
      ensurePosterView(media.posterUri)
      ensureTextureView()

      if (currentKind != MediaKind.VIDEO || currentUri != media.uri) {
        currentKind = MediaKind.VIDEO
        currentUri = media.uri
        prepareVideoSource(media.uri)
      } else {
        applyPlayerOptions()
        applyVideoTransform()
        updatePlaybackState(shouldPlay)
      }
    }

    fun updatePlaybackState(shouldPlay: Boolean) {
      wantsToPlay = shouldPlay
      if (currentKind != MediaKind.VIDEO) return
      val mp = mediaPlayer ?: return

      if (shouldPlay) {
        when (playerState) {
          PlayerState.PREPARED, PlayerState.PAUSED, PlayerState.COMPLETED -> {
            runCatching {
              mp.start()
              playerState = PlayerState.STARTED
              startProgressLoop()
            }
          }
          else -> Unit
        }
      } else {
        if (playerState == PlayerState.STARTED) {
          runCatching {
            if (mp.isPlaying) {
              mp.pause()
            }
          }
          playerState = PlayerState.PAUSED
          stopProgressLoop()
        }
      }
    }

    fun pausePlayback() {
      wantsToPlay = false
      if (playerState == PlayerState.STARTED) {
        runCatching {
          if (mediaPlayer?.isPlaying == true) {
            mediaPlayer?.pause()
          }
        }
        playerState = PlayerState.PAUSED
      }
      stopProgressLoop()
    }

    fun seekTo(positionMs: Long) {
      if (currentKind != MediaKind.VIDEO) return
      val clamped = max(0L, positionMs)
      val mp = mediaPlayer
      if (
        mp != null &&
        (playerState == PlayerState.PREPARED ||
          playerState == PlayerState.STARTED ||
          playerState == PlayerState.PAUSED ||
          playerState == PlayerState.COMPLETED)
      ) {
        pendingSeekMs = null
        runCatching { mp.seekTo(clamped.toInt()) }
      } else {
        pendingSeekMs = clamped
      }
    }

    fun release() {
      boundPosition = RecyclerView.NO_POSITION
      clearMediaViews()
    }

    private fun clearMediaViews() {
      currentKind = MediaKind.NONE
      currentUri = null
      currentPosterUri = null
      expectedImageRequestUri = null
      expectedPosterRequestUri = null
      releaseVideoResources()
      removeStandaloneImageView()
      mediaLayer.setBackgroundColor(Color.TRANSPARENT)
      mediaLayer.visibility = View.GONE
    }

    private fun ensureImageMode(uri: String?) {
      currentKind = MediaKind.IMAGE
      currentUri = uri
      mediaLayer.setBackgroundColor(Color.BLACK)

      val targetImageView = imageView ?: ImageView(context).also { iv ->
        imageView = iv
        mediaLayer.addView(
          iv,
          LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
        )
      }
      targetImageView.scaleType = mapImageScaleType(currentResizeMode)
      if (uri.isNullOrBlank()) {
        expectedImageRequestUri = null
        targetImageView.setImageDrawable(null)
        return
      }
      if (expectedImageRequestUri != uri) {
        expectedImageRequestUri = uri
        targetImageView.setImageDrawable(null)
        loadBitmapAsync(uri) { bitmap ->
          if (expectedImageRequestUri == uri && imageView === targetImageView && bitmap != null) {
            targetImageView.setImageBitmap(bitmap)
          }
        }
      }
    }

    private fun removeStandaloneImageView() {
      expectedImageRequestUri = null
      imageView?.let {
        mediaLayer.removeView(it)
        it.setImageDrawable(null)
      }
      imageView = null
    }

    private fun ensurePosterView(posterUri: String?) {
      currentPosterUri = posterUri
      if (posterUri.isNullOrBlank()) {
        expectedPosterRequestUri = null
        posterImageView?.let {
          mediaLayer.removeView(it)
          it.setImageDrawable(null)
        }
        posterImageView = null
        return
      }

      val targetPoster = posterImageView ?: ImageView(context).also { iv ->
        posterImageView = iv
        mediaLayer.addView(
          iv,
          LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
        )
      }
      targetPoster.scaleType = mapImageScaleType(currentResizeMode)
      targetPoster.visibility = if (videoFrameRendered) View.GONE else View.VISIBLE

      if (expectedPosterRequestUri != posterUri) {
        expectedPosterRequestUri = posterUri
        targetPoster.setImageDrawable(null)
        loadBitmapAsync(posterUri) { bitmap ->
          if (expectedPosterRequestUri == posterUri && posterImageView === targetPoster && bitmap != null) {
            targetPoster.setImageBitmap(bitmap)
          }
        }
      }
    }

    private fun ensureTextureView() {
      if (textureView == null) {
        val tv = TextureView(context).apply {
          layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
          isOpaque = true
          surfaceTextureListener = this@PageMediaController
          addOnLayoutChangeListener { _, left, top, right, bottom, oldLeft, oldTop, oldRight, oldBottom ->
            if ((right - left) != (oldRight - oldLeft) || (bottom - top) != (oldBottom - oldTop)) {
              applyVideoTransform()
            }
          }
        }
        textureView = tv
        // Keep TextureView below posterImageView while poster is visible
        mediaLayer.addView(tv, 0)
      }
    }

    private fun hidePosterAfterRender() {
      videoFrameRendered = true
      posterImageView?.visibility = View.GONE
    }

    private fun prepareVideoSource(uri: String?) {
      stopProgressLoop()
      releaseMediaPlayerOnly()
      videoWidth = 0
      videoHeight = 0
      durationMs = 0
      videoFrameRendered = false
      posterImageView?.visibility = if (currentPosterUri != null) View.VISIBLE else View.GONE

      if (uri.isNullOrBlank()) {
        playerState = PlayerState.IDLE
        return
      }

      val posAtPrep = boundPosition
      if (posAtPrep >= 0) {
        dispatchEvent(
          VideoBufferEvent(getSurfaceId(), this@InstagramStoryView.id, posAtPrep, true)
        )
      }

      val mp = MediaPlayer()
      mediaPlayer = mp
      playerState = PlayerState.PREPARING

      mp.setAudioAttributes(
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_MEDIA)
          .setContentType(AudioAttributes.CONTENT_TYPE_MOVIE)
          .build()
      )

      mp.setOnPreparedListener { preparedMp ->
        if (mediaPlayer !== preparedMp || playerState == PlayerState.RELEASED) return@setOnPreparedListener
        playerState = PlayerState.PREPARED
        videoWidth = preparedMp.videoWidth
        videoHeight = preparedMp.videoHeight
        durationMs = preparedMp.duration.coerceAtLeast(0)

        applyPlayerOptions()
        applyVideoTransform()

        pendingSeekMs?.let { seekTarget ->
          pendingSeekMs = null
          runCatching { preparedMp.seekTo(seekTarget.toInt()) }
        }

        val activePos = boundPosition
        if (activePos >= 0) {
          dispatchEvent(
            VideoBufferEvent(getSurfaceId(), this@InstagramStoryView.id, activePos, false)
          )
          dispatchEvent(
            VideoLoadEvent(
              getSurfaceId(),
              this@InstagramStoryView.id,
              activePos,
              durationMs.toDouble(),
              videoWidth,
              videoHeight
            )
          )
        }

        if (wantsToPlay) {
          runCatching {
            preparedMp.start()
            playerState = PlayerState.STARTED
            startProgressLoop()
          }
        }
      }

      mp.setOnVideoSizeChangedListener { resizedMp, width, height ->
        if (mediaPlayer !== resizedMp) return@setOnVideoSizeChangedListener
        videoWidth = width
        videoHeight = height
        applyVideoTransform()
      }

      mp.setOnInfoListener { infoMp, what, _ ->
        if (mediaPlayer !== infoMp) return@setOnInfoListener false
        val activePos = boundPosition
        when (what) {
          MediaPlayer.MEDIA_INFO_BUFFERING_START -> {
            if (activePos >= 0) {
              dispatchEvent(
                VideoBufferEvent(getSurfaceId(), this@InstagramStoryView.id, activePos, true)
              )
            }
          }
          MediaPlayer.MEDIA_INFO_BUFFERING_END -> {
            if (activePos >= 0) {
              dispatchEvent(
                VideoBufferEvent(getSurfaceId(), this@InstagramStoryView.id, activePos, false)
              )
            }
          }
          MediaPlayer.MEDIA_INFO_VIDEO_RENDERING_START -> {
            hidePosterAfterRender()
          }
        }
        false
      }

      mp.setOnCompletionListener { completedMp ->
        if (mediaPlayer !== completedMp || currentRepeat) return@setOnCompletionListener
        playerState = PlayerState.COMPLETED
        stopProgressLoop()
        val activePos = boundPosition
        if (activePos >= 0) {
          dispatchEvent(
            VideoEndEvent(getSurfaceId(), this@InstagramStoryView.id, activePos, true)
          )
        }
      }

      mp.setOnErrorListener { errorMp, what, extra ->
        if (mediaPlayer !== errorMp) return@setOnErrorListener true
        playerState = PlayerState.ERROR
        stopProgressLoop()
        val activePos = boundPosition
        if (activePos >= 0) {
          dispatchEvent(
            VideoBufferEvent(getSurfaceId(), this@InstagramStoryView.id, activePos, false)
          )
          dispatchEvent(
            VideoErrorEvent(
              getSurfaceId(),
              this@InstagramStoryView.id,
              activePos,
              "MediaPlayer error ($what, $extra)"
            )
          )
        }
        true
      }

      try {
        val parsed = Uri.parse(uri)
        if (parsed.scheme.isNullOrEmpty()) {
          mp.setDataSource(uri)
        } else {
          mp.setDataSource(context, parsed)
        }
        surface?.takeIf { it.isValid }?.let { validSurface ->
          mp.setSurface(validSurface)
        }
        mp.prepareAsync()
      } catch (t: Throwable) {
        playerState = PlayerState.ERROR
        stopProgressLoop()
        if (posAtPrep >= 0) {
          dispatchEvent(
            VideoBufferEvent(getSurfaceId(), this@InstagramStoryView.id, posAtPrep, false)
          )
          dispatchEvent(
            VideoErrorEvent(
              getSurfaceId(),
              this@InstagramStoryView.id,
              posAtPrep,
              t.message ?: "Failed to prepare video"
            )
          )
        }
      }
    }

    private fun applyPlayerOptions() {
      val mp = mediaPlayer ?: return
      if (playerState == PlayerState.ERROR || playerState == PlayerState.RELEASED) return
      val volume = if (currentMuted) 0f else 1f
      runCatching {
        mp.setVolume(volume, volume)
        mp.isLooping = currentRepeat
      }
    }

    private fun applyVideoTransform() {
      val tv = textureView ?: return
      val viewWidth = tv.width.toFloat()
      val viewHeight = tv.height.toFloat()
      if (viewWidth <= 0f || viewHeight <= 0f || videoWidth <= 0 || videoHeight <= 0) {
        tv.setTransform(null)
        return
      }

      if (currentResizeMode == "stretch") {
        tv.setTransform(null)
        return
      }

      val viewAspect = viewWidth / viewHeight
      val videoAspect = videoWidth.toFloat() / videoHeight.toFloat()
      var scaleX = 1f
      var scaleY = 1f

      when (currentResizeMode) {
        "contain" -> {
          if (videoAspect > viewAspect) {
            scaleY = viewAspect / videoAspect
          } else {
            scaleX = videoAspect / viewAspect
          }
        }
        else -> { // cover
          if (videoAspect > viewAspect) {
            scaleX = videoAspect / viewAspect
          } else {
            scaleY = viewAspect / videoAspect
          }
        }
      }

      val matrix = Matrix()
      matrix.setScale(scaleX, scaleY, viewWidth * 0.5f, viewHeight * 0.5f)
      tv.setTransform(matrix)
    }

    private fun startProgressLoop() {
      mainHandler.removeCallbacks(progressRunnable)
      mainHandler.post(progressRunnable)
    }

    private fun stopProgressLoop() {
      mainHandler.removeCallbacks(progressRunnable)
    }

    private fun releaseMediaPlayerOnly() {
      stopProgressLoop()
      val mp = mediaPlayer
      mediaPlayer = null
      playerState = PlayerState.RELEASED
      if (mp != null) {
        runCatching { mp.setSurface(null) }
        runCatching { mp.reset() }
        runCatching { mp.release() }
      }
      playerState = PlayerState.IDLE
    }

    private fun releaseVideoResources() {
      releaseMediaPlayerOnly()
      surface?.release()
      surface = null
      textureView?.let {
        it.surfaceTextureListener = null
        mediaLayer.removeView(it)
      }
      textureView = null
      expectedPosterRequestUri = null
      posterImageView?.let {
        mediaLayer.removeView(it)
        it.setImageDrawable(null)
      }
      posterImageView = null
      videoWidth = 0
      videoHeight = 0
      durationMs = 0
      pendingSeekMs = null
      videoFrameRendered = false
    }

    override fun onSurfaceTextureAvailable(st: SurfaceTexture, width: Int, height: Int) {
      surface?.release()
      val newSurface = Surface(st)
      surface = newSurface
      val mp = mediaPlayer
      if (mp != null && playerState != PlayerState.ERROR && playerState != PlayerState.RELEASED) {
        runCatching { mp.setSurface(newSurface) }
      }
      applyVideoTransform()
    }

    override fun onSurfaceTextureSizeChanged(st: SurfaceTexture, width: Int, height: Int) {
      applyVideoTransform()
    }

    override fun onSurfaceTextureDestroyed(st: SurfaceTexture): Boolean {
      runCatching { mediaPlayer?.setSurface(null) }
      surface?.release()
      surface = null
      return true
    }

    override fun onSurfaceTextureUpdated(st: SurfaceTexture) {
      if (!videoFrameRendered) {
        hidePosterAfterRender()
      }
    }

    private fun mapImageScaleType(resizeMode: String): ImageView.ScaleType {
      return when (resizeMode) {
        "contain" -> ImageView.ScaleType.FIT_CENTER
        "stretch" -> ImageView.ScaleType.FIT_XY
        else -> ImageView.ScaleType.CENTER_CROP
      }
    }

    private fun loadBitmapAsync(uri: String, callback: (Bitmap?) -> Unit) {
      bitmapCache.get(uri)?.let { cached ->
        callback(cached)
        return
      }
      imageExecutor.execute {
        val decoded = decodeBitmapFromUri(uri)
        if (decoded != null) {
          bitmapCache.put(uri, decoded)
        }
        mainHandler.post { callback(decoded) }
      }
    }

    private fun decodeBitmapFromUri(uri: String): Bitmap? {
      return runCatching {
        when {
          uri.startsWith("data:image", ignoreCase = true) -> {
            val base64Part = uri.substringAfter("base64,", "")
            if (base64Part.isNotEmpty()) {
              val bytes = Base64.decode(base64Part, Base64.DEFAULT)
              BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
            } else {
              null
            }
          }
          uri.startsWith("http://", ignoreCase = true) ||
            uri.startsWith("https://", ignoreCase = true) -> {
            val conn = (URL(uri).openConnection() as HttpURLConnection).apply {
              connectTimeout = 10_000
              readTimeout = 15_000
              instanceFollowRedirects = true
            }
            try {
              conn.inputStream.use { BitmapFactory.decodeStream(it) }
            } finally {
              conn.disconnect()
            }
          }
          uri.startsWith("content://", ignoreCase = true) ||
            uri.startsWith("file://", ignoreCase = true) ||
            uri.startsWith("android.resource://", ignoreCase = true) -> {
            context.contentResolver.openInputStream(Uri.parse(uri))?.use {
              BitmapFactory.decodeStream(it)
            }
          }
          else -> BitmapFactory.decodeFile(uri)
        }
      }.getOrNull()
    }
  }

  private inner class StoryPagerAdapter : RecyclerView.Adapter<PageViewHolder>() {

    init {
      setHasStableIds(true)
    }

    override fun getItemCount(): Int = getEffectivePageCount()

    override fun getItemId(position: Int): Long {
      if (pages.isEmpty()) {
        return STANDALONE_ID_BASE + position.toLong()
      }
      val page = pages.getOrNull(position) ?: return RecyclerView.NO_ID
      return pageIds[page] ?: RecyclerView.NO_ID
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): PageViewHolder {
      val container = FrameLayout(parent.context).apply {
        layoutParams = ViewGroup.LayoutParams(
          ViewGroup.LayoutParams.MATCH_PARENT,
          ViewGroup.LayoutParams.MATCH_PARENT
        )
        clipChildren = true
        clipToPadding = true
      }
      val mediaLayer = FrameLayout(parent.context).apply {
        layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
        visibility = View.GONE
      }
      val reactLayer = FrameLayout(parent.context).apply {
        layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
      }
      container.addView(mediaLayer)
      container.addView(reactLayer)
      return PageViewHolder(container, mediaLayer, reactLayer, PageMediaController(mediaLayer))
    }

    override fun onBindViewHolder(holder: PageViewHolder, position: Int) {
      holder.boundPosition = position
      boundHolders.add(holder)

      holder.reactLayer.removeAllViews()
      val pageView = pages.getOrNull(position)
      if (pageView != null) {
        (pageView.parent as? ViewGroup)?.removeView(pageView)
        holder.reactLayer.addView(
          pageView,
          LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
        )
      }
      resetTransform(holder.container)
      bindMediaForHolder(holder)
    }

    override fun onViewRecycled(holder: PageViewHolder) {
      boundHolders.remove(holder)
      holder.boundPosition = RecyclerView.NO_POSITION
      holder.mediaController.release()
      holder.reactLayer.removeAllViews()
      resetTransform(holder.container)
    }

    private fun resetTransform(view: View) {
      view.alpha = 1f
      view.rotationY = 0f
      view.pivotX = view.width * 0.5f
      view.pivotY = view.height * 0.5f
    }
  }

  companion object {
    private const val DEFAULT_PERSPECTIVE = 4.5f
    private const val DEFAULT_CUBE_ANGLE = 90f
    private const val DEFAULT_MIN_CAMERA_DISTANCE = 1280f
    private const val PROGRESS_INTERVAL_MS = 100L
    private const val STANDALONE_ID_BASE = 1_000_000_000L

    private val VIDEO_EXTENSIONS = arrayOf(
      ".mp4",
      ".mov",
      ".m4v",
      ".webm",
      ".m3u8",
      ".mkv",
      ".3gp",
      ".avi",
      ".ts"
    )

    private val imageExecutor = Executors.newCachedThreadPool()
    private val bitmapCache = object : LruCache<String, Bitmap>(
      (Runtime.getRuntime().maxMemory() / 1024L / 8L).toInt().coerceAtLeast(4 * 1024)
    ) {
      override fun sizeOf(key: String, bitmap: Bitmap): Int {
        return (bitmap.byteCount / 1024).coerceAtLeast(1)
      }
    }
  }
}
