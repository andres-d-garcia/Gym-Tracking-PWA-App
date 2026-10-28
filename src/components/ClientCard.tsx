import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { Client } from '../types';
import { getDaysDifference, getClientStatus, formatDateSpanish } from '../utils/date';

interface ClientCardProps {
  client: Client;
  dueSoonDays?: number;
  onDirectWhatsApp: (client: Client) => void;
  onPreviewWhatsApp: (client: Client) => void;
  onRegisterPayment: (client: Client) => void;
  onEditClient: (client: Client) => void;
}

export const ClientCard: React.FC<ClientCardProps> = ({
  client,
  dueSoonDays = 3,
  onDirectWhatsApp,
  onPreviewWhatsApp,
  onRegisterPayment,
  onEditClient,
}) => {
  const daysDiff = getDaysDifference(client.nextDueDate);
  const status = getClientStatus(client.nextDueDate, dueSoonDays);
  const formattedDate = formatDateSpanish(client.nextDueDate);

  const paid = client.paidAmount || 0;
  const remaining = Math.max(0, Math.round((client.amount - paid) * 100) / 100);
  const hasPartialBalance = paid > 0 && remaining > 0;

  const getStatusMeta = () => {
    if (status === 'OVERDUE') {
      const days = Math.abs(daysDiff);
      return {
        label: `Venció hace ${days}d (${formattedDate})`,
        color: COLORS.dangerLight,
      };
    }
    if (status === 'DUE_SOON') {
      if (daysDiff === 0) {
        return {
          label: `Vence hoy (${formattedDate})`,
          color: COLORS.warningLight,
        };
      }
      return {
        label: `Vence en ${daysDiff}d (${formattedDate})`,
        color: COLORS.warningLight,
      };
    }
    return {
      label: `Al día · ${formattedDate}`,
      color: COLORS.textMuted,
    };
  };

  const statusMeta = getStatusMeta();

  return (
    <View style={styles.row}>
      {/* Left: Client Name & Subtitle */}
      <TouchableOpacity
        style={styles.infoArea}
        onPress={() => onEditClient(client)}
        activeOpacity={0.6}
      >
        <Text style={styles.name} numberOfLines={1}>
          {client.fullName}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {hasPartialBalance ? (
            <Text style={styles.partialAmount}>
              Restan {client.currency}{remaining}{' '}
              <Text style={styles.paidNote}>(Abonó {client.currency}{paid})</Text>
            </Text>
          ) : (
            <Text style={styles.amount}>
              {client.currency}{client.amount}
            </Text>
          )}
          {'  ·  '}
          <Text style={{ color: statusMeta.color }}>{statusMeta.label}</Text>
        </Text>
      </TouchableOpacity>

      {/* Right: Minimalist inline actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.payBtn}
          onPress={() => onRegisterPayment(client)}
          activeOpacity={0.7}
          accessibilityLabel="Registrar pago"
        >
          <Ionicons name="checkmark" size={16} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.whatsappBtn}
          onPress={() => onDirectWhatsApp(client)}
          onLongPress={() => onPreviewWhatsApp(client)}
          delayLongPress={350}
          activeOpacity={0.8}
          accessibilityLabel="Avisar por WhatsApp"
        >
          <FontAwesome name="whatsapp" size={15} color={COLORS.whatsapp} />
          <Text style={styles.whatsappText}>Avisar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
  },
  infoArea: {
    flex: 1,
    paddingRight: 12,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  amount: {
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  partialAmount: {
    color: COLORS.warningLight,
    fontWeight: '600',
  },
  paidNote: {
    color: COLORS.textMuted,
    fontWeight: '400',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  payBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    backgroundColor: COLORS.whatsappBg,
    gap: 6,
  },
  whatsappText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.whatsapp,
  },
});
