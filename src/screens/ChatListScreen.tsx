import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  FadeInDown,
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import GlowBackground from '../components/GlowBackground';
import PressableScale from '../components/PressableScale';
import { colors, gradients } from '../theme/colors';
import { fonts } from '../theme/typography';
import {
  ChatFilter,
  DUMMY_CHATS,
  DUMMY_MOMENTS,
  DummyChat,
  FILTERS,
} from '../data/dummyChats';

const NAV_TABS = [
  { key: 'Chats', icon: 'chatbubbles' },
  { key: 'Moments', icon: 'aperture' },
  { key: 'Discover', icon: 'compass' },
  { key: 'Calls', icon: 'call' },
  { key: 'Profile', icon: 'person-circle' },
] as const;

export default function ChatListScreen() {
  const [filter, setFilter] = useState<ChatFilter>('All');
  const [search, setSearch] = useState('');

  const chats = useMemo(() => {
    let list = DUMMY_CHATS;
    if (filter !== 'All') list = list.filter((c) => c.group === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    return list;
  }, [filter, search]);

  return (
    <View style={styles.container}>
      <GlowBackground />

      {/* Header */}
      <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
        <Text style={styles.title}>Chats</Text>
        <View style={styles.headerIcons}>
          <PressableScale style={styles.iconButton} haptic={false}>
            <Ionicons name="scan" size={19} color={colors.textSecondary} />
          </PressableScale>
          <PressableScale style={styles.iconButton} haptic={false}>
            <Ionicons
              name="ellipsis-horizontal"
              size={19}
              color={colors.textSecondary}
            />
          </PressableScale>
        </View>
      </Animated.View>

      {/* Moments ring row */}
      <Animated.View entering={FadeInDown.delay(80).duration(500)}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.momentsRow}
        >
          {DUMMY_MOMENTS.map((m, i) => (
            <Animated.View
              key={m.id}
              entering={FadeInRight.delay(120 + i * 70).springify()}
            >
              <PressableScale style={styles.momentItem} haptic={false}>
                <LinearGradient
                  colors={
                    m.isMe
                      ? ([colors.border, colors.border] as const)
                      : gradients.momentRing
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.momentRing}
                >
                  <View style={styles.momentInner}>
                    <LinearGradient
                      colors={m.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.momentAvatar}
                    >
                      <Text
                        style={[
                          styles.momentInitials,
                          m.isMe && { fontSize: 24, marginTop: -2 },
                        ]}
                      >
                        {m.initials}
                      </Text>
                    </LinearGradient>
                  </View>
                </LinearGradient>
                <Text style={styles.momentName}>{m.name}</Text>
              </PressableScale>
            </Animated.View>
          ))}
        </ScrollView>
      </Animated.View>

      {/* Search */}
      <Animated.View
        entering={FadeInDown.delay(160).duration(500)}
        style={styles.searchBox}
      >
        <Ionicons name="search" size={16} color={colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations"
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
      </Animated.View>

      {/* Filter pills */}
      <Animated.View
        entering={FadeInDown.delay(220).duration(500)}
        style={styles.filterRow}
      >
        {FILTERS.map((f) => {
          const active = f === filter;
          return (
            <PressableScale
              key={f}
              onPress={() => setFilter(f)}
              style={styles.filterPillWrap}
              scaleTo={0.92}
            >
              {active ? (
                <LinearGradient
                  colors={gradients.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.filterPill}
                >
                  <Text style={styles.filterTextActive}>{f}</Text>
                </LinearGradient>
              ) : (
                <View style={[styles.filterPill, styles.filterPillIdle]}>
                  <Text style={styles.filterText}>{f}</Text>
                </View>
              )}
            </PressableScale>
          );
        })}
      </Animated.View>

      {/* Chat rows */}
      <FlatList
        data={chats}
        keyExtractor={(c) => c.id}
        renderItem={({ item, index }) => <ChatRow chat={item} index={index} />}
        contentContainerStyle={{ paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Floating new-chat button */}
      <Animated.View
        entering={FadeInDown.delay(500).springify()}
        style={styles.fabWrap}
      >
        <PressableScale scaleTo={0.9}>
          <LinearGradient
            colors={gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fab}
          >
            <Ionicons name="chatbubble-ellipses" size={24} color={colors.white} />
          </LinearGradient>
        </PressableScale>
      </Animated.View>

      {/* Frosted bottom nav */}
      <BlurView intensity={40} tint="dark" style={styles.bottomNav}>
        {NAV_TABS.map((tab, i) => {
          const active = i === 0; // Chats active this sprint
          return (
            <View key={tab.key} style={styles.navItem}>
              <Ionicons
                name={tab.icon}
                size={23}
                color={active ? colors.red : colors.textTertiary}
              />
              <Text
                style={[
                  styles.navLabel,
                  active && {
                    color: colors.red,
                    fontFamily: fonts.semiBold,
                  },
                ]}
              >
                {tab.key}
              </Text>
              {active && <View style={styles.navDot} />}
            </View>
          );
        })}
      </BlurView>
    </View>
  );
}

function ChatRow({ chat, index }: { chat: DummyChat; index: number }) {
  return (
    <Animated.View
      entering={FadeInDown.delay(280 + index * 70)
        .duration(500)
        .springify()
        .damping(16)}
    >
      <PressableScale style={styles.row} scaleTo={0.98} haptic={false}>
        <View>
          <LinearGradient
            colors={chat.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{chat.initials}</Text>
          </LinearGradient>
          {chat.online && <View style={styles.onlineDot} />}
        </View>
        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <Text style={styles.chatName}>{chat.name}</Text>
            <Text
              style={[
                styles.chatTime,
                chat.unread > 0 && { color: colors.yellow },
              ]}
            >
              {chat.time}
            </Text>
          </View>
          <View style={styles.rowBottom}>
            {chat.typing ? (
              <TypingIndicator />
            ) : (
              <Text style={styles.preview} numberOfLines={1}>
                {chat.preview}
              </Text>
            )}
            {chat.unread > 0 && <UnreadBadge count={chat.unread} />}
          </View>
        </View>
      </PressableScale>
    </Animated.View>
  );
}

function TypingIndicator() {
  return (
    <View style={styles.typingRow}>
      <Text style={styles.typingText}>typing</Text>
      {[0, 1, 2].map((i) => (
        <TypingDot key={i} index={i} />
      ))}
    </View>
  );
}

function TypingDot({ index }: { index: number }) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withDelay(
      index * 140,
      withRepeat(
        withSequence(
          withTiming(-3, { duration: 280, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 280, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 280 })
        ),
        -1
      )
    );
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
  }));
  return <Animated.View style={[styles.typingDot, style]} />;
}

