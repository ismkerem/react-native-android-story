import * as React from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  InstagramStory,
  type StoryGroupData,
  type StoryItemData,
} from 'react-native-instagram-story';

interface CustomStoryItem extends StoryItemData {
  id: string;
  backgroundColor: string;
  badgeColor: string;
  title: string;
  caption: string;
}

interface CustomStoryUser extends StoryGroupData<CustomStoryItem> {
  id: string;
  username: string;
  avatarBg: string;
  initials: string;
  items: CustomStoryItem[];
}

const STORY_DATA: CustomStoryUser[] = [
  {
    id: 'user-1',
    username: 'alex.dev',
    avatarBg: '#4F46E5',
    initials: 'AD',
    items: [
      {
        id: '1-1',
        backgroundColor: '#4F46E5',
        badgeColor: '#C7D2FE',
        title: 'Story 1 · Item 1',
        caption: 'Auto-advances in 10 seconds · Tap right to skip ahead',
      },
      {
        id: '1-2',
        backgroundColor: '#059669',
        badgeColor: '#A7F3D0',
        title: 'Story 1 · Item 2',
        caption: 'Hold anywhere to pause · Swipe horizontally for 3D cube',
      },
    ],
  },
  {
    id: 'user-2',
    username: 'sarah.ui',
    avatarBg: '#DB2777',
    initials: 'SU',
    items: [
      {
        id: '2-1',
        backgroundColor: '#DB2777',
        badgeColor: '#FBCFE8',
        title: 'Story 2 · Item 1',
        caption: 'Swipe down anytime to close and reveal the feed behind',
      },
    ],
  },
  {
    id: 'user-3',
    username: 'kerem.rn',
    avatarBg: '#EA580C',
    initials: 'KR',
    items: [
      {
        id: '3-1',
        backgroundColor: '#EA580C',
        badgeColor: '#FED7AA',
        title: 'Story 3 · Item 1',
        caption: 'Pass any custom object shape (id, items, color, media, etc.)',
      },
      {
        id: '3-2',
        backgroundColor: '#0284C7',
        badgeColor: '#BAE6FD',
        title: 'Story 3 · Item 2',
        caption: 'Native Fabric ViewPager2 3D perspective on Android',
      },
    ],
  },
  {
    id: 'user-4',
    username: 'studio.motion',
    avatarBg: '#7C3AED',
    initials: 'SM',
    items: [
      {
        id: '4-1',
        backgroundColor: '#7C3AED',
        badgeColor: '#DDD6FE',
        title: 'Story 4 · Item 1',
        caption: 'Final story! Auto-closes cleanly after 10 seconds',
      },
    ],
  },
];

const STATUS_BAR_PADDING =
  Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;

export default function App() {
  const [viewerVisible, setViewerVisible] = React.useState(false);
  const [selectedUserIndex, setSelectedUserIndex] = React.useState(0);

  const openStory = (index: number) => {
    setSelectedUserIndex(index);
    setViewerVisible(true);
  };

  return (
    <View style={styles.root}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={viewerVisible ? 'light-content' : 'dark-content'}
      />

      <View style={styles.feedContainer}>
        <Text style={styles.appTitle}>Instagram Story Demo</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.avatarList}
        >
          {STORY_DATA.map((user, index) => (
            <Pressable
              key={user.id}
              style={styles.avatarItem}
              onPress={() => openStory(index)}
            >
              <View style={styles.avatarRing}>
                <View
                  style={[
                    styles.avatarCircle,
                    { backgroundColor: user.avatarBg },
                  ]}
                >
                  <Text style={styles.avatarInitials}>{user.initials}</Text>
                </View>
              </View>
              <Text style={styles.avatarLabel} numberOfLines={1}>
                {user.username}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.hintCard}>
          <Text style={styles.hintTitle}>Tap any story avatar above</Text>
          <Text style={styles.hintBody}>
            • Auto-next after 10 seconds{'\n'}• Swipe left/right for native
            Android 3D cube{'\n'}• Swipe down to close story{'\n'}• Hold to
            pause · Tap left/right to navigate
          </Text>
        </View>
      </View>

      {viewerVisible && (
        <View style={styles.modalOverlay}>
          <InstagramStory<CustomStoryUser, CustomStoryItem>
            stories={STORY_DATA}
            visible={viewerVisible}
            initialStoryIndex={selectedUserIndex}
            duration={10000}
            backdropColor="#0F172A"
            swipeToClose
            onClose={() => setViewerVisible(false)}
            renderHeader={({ story, itemIndex, close }) => (
              <View style={styles.storyHeader}>
                <View style={styles.storyUserRow}>
                  <View
                    style={[
                      styles.headerAvatar,
                      { backgroundColor: story.avatarBg },
                    ]}
                  >
                    <Text style={styles.headerInitials}>{story.initials}</Text>
                  </View>
                  <View>
                    <Text style={styles.headerUsername}>{story.username}</Text>
                    <Text style={styles.headerSubtext}>
                      Item {itemIndex + 1} of {story.items.length}
                    </Text>
                  </View>
                </View>
                <Pressable
                  style={styles.headerClose}
                  hitSlop={12}
                  onPress={close}
                >
                  <Text style={styles.headerCloseText}>✕</Text>
                </Pressable>
              </View>
            )}
            renderItem={({ item, story, storyIndex, itemIndex }) => (
              <View
                style={[
                  styles.storyMediaContainer,
                  { backgroundColor: item.backgroundColor },
                ]}
              >
                <View
                  style={[
                    styles.storyBadge,
                    { backgroundColor: item.badgeColor },
                  ]}
                >
                  <Text
                    style={[
                      styles.storyBadgeText,
                      { color: item.backgroundColor },
                    ]}
                  >
                    {story.username.toUpperCase()}
                  </Text>
                </View>

                <Text style={styles.storyTitle}>{item.title}</Text>
                <Text style={styles.storyCaption}>{item.caption}</Text>

                <Text style={styles.storyCounter}>
                  User {storyIndex + 1}/{STORY_DATA.length} · Slide{' '}
                  {itemIndex + 1}/{story.items.length}
                </Text>
              </View>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#EEF2FF',
  },
  feedContainer: {
    flex: 1,
    paddingTop: STATUS_BAR_PADDING + 16,
  },
  appTitle: {
    color: '#1E1B4B',
    fontSize: 24,
    fontWeight: '800',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  avatarList: {
    paddingHorizontal: 16,
    gap: 14,
  },
  avatarItem: {
    alignItems: 'center',
    width: 78,
  },
  avatarRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    padding: 3,
    borderWidth: 2.5,
    borderColor: '#E1306C',
    marginBottom: 6,
  },
  avatarCircle: {
    flex: 1,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  avatarLabel: {
    color: '#1E293B',
    fontSize: 12,
    fontWeight: '600',
  },
  hintCard: {
    marginHorizontal: 16,
    marginTop: 28,
    padding: 18,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  hintTitle: {
    color: '#1E1B4B',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  hintBody: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 22,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  storyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  storyUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInitials: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  headerUsername: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  headerSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    fontWeight: '500',
  },
  headerClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCloseText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  storyMediaContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  storyBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 18,
  },
  storyBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  storyTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 14,
  },
  storyCaption: {
    color: 'rgba(255, 255, 255, 0.92)',
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 25,
    marginBottom: 28,
  },
  storyCounter: {
    color: 'rgba(255, 255, 255, 0.78)',
    fontSize: 13,
    fontWeight: '700',
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
});
