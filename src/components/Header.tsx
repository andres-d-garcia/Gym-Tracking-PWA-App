import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

interface HeaderProps {
  gymName: string;
  pendingAmount: number;
  collectedAmount: number;
  currency: string;
  topInset: number;
  searchVisible: boolean;
  searchQuery: string;
  onToggleSearch: () => void;
  onChangeSearch: (q: string) => void;
  onOpenNewClient: () => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  pendingAmount,
  collectedAmount,
  currency,
  topInset,
  searchVisible,
  searchQuery,
  onToggleSearch,
  onChangeSearch,
  onOpenNewClient,
  onOpenSettings,
  onOpenHistory,
}) => {
  return (
    <View style={[styles.container, { paddingTop: topInset + 10 }]}>
      <View style={styles.row}>
        <View style={styles.brandBlock}>
          <Image
            source={require('../../assets/logo-header.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.subtitle}>
            Pendiente {currency}{pendingAmount}  ·  Cobrado {currency}{collectedAmount}
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onToggleSearch}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={searchVisible ? 'close' : 'search-outline'}
              size={20}
              color={searchVisible ? COLORS.text : COLORS.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onOpenHistory}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="receipt-outline" size={19} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onOpenSettings}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="settings-outline" size={19} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addBtn}
            onPress={onOpenNewClient}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color={COLORS.primaryText} />
          </TouchableOpacity>
        </View>
      </View>

      {searchVisible ? (
        <View style={styles.searchBar}>
          <Ionicons name="search" size={15} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre o teléfono..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={onChangeSearch}
            autoFocus
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => onChangeSearch('')}>
              <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: COLORS.bg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandBlock: {
    flex: 1,
    paddingRight: 12,
  },
  logo: {
    width: 124,
    height: 48,
    marginLeft: -2,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconBtn: {
    padding: 4,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    marginTop: 12,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
  },
});