function UnreadBadge({ count }: { count: number }) {
  const scale = useSharedValue(0);
  useEffect(() => {
    scale.value = withDelay(600, withSpring(1, { damping: 10, stiffness: 200 }));
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <Animated.View style={[styles.badge, style]}>
      <Text style={styles.badgeText}>{count}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
    paddingTop: 58,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    color: colors.white,
    fontSize: 32,
    fontFamily: fonts.display,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  momentsRow: {
    paddingHorizontal: 20,
    gap: 14,
    paddingBottom: 18,
  },
  momentItem: {
    alignItems: 'center',
    gap: 6,
  },
  momentRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  momentInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  momentAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  momentInitials: {
    color: colors.white,
    fontSize: 20,
    fontFamily: fonts.bold,
  },
  momentName: {
    color: colors.textSecondary,
    fontSize: 11.5,
    fontFamily: fonts.medium,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 24,
    paddingHorizontal: 15,
    marginHorizontal: 20,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    color: colors.white,
    fontSize: 14.5,
    fontFamily: fonts.regular,
    paddingVertical: 11,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  filterPillWrap: {
    borderRadius: 20,
  },
  filterPill: {
    paddingHorizontal: 17,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterPillIdle: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  filterText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontFamily: fonts.semiBold,
  },
  filterTextActive: {
    color: colors.white,
    fontSize: 13,
    fontFamily: fonts.semiBold,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 11,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.white,
    fontSize: 20,
    fontFamily: fonts.bold,
  },
  onlineDot: {
    position: 'absolute',
    right: 0,
    bottom: 2,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: colors.online,
    borderWidth: 2.5,
    borderColor: colors.black,
  },
  rowBody: {
    flex: 1,
    marginLeft: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingBottom: 11,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chatName: {
    color: colors.white,
    fontSize: 16,
    fontFamily: fonts.semiBold,
  },
  chatTime: {
    color: colors.textTertiary,
    fontSize: 12,
    fontFamily: fonts.regular,
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  preview: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 14,
    fontFamily: fonts.regular,
    marginRight: 10,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  typingText: {
    color: colors.yellow,
    fontSize: 14,
    fontFamily: fonts.medium,
    marginRight: 3,
  },
  typingDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.yellow,
  },
  badge: {
    minWidth: 21,
    height: 21,
    borderRadius: 11,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: colors.white,
    fontSize: 11,
    fontFamily: fonts.bold,
  },
  fabWrap: {
    position: 'absolute',
    right: 20,
    bottom: 104,
    borderRadius: 30,
    shadowColor: colors.red,
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 14,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.glassBorder,
    paddingTop: 10,
    paddingBottom: 24,
    backgroundColor: 'rgba(11,11,11,0.72)',
    overflow: 'hidden',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  navLabel: {
    color: colors.textTertiary,
    fontSize: 10.5,
    fontFamily: fonts.medium,
  },
  navDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.red,
    marginTop: 1,
  },
});
