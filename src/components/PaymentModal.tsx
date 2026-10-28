import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { Client, PaymentMethod, PaymentRecord } from '../types';
import {
  formatDateSpanish,
  addDaysToDate,
  getTodayString,
  getDaysDifference,
} from '../utils/date';

interface PaymentModalProps {
  visible: boolean;
  client: Client | null;
  onClose: () => void;
  onSavePayment: (
    payment: Omit<PaymentRecord, 'id'>,
    renewClientMonth: boolean,
    customNextDueDate?: string
  ) => void;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  'Pago Móvil',
  'Efectivo',
  'Zelle',
  'Transferencia',
  'Punto de Venta',
];

const QUICK_RENEW_DAYS = [7, 15, 30];

export const PaymentModal: React.FC<PaymentModalProps> = ({
  visible,
  client,
  onClose,
  onSavePayment,
}) => {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('Pago Móvil');
  const [reference, setReference] = useState('');
  const [receiptImageUri, setReceiptImageUri] = useState<string | undefined>(undefined);
  const [verified, setVerified] = useState(true);
  const [renewEnabled, setRenewEnabled] = useState(true);
  const [renewDays, setRenewDays] = useState('30');

  useEffect(() => {
    if (client) {
      const paidSoFar = client.paidAmount || 0;
      const remaining = Math.max(0, Math.round((client.amount - paidSoFar) * 100) / 100);
      setAmount(String(remaining > 0 ? remaining : client.amount));
      setMethod('Pago Móvil');
      setReference('');
      setReceiptImageUri(undefined);
      setVerified(true);
      setRenewEnabled(true);
      setRenewDays(String(client.durationDays || 30));
    }
  }, [client, visible]);

  if (!client) return null;

  const paidSoFar = client.paidAmount || 0;
  const currentRemaining = Math.max(0, Math.round((client.amount - paidSoFar) * 100) / 100);
  const enteredAmount = parseFloat(amount) || 0;
  const remainingAfterThisPayment = Math.max(
    0,
    Math.round((currentRemaining - enteredAmount) * 100) / 100
  );
  const isPartialPayment = enteredAmount > 0 && remainingAfterThisPayment > 0;

  const handleAmountChange = (val: string) => {
    setAmount(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      if (paidSoFar + num < client.amount) {
        // Es un abono parcial -> por defecto no extender la fecha hasta completar
        setRenewEnabled(false);
      } else {
        // Completa la cuota -> por defecto extender la fecha al nuevo ciclo
        setRenewEnabled(true);
      }
    }
  };

  const baseDateForRenewal =
    getDaysDifference(client.nextDueDate) < 0 ? getTodayString() : client.nextDueDate;
  const parsedDays = parseInt(renewDays, 10);
  const validDays = !isNaN(parsedDays) && parsedDays > 0 ? parsedDays : 30;
  const nextCalculatedDueDate = addDaysToDate(baseDateForRenewal, validDays);

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.base64) {
          const mime = asset.mimeType || 'image/jpeg';
          setReceiptImageUri(`data:${mime};base64,${asset.base64}`);
        } else {
          setReceiptImageUri(asset.uri);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo seleccionar la imagen.');
    }
  };

  const handleConfirm = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Monto inválido', 'Ingresa un monto válido.');
      return;
    }

    onSavePayment(
      {
        clientId: client.id,
        clientName: client.fullName,
        amount: numAmount,
        currency: client.currency,
        date: new Date().toISOString(),
        method,
        reference: reference.trim() || undefined,
        receiptImageUri,
        verified,
      },
      renewEnabled,
      nextCalculatedDueDate
    );
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Registrar pago</Text>
              <Text style={styles.headerSub}>
                {client.fullName} · Cuota {client.currency}{client.amount}
                {paidSoFar > 0 ? ` (Abonado: ${client.currency}${paidSoFar})` : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            <View style={styles.row}>
              <View style={{ width: 110 }}>
                <Text style={styles.label}>Monto ({client.currency})</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor={COLORS.textMuted}
                  value={amount}
                  onChangeText={handleAmountChange}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Nro. de referencia</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej. 00482910"
                  placeholderTextColor={COLORS.textMuted}
                  value={reference}
                  onChangeText={setReference}
                />
              </View>
            </View>

            {/* Indicador dinámico de Abono Parcial vs Pago Completo */}
            {enteredAmount > 0 ? (
              <View style={styles.balanceBanner}>
                <Ionicons
                  name={isPartialPayment ? 'pie-chart-outline' : 'checkmark-done-outline'}
                  size={15}
                  color={isPartialPayment ? COLORS.warningLight : COLORS.primaryLight}
                />
                <Text
                  style={[
                    styles.balanceBannerText,
                    { color: isPartialPayment ? COLORS.warningLight : COLORS.primaryLight },
                  ]}
                >
                  {isPartialPayment
                    ? `Abono parcial: Quedarán pendientes ${client.currency}${remainingAfterThisPayment} de ${client.currency}${client.amount}`
                    : `Cubre el total pendiente (${client.currency}${client.amount})`}
                </Text>
              </View>
            ) : null}

            <Text style={styles.label}>Método</Text>
            <View style={styles.methodsContainer}>
              {PAYMENT_METHODS.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.methodChip, method === m && styles.methodChipActive]}
                  onPress={() => setMethod(m)}
                >
                  <Text
                    style={[
                      styles.methodChipText,
                      method === m && styles.methodChipTextActive,
                    ]}
                  >
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Comprobante / Capture Section */}
            <Text style={styles.label}>Comprobante / Capture</Text>
            <View style={styles.proofContainer}>
              {receiptImageUri ? (
                <View style={styles.previewWrapper}>
                  <Image
                    source={{ uri: receiptImageUri }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                  <View style={styles.previewInfo}>
                    <Text style={styles.previewText}>Capture adjuntado</Text>
                    <TouchableOpacity onPress={handlePickImage}>
                      <Text style={styles.changeImageText}>Cambiar imagen</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => setReceiptImageUri(undefined)}
                  >
                    <Ionicons name="trash-outline" size={16} color={COLORS.dangerLight} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.attachBtn}
                  onPress={handlePickImage}
                  activeOpacity={0.7}
                >
                  <Ionicons name="image-outline" size={18} color={COLORS.textSecondary} />
                  <Text style={styles.attachBtnText}>Adjuntar capture de la transacción</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.verifiedRow}
                onPress={() => setVerified(!verified)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={verified ? 'checkmark-circle' : 'ellipse-outline'}
                  size={18}
                  color={verified ? COLORS.success : COLORS.textMuted}
                />
                <Text
                  style={[
                    styles.verifiedText,
                    verified && { color: COLORS.text, fontWeight: '500' },
                  ]}
                >
                  Transacción comprobada / verificada en banco
                </Text>
              </TouchableOpacity>
            </View>

            {/* Extender vencimiento */}
            <View style={styles.renewBox}>
              <View style={styles.toggleRow}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.toggleTitle}>Extender vencimiento</Text>
                  <Text style={styles.toggleSubtitle}>
                    {renewEnabled
                      ? `Nuevo cobro: ${formatDateSpanish(nextCalculatedDueDate)}`
                      : 'Mantener fecha actual (recomendado para abonos)'}
                  </Text>
                </View>
                <Switch
                  value={renewEnabled}
                  onValueChange={setRenewEnabled}
                  thumbColor={COLORS.text}
                  trackColor={{ false: COLORS.surfaceElevated, true: COLORS.success }}
                />
              </View>

              {renewEnabled ? (
                <View style={styles.daysRow}>
                  {QUICK_RENEW_DAYS.map((d) => {
                    const active = renewDays === String(d);
                    return (
                      <TouchableOpacity
                        key={d}
                        style={[styles.dayChip, active && styles.dayChipActive]}
                        onPress={() => setRenewDays(String(d))}
                      >
                        <Text
                          style={[
                            styles.dayChipText,
                            active && styles.dayChipTextActive,
                          ]}
                        >
                          +{d} días
                        </Text>
                      </TouchableOpacity>
                    );
                  })}

                  <View style={styles.customDaysBox}>
                    <TextInput
                      style={styles.daysInput}
                      value={renewDays}
                      onChangeText={(v) => setRenewDays(v.replace(/[^0-9]/g, ''))}
                      keyboardType="numeric"
                      placeholder="30"
                      placeholderTextColor={COLORS.textMuted}
                    />
                    <Text style={styles.daysSuffix}>días</Text>
                  </View>
                </View>
              ) : null}
            </View>

            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.8}>
              <Text style={styles.confirmBtnText}>
                {isPartialPayment
                  ? `Registrar abono (${client.currency}${enteredAmount})`
                  : 'Confirmar pago'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
    maxHeight: '90%',
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceBorder,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
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
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    color: COLORS.text,
    fontSize: 14,
  },
  balanceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceLight,
  },
  balanceBannerText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  methodsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  methodChip: {
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  methodChipActive: {
    backgroundColor: COLORS.surfaceElevated,
    borderColor: COLORS.textSecondary,
  },
  methodChipText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  methodChipTextActive: {
    color: COLORS.text,
    fontWeight: '600',
  },
  proofContainer: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    overflow: 'hidden',
  },
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  attachBtnText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  previewWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 12,
  },
  previewImage: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: COLORS.surface,
  },
  previewInfo: {
    flex: 1,
  },
  previewText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  changeImageText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    textDecorationLine: 'underline',
  },
  removeImageBtn: {
    padding: 8,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceBorder,
    gap: 8,
  },
  verifiedText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  renewBox: {
    backgroundColor: COLORS.surfaceLight,
    padding: 14,
    borderRadius: 10,
    marginTop: 14,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  toggleSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  daysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceBorder,
  },
  dayChip: {
    paddingHorizontal: 10,
    height: 34,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayChipActive: {
    backgroundColor: COLORS.surfaceElevated,
    borderColor: COLORS.textSecondary,
  },
  dayChipText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  dayChipTextActive: {
    color: COLORS.text,
    fontWeight: '600',
  },
  customDaysBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 34,
    marginLeft: 'auto',
  },
  daysInput: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
    width: 34,
    textAlign: 'center',
  },
  daysSuffix: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginLeft: 2,
  },
  confirmBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    height: 44,
    borderRadius: 10,
    marginTop: 20,
  },
  confirmBtnText: {
    color: COLORS.primaryText,
    fontSize: 14,
    fontWeight: '600',
  },
});
