import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../constants/theme';
import { ClientStatus } from '../types';

interface StatCardsProps {
  totalClients: number;
  overdueCount: number;
  dueSoonCount: number;
  upToDateCount: number;
  selectedFilter: ClientStatus | 'ALL';
  onSelectFilter: (filter: ClientStatus | 'ALL') => void;
}

export const StatCards: React.FC<StatCardsProps> = ({
  totalClients,
  overdueCount,
  dueSoonCount,
  upToDateCount,
  selectedFilter,
  onSelectFilter,
}) => {
  const tabs: {
    key: ClientStatus | 'ALL';
    label: string;
    count: number;
  }[] = [
    { key: 'ALL', label: 'Todos', count: totalClients },
    { key: 'OVERDUE', label: 'Vencidos', count: overdueCount },
    { key: 'DUE_SOON', label: 'Por vencer', count: dueSoonCount },
    { key: 'UP_TO_DATE', label: 'Al día', count: upToDateCount },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const active = selectedFilter === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, active && styles.tabActive]}
            onPress={() => onSelectFilter(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, active && styles.tabTextActive]}>
              {tab.label}{' '}
              <Text style={[styles.countText, active && styles.countTextActive]}>
                {tab.count}
              </Text>
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
    gap: 6,
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  tabActive: {
    backgroundColor: COLORS.surfaceLight,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.text,
    fontWeight: '600',
  },
  countText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  countTextActive: {
    color: COLORS.textSecondary,
  },
});
