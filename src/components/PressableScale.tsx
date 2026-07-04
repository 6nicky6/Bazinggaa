import React from 'react';
import { Pressable, PressableProps, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Standard press feedback across the app: spring scale-down + light haptic.
type Props = PressableProps & {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  haptic?: boolean;
  scaleTo?: number;
};

export default function PressableScale({
  children,
  style,
  haptic = true,
  scaleTo = 0.96,
  onPressIn,
  onPressOut,
  onPress,
  ...rest
}: Props) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      {...rest}
      style={[style, animStyle]}
      onPressIn={(e) => {
        scale.value = withSpring(scaleTo, { damping: 15, stiffness: 300 });
        if (haptic) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, { damping: 12, stiffness: 250 });
        onPressOut?.(e);
      }}
      onPress={onPress}
    >
      {children}
    </AnimatedPressable>
  );
}
