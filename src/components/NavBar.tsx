import React from 'react';
import { View, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const NEU_50  = '#FBFAF8';
const NEU_900 = '#242620';

interface Props {
  isFavorited: boolean;
  onFavorite: () => void;
}

export function NavBar({ isFavorited, onFavorite }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <TouchableOpacity onPress={() => {}} activeOpacity={0.6}>
          <Ionicons name="chevron-back" size={26} color={NEU_900} />
        </TouchableOpacity>
        <View style={styles.spacer} />
        <View style={styles.rightIcons}>
          <TouchableOpacity onPress={onFavorite} activeOpacity={0.6}>
            <Ionicons
              name={isFavorited ? 'star' : 'star-outline'}
              size={22}
              color={NEU_900}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Alert.alert('Rate alerts coming soon')} activeOpacity={0.6}>
            <Ionicons name="notifications-outline" size={22} color={NEU_900} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.border} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 52,
    backgroundColor: NEU_50,
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
