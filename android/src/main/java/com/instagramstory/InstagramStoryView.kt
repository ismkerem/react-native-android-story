package com.instagramstory

import android.content.Context
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.recyclerview.widget.RecyclerView
import androidx.viewpager2.widget.ViewPager2
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.common.ViewUtil
import com.instagramstory.events.PageScrollEvent
import com.instagramstory.events.PageScrollStateChangedEvent
import com.instagramstory.events.PageSelectedEvent
import java.util.IdentityHashMap
import kotlin.math.abs
import kotlin.math.max

class InstagramStoryView(context: Context) : FrameLayout(context) {

  private val pages = mutableListOf<View>()
  private val pageIds = IdentityHashMap<View, Long>()
  private var nextPageId = 1L

  private var initialPageIndex = 0
  private var hasAppliedInitialPage = false
  private var perspectiveMultiplier = DEFAULT_PERSPECTIVE
  private var cubeRotationAngle = DEFAULT_CUBE_ANGLE
  private var scrollEnabledProp = true

  private val touchSlop = ViewConfiguration.get(context).scaledTouchSlop
  private var downX = 0f
  private var downY = 0f
  private var gestureAxis = GestureAxis.NONE

  private enum class GestureAxis {
    NONE,
    HORIZONTAL,
    VERTICAL
  }

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
          dispatchEvent(PageSelectedEvent(getSurfaceId(), id, position))
        }

        override fun onPageScrolled(
          position: Int,
          positionOffset: Float,
          positionOffsetPixels: Int
        ) {
          dispatchEvent(PageScrollEvent(getSurfaceId(), id, position, positionOffset.toDouble()))
        }

        override fun onPageScrollStateChanged(state: Int) {
          val stateName = when (state) {
            ViewPager2.SCROLL_STATE_DRAGGING -> "dragging"
            ViewPager2.SCROLL_STATE_SETTLING -> "settling"
            else -> "idle"
          }
          dispatchEvent(PageScrollStateChangedEvent(getSurfaceId(), id, stateName))
        }
      })
    }

    addView(
      viewPager,
      LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
    )
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
    val insertIndex = index.coerceIn(0, pages.size)
    pageIds[child] = nextPageId++
    pages.add(insertIndex, child)
    pagerAdapter.notifyItemInserted(insertIndex)

    if (!hasAppliedInitialPage && initialPageIndex > 0 && initialPageIndex < pages.size) {
      hasAppliedInitialPage = true
      viewPager.setCurrentItem(initialPageIndex, false)
    }
    requestLayout()
  }

  fun getPageCount(): Int = pages.size

  fun getPageAt(index: Int): View? = pages.getOrNull(index)

  fun removePageAt(index: Int) {
    if (index !in 0 until pages.size) return
    val removed = pages.removeAt(index)
    pageIds.remove(removed)
    (removed.parent as? ViewGroup)?.removeView(removed)
    pagerAdapter.notifyItemRemoved(index)
    requestLayout()
  }

  fun removeAllPages() {
    for (page in pages) {
      (page.parent as? ViewGroup)?.removeView(page)
    }
    pages.clear()
    pageIds.clear()
    pagerAdapter.notifyDataSetChanged()
    requestLayout()
  }

  fun setInitialPage(page: Int) {
    initialPageIndex = max(0, page)
    if (!hasAppliedInitialPage && initialPageIndex < pages.size) {
      hasAppliedInitialPage = true
      viewPager.setCurrentItem(initialPageIndex, false)
    }
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
    if (selectedPage in 0 until pages.size) {
      viewPager.setCurrentItem(selectedPage, animated)
    }
  }

  private fun getSurfaceId(): Int = UIManagerHelper.getSurfaceId(this)

  private fun dispatchEvent(event: com.facebook.react.uimanager.events.Event<*>) {
    val reactContext = context as? ReactContext ?: return
    UIManagerHelper.getEventDispatcher(reactContext, ViewUtil.getUIManagerType(id))
      ?.dispatchEvent(event)
  }

  private class PageViewHolder(val container: FrameLayout) : RecyclerView.ViewHolder(container)

  private inner class StoryPagerAdapter : RecyclerView.Adapter<PageViewHolder>() {

    init {
      setHasStableIds(true)
    }

    override fun getItemCount(): Int = pages.size

    override fun getItemId(position: Int): Long {
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
      return PageViewHolder(container)
    }

    override fun onBindViewHolder(holder: PageViewHolder, position: Int) {
      val pageView = pages.getOrNull(position) ?: return
      holder.container.removeAllViews()
      (pageView.parent as? ViewGroup)?.removeView(pageView)
      resetTransform(holder.container)
      holder.container.addView(
        pageView,
        LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
      )
    }

    override fun onViewRecycled(holder: PageViewHolder) {
      holder.container.removeAllViews()
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
  }
}
