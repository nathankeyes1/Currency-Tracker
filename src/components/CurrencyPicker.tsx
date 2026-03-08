import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  TextInput,
  SafeAreaView,
  Pressable,
} from 'react-native';

const NEU_50 = '#FBFAF8';
const NEU_100 = '#F3F1ED';
const NEU_200 = '#E8E5DF';
const NEU_500 = '#8D8A83';
const NEU_900 = '#242620';
const PRIMARY = '#2C415A';
const SECONDARY = '#EFECE7';

interface Props {
  from: string;
  to: string;
  currencies: string[];
  onFromChange: (c: string) => void;
  onToChange: (c: string) => void;
  onSwap: () => void;
}

function CurrencyButton({
  value,
  label,
  onPress,
}: {
  value: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.currencyButton} activeOpacity={0.7}>
      <Text style={styles.currencyButtonLabel}>{label}</Text>
      <Text style={styles.currencyButtonValue}>{value}</Text>
      <Text style={styles.chevron}>▾</Text>
    </TouchableOpacity>
  );
}

function PickerModal({
  visible,
  currencies,
  selected,
  title,
  onSelect,
  onClose,
}: {
  visible: boolean;
  currencies: string[];
  selected: string;
  title: string;
  onSelect: (c: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const filtered = query
    ? currencies.filter(c => c.toLowerCase().startsWith(query.toLowerCase()))
    : currencies;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>Done</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search…"
            placeholderTextColor={NEU_500}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
        </View>
        <FlatList
          data={filtered}
          keyExtractor={item => item}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                onSelect(item);
                onClose();
              }}
              style={({ pressed }) => [
                styles.currencyRow,
                item === selected && styles.currencyRowSelected,
                pressed && { opacity: 0.6 },
              ]}
            >
              <Text
                style={[
                  styles.currencyRowText,
                  item === selected && styles.currencyRowTextSelected,
                ]}
              >
                {item}
              </Text>
              {item === selected && <Text style={styles.checkmark}>✓</Text>}
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </SafeAreaView>
    </Modal>
  );
}

export function CurrencyPicker({ from, to, currencies, onFromChange, onToChange, onSwap }: Props) {
  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);

  return (
    <View style={styles.container}>
      <CurrencyButton value={from} label="Base" onPress={() => setShowFrom(true)} />

      <TouchableOpacity onPress={onSwap} style={styles.swapButton} activeOpacity={0.7}>
        <Text style={styles.swapIcon}>⇄</Text>
      </TouchableOpacity>

      <CurrencyButton value={to} label="Quote" onPress={() => setShowTo(true)} />

      <PickerModal
        visible={showFrom}
        currencies={currencies}
        selected={from}
        title="Select Base Currency"
        onSelect={onFromChange}
        onClose={() => setShowFrom(false)}
      />
      <PickerModal
        visible={showTo}
        currencies={currencies}
        selected={to}
        title="Select Quote Currency"
        onSelect={onToChange}
        onClose={() => setShowTo(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  currencyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SECONDARY,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 6,
  },
  currencyButtonLabel: {
    fontSize: 12,
    color: NEU_500,
    fontFamily: 'System',
  },
  currencyButtonValue: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: NEU_900,
    fontFamily: 'System',
  },
  chevron: {
    fontSize: 14,
    color: NEU_500,
  },
  swapButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: NEU_200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swapIcon: {
    fontSize: 18,
    color: NEU_900,
  },
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: NEU_50,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: NEU_200,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: NEU_900,
    fontFamily: 'System',
  },
  closeButton: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  closeText: {
    fontSize: 16,
    color: PRIMARY,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: NEU_50,
  },
  searchInput: {
    backgroundColor: NEU_100,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: NEU_900,
    fontFamily: 'System',
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  currencyRowSelected: {
    backgroundColor: NEU_100,
  },
  currencyRowText: {
    flex: 1,
    fontSize: 16,
    color: NEU_900,
    fontFamily: 'System',
  },
  currencyRowTextSelected: {
    fontWeight: '600',
    color: PRIMARY,
  },
  checkmark: {
    fontSize: 16,
    color: PRIMARY,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: NEU_200,
    marginLeft: 20,
  },
});
