import React from 'react';
import { View, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

const NEU_900 = '#242620';

interface Props {
  isFavorited: boolean;
  onFavorite: () => void;
}

export function NavBar({ isFavorited, onFavorite }: Props) {
  return (
    <BlurView intensity={60} tint="light" style={styles.container}>
      <View style={styles.inner}>
        {/* Back chevron */}
        <TouchableOpacity onPress={() => {}}>
          <Ionicons name="chevron-back" size={26} color={NEU_900} />
        </TouchableOpacity>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Right icons */}
        <View style={styles.rightIcons}>
          <TouchableOpacity onPress={onFavorite}>
            <Ionicons
              name={isFavorited ? 'star' : 'star-outline'}
              size={22}
              color={NEU_900}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => Alert.alert('Rate alerts coming soon')}
          >
            <Ionicons name="notifications-outline" size={22} color={NEU_900} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.border} />
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 52,
  },
  inner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  spacer: {
    flex: 1,
  },
  rightIcons: {
    flexDirection: 'row',
    gap: 16,
  },
  border: {
    height: 0.5,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
});
