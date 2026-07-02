import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

type Props = {
  gradient: readonly [string, string];
  label: string; // initials or emoji
  size?: number;
  online?: boolean;
};

export default function Avatar({ gradient, label, size = 52, online }: Props) {
  const isEmoji = /\p{Extended_Pictographic}/u.test(label);
  return (
    <View>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            color: colors.white,
            fontSize: size * (isEmoji ? 0.46 : 0.38),
            fontFamily: fonts.bold,
          }}
        >
          {label}
        </Text>
      </LinearGradient>
      {online && (
        <View
          style={[
            styles.dot,
            {
              width: size * 0.25,
              height: size * 0.25,
              borderRadius: size * 0.125,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
    right: 0,
    bottom: 1,
    backgroundColor: colors.online,
    borderWidth: 2.5,
    borderColor: colors.black,
  },
});
