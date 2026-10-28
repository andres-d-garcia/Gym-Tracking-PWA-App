import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { PaymentRecord } from '../types';
import { formatDateTime } from '../utils/date';
import { ResponsiveModal } from './ResponsiveModal';

interface PaymentHistoryModalProps {
  visible: boolean;
  payments: PaymentRecord[];
  currency: string;
  onClose: () => void;
}

export const PaymentHistoryModal: React.FC<PaymentHistoryModalProps> = ({
  visible,
  payments,
  currency,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCapture, setSelectedCapture] = useState<PaymentRecord | null>(null);

  const filtered = payments.filter(
    (p) =>
      p.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.reference && p.reference.toLowerCase().includes(searchTerm.toLowerCase())) ||
      p.method.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalFiltered = filtered.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <ResponsiveModal visible={visible} onClose={onClose}>
      <View style={{ minHeight: 380, maxHeight: '100%' }}>
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Historial de pagos</Text>
              <Text style={styles.headerSub}>
                Total: {currency}{totalFiltered.toLocaleString()}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={16} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por nombre o nro. de referencia..."
              placeholderTextColor={COLORS.textMuted}
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
            {searchTerm ? (
              <TouchableOpacity onPress={() => setSearchTerm('')}>
                <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Sin pagos registrados</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.paymentRow}>
                {item.receiptImageUri ? (
                  <TouchableOpacity
                    onPress={() => setSelectedCapture(item)}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri: item.receiptImageUri }}
                      style={styles.thumbnail}
                    />
                  </TouchableOpacity>
                ) : null}

                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.clientName} numberOfLines={1}>
                      {item.clientName}
                    </Text>
                    {item.isPartial ? (
                      <Text style={styles.partialBadgeText}>
                        Abono (Restan {item.currency}{item.remainingAfter})
                      </Text>
                    ) : null}
                    {item.verified ? (
                      <View style={styles.verifiedBadge}>
                        <Ionicons name="checkmark-circle" size={12} color={COLORS.success} />
                        <Text style={styles.verifiedBadgeText}>Comprobado</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={styles.metaText}>
                    {item.method}
                    {item.reference ? ` · Ref: ${item.reference}` : ''}
                    {' · '}
                    {formatDateTime(item.date)}
                  </Text>

                  {item.receiptImageUri ? (
                    <TouchableOpacity
                      onPress={() => setSelectedCapture(item)}
                      style={styles.viewCaptureLink}
                    >
                      <Ionicons name="image-outline" size={13} color={COLORS.textSecondary} />
                      <Text style={styles.viewCaptureText}>Ver capture</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <Text style={styles.amountText}>
                  {item.currency}{item.amount}
                </Text>
              </View>
            )}
          />

          {/* Visor de Capture a pantalla completa */}
          {selectedCapture ? (
            <View style={styles.lightboxOverlay}>
              <View style={styles.lightboxHeader}>
                <View>
                  <Text style={styles.lightboxTitle}>{selectedCapture.clientName}</Text>
                  <Text style={styles.lightboxSub}>
                    {selectedCapture.currency}{selectedCapture.amount} · {selectedCapture.method}
                    {selectedCapture.reference ? ` · Ref: ${selectedCapture.reference}` : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedCapture(null)}
                  style={styles.lightboxClose}
                >
                  <Ionicons name="close" size={22} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              {selectedCapture.receiptImageUri ? (
                <Image
                  source={{ uri: selectedCapture.receiptImageUri }}
                  style={styles.fullImage}
                  resizeMode="contain"
                />
              ) : null}
            </View>
          ) : null}
      </View>
    </ResponsiveModal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '85%',
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceBorder,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  headerSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
    gap: 12,
  },
  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  clientName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  verifiedBadgeText: {
    fontSize: 11,
    color: COLORS.primaryLight,
    fontWeight: '500',
  },
  partialBadgeText: {
    fontSize: 11,
    color: COLORS.warningLight,
    fontWeight: '500',
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  viewCaptureLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  viewCaptureText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textDecorationLine: 'underline',
  },
  amountText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  lightboxOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.bg,
    zIndex: 10,
    padding: 16,
  },
  lightboxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
  },
  lightboxTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  lightboxSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  lightboxClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    flex: 1,
    width: '100%',
    marginTop: 12,
  },
});
