package com.androidstory

import com.facebook.react.bridge.Dynamic
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType

data class StoryItemPayload(
  val id: String?,
  val type: String?,
  val imageUri: String?,
  val videoUri: String?,
  val posterUri: String?,
  val raw: ReadableMap
)

data class StoryGroupPayload(
  val id: String?,
  val avatarUri: String?,
  val userUri: String?,
  val imageUri: String?,
  val items: List<StoryItemPayload>,
  val raw: ReadableMap,
  val type: String? = null,
  val videoUri: String? = null,
  val posterUri: String? = null
)

data class StoryDataPayload(
  val groups: List<StoryGroupPayload>,
  val rawMap: ReadableMap? = null,
  val rawArray: ReadableArray? = null
)

object StoryDataParser {

  fun parse(dynamic: Dynamic): StoryDataPayload? {
    if (dynamic.isNull) return null
    return when (dynamic.type) {
      ReadableType.Map -> {
        val map = dynamic.asMap() ?: return null
        val groups = if (map.hasKey("stories") && map.getType("stories") == ReadableType.Array) {
          parseGroupsArray(map.getArray("stories"))
        } else {
          listOf(parseGroup(map))
        }
        StoryDataPayload(groups = groups, rawMap = map)
      }
      ReadableType.Array -> {
        val array = dynamic.asArray() ?: return null
        StoryDataPayload(groups = parseGroupsArray(array), rawArray = array)
      }
      else -> null
    }
  }

  private fun parseGroupsArray(array: ReadableArray?): List<StoryGroupPayload> {
    if (array == null) return emptyList()
    val result = ArrayList<StoryGroupPayload>(array.size())
    for (i in 0 until array.size()) {
      if (array.getType(i) == ReadableType.Map) {
        array.getMap(i)?.let { result.add(parseGroup(it)) }
      }
    }
    return result
  }

  private fun parseGroup(map: ReadableMap): StoryGroupPayload {
    val items = mutableListOf<StoryItemPayload>()
    if (map.hasKey("items") && map.getType("items") == ReadableType.Array) {
      val itemsArray = map.getArray("items")
      if (itemsArray != null) {
        for (i in 0 until itemsArray.size()) {
          if (itemsArray.getType(i) == ReadableType.Map) {
            itemsArray.getMap(i)?.let { itemMap ->
              items.add(
                StoryItemPayload(
                  id = readStringOrNumber(itemMap, "id"),
                  type = readStringOrNumber(itemMap, "type") ?: readStringOrNumber(itemMap, "mediaType"),
                  imageUri = readUri(itemMap, "imageUri", "image", "uri", "url"),
                  videoUri = readUri(itemMap, "videoUri", "video"),
                  posterUri = readUri(itemMap, "posterUri", "thumbnailUri"),
                  raw = itemMap
                )
              )
            }
          }
        }
      }
    }

    return StoryGroupPayload(
      id = readStringOrNumber(map, "id"),
      avatarUri = readUri(map, "avatarUri", "avatar"),
      userUri = readUri(map, "userUri"),
      imageUri = readUri(map, "imageUri", "image", "uri", "url"),
      items = items,
      raw = map,
      type = readStringOrNumber(map, "type") ?: readStringOrNumber(map, "mediaType"),
      videoUri = readUri(map, "videoUri", "video"),
      posterUri = readUri(map, "posterUri", "thumbnailUri")
    )
  }

  private fun readStringOrNumber(map: ReadableMap, key: String): String? {
    if (!map.hasKey(key) || map.isNull(key)) return null
    return when (map.getType(key)) {
      ReadableType.String -> map.getString(key)
      ReadableType.Number -> {
        val num = map.getDouble(key)
        if (num % 1.0 == 0.0) num.toLong().toString() else num.toString()
      }
      else -> null
    }
  }

  private fun readUri(map: ReadableMap, vararg keys: String): String? {
    for (key in keys) {
      if (!map.hasKey(key) || map.isNull(key)) continue
      when (map.getType(key)) {
        ReadableType.String -> {
          val value = map.getString(key)?.trim()
          if (!value.isNullOrEmpty()) return value
        }
        ReadableType.Map -> {
          val nested = map.getMap(key)
          val nestedUri = nested?.let {
            if (it.hasKey("uri") && it.getType("uri") == ReadableType.String) {
              it.getString("uri")?.trim()
            } else {
              null
            }
          }
          if (!nestedUri.isNullOrEmpty()) return nestedUri
        }
        else -> Unit
      }
    }
    return null
  }
}
