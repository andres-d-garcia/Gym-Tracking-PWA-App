import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { Client } from '../types';
import {
  getTodayString,
  addDaysToDate,
  getDaysDifference,
  formatDateSpanish,
} from '../utils/date';
import { ResponsiveModal } from './ResponsiveModal';

interface ClientModalProps {
  visible: boolean;
  clientToEdit?: Client | null;
  currency: string;
  onClose: () => void;
  onSave: (clientData: Omit<Client, 'id' | 'createdAt'>, existingId?: string) => void;
  onDelete?: (clientId: string) => void;
  onPreviewMessage?: (client: Client) => void;
}

const DEFAULT_PLANS = [
  'Personalizado',
  'Semipersonalizado',
  'Mensualidad',
  'Online',
];

const QUICK_DAYS = [7, 15, 30, 60];

export const ClientModal: React.FC<ClientModalProps> = ({
  visible,
  clientToEdit,
  currency,
  onClose,
  onSave,
  onDelete,
  onPreviewMessage,
}) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('58');
  const [planName, setPlanName] = useState(DEFAULT_PLANS[0]);
  const [amount, setAmount] = useState('30');

  // Dual mode: 'DAYS' (plazo en días) | 'DATE' (fecha exacta)
  const [dueMode, setDueMode] = useState<'DAYS' | 'DATE'>('DAYS');
  const [daysCount, setDaysCount] = useState('30');
  const [startDate, setStartDate] = useState(getTodayString());
  const [nextDueDate, setNextDueDate] = useState(addDaysToDate(getTodayString(), 30));

  const [notes, setNotes] = useState('');

  useEffect(() => {
    const today = getTodayString();
    if (clientToEdit) {
      setFullName(clientToEdit.fullName);
      setPhone(clientToEdit.phone);
      setCountryCode(clientToEdit.countryCode || '58');
      setPlanName(clientToEdit.planName);
      setAmount(String(clientToEdit.amount));
      setStartDate(clientToEdit.startDate);
      setNextDueDate(clientToEdit.nextDueDate);
      const diff = getDaysDifference(clientToEdit.nextDueDate);
      setDaysCount(String(clientToEdit.durationDays || Math.max(1, diff)));
      setDueMode('DAYS');
      setNotes(clientToEdit.notes || '');
    } else {
      setFullName('');
      setPhone('');
      setCountryCode('58');
      setPlanName(DEFAULT_PLANS[0]);
      setAmount('30');
      setDueMode('DAYS');
      setDaysCount('30');
      setStartDate(today);
      setNextDueDate(addDaysToDate(today, 30));
      setNotes('');
    }
  }, [clientToEdit, visible]);

  // When user changes the number of days, compute nextDueDate from today (or startDate if new)
  const handleDaysChange = (val: string) => {
    const clean = val.replace(/[^0-9]/g, '');
    setDaysCount(clean);
    const num = parseInt(clean, 10);
    if (!isNaN(num) && num >= 0) {
      const baseDate = clientToEdit ? getTodayString() : startDate;
      if (/^\d{4}-\d{2}-\d{2}$/.test(baseDate)) {
        setNextDueDate(addDaysToDate(baseDate, num));
      }
    }
  };

  const handleSelectQuickDays = (d: number) => {
    handleDaysChange(String(d));
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    const num = parseInt(daysCount, 10);
    if (!clientToEdit && /^\d{4}-\d{2}-\d{2}$/.test(val) && !isNaN(num)) {
      setNextDueDate(addDaysToDate(val, num));
    }
  };

  const handleNextDueDateChange = (val: string) => {
    setNextDueDate(val);
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const diff = getDaysDifference(val);
      if (diff >= 0) {
        setDaysCount(String(diff));
      }
    }
  };

  const handleSave = () => {
    if (!fullName.trim()) {
      Alert.alert('Campo requerido', 'Ingresa el nombre del entrenado.');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Campo requerido', 'Ingresa el número de teléfono.');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Monto inválido', 'Ingresa un monto válido.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDueDate)) {
      Alert.alert('Fecha inválida', 'Usa el formato AAAA-MM-DD (ej: 2026-11-20)');
      return;
    }

    const parsedDays = parseInt(daysCount, 10);

    onSave(
      {
        fullName: fullName.trim(),
        phone: phone.trim(),
        countryCode: countryCode.trim() || '58',
        planName: planName.trim() || 'Mensualidad',
        amount: numAmount,
        currency,
        startDate: startDate.trim(),
        nextDueDate: nextDueDate.trim(),
        durationDays: !isNaN(parsedDays) && parsedDays > 0 ? parsedDays : 30,
        notes: notes.trim(),
        active: true,
      },
      clientToEdit ? clientToEdit.id : undefined
    );
    onClose();
  };

  const handleDelete = () => {
    if (!clientToEdit || !onDelete) return;
    if (Platform.OS === 'web') {
      const ok = window.confirm(`¿Eliminar a ${clientToEdit.fullName}?`);
      if (ok) {
        onDelete(clientToEdit.id);
        onClose();
      }
      return;
    }
    Alert.alert(
      'Eliminar entrenado',
      `¿Eliminar a ${clientToEdit.fullName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            onDelete(clientToEdit.id);
            onClose();
          },
        },
      ]
    );
  };

  return (
    <ResponsiveModal visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {clientToEdit ? 'Editar entrenado' : 'Nuevo entrenado'}
        </Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
            <Text style={styles.label}>Nombre completo</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Carlos Mendoza"
              placeholderTextColor={COLORS.textMuted}
              value={fullName}
              onChangeText={setFullName}
            />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Teléfono (WhatsApp)</Text>
                <View style={styles.phoneRow}>
                  <TextInput
                    style={[styles.input, styles.countryCodeInput]}
                    placeholder="58"
                    placeholderTextColor={COLORS.textMuted}
                    value={countryCode}
                    onChangeText={setCountryCode}
                    keyboardType="phone-pad"
                  />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="04121234567"
                    placeholderTextColor={COLORS.textMuted}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
              <View style={{ width: 12 }} />
              <View style={{ width: 100 }}>
                <Text style={styles.label}>Cuota ({currency})</Text>
                <TextInput
                  style={styles.input}
                  placeholder="30"
                  placeholderTextColor={COLORS.textMuted}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Text style={styles.label}>Plan</Text>
            <View style={styles.plansContainer}>
              {DEFAULT_PLANS.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.planChip, planName === p && styles.planChipActive]}
                  onPress={() => setPlanName(p)}
                >
                  <Text
                    style={[
                      styles.planChipText,
                      planName === p && styles.planChipTextActive,
                    ]}
                  >
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Selector de modo: Por plazo (días) vs Por fecha exacta */}
            <View style={styles.modeHeaderRow}>
              <Text style={[styles.label, { marginTop: 0, marginBottom: 0 }]}>
                Vencimiento
              </Text>
              <View style={styles.modeSwitch}>
                <TouchableOpacity
                  style={[styles.modeTab, dueMode === 'DAYS' && styles.modeTabActive]}
                  onPress={() => setDueMode('DAYS')}
                >
                  <Text
                    style={[
                      styles.modeTabText,
                      dueMode === 'DAYS' && styles.modeTabTextActive,
                    ]}
                  >
                    Por días
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeTab, dueMode === 'DATE' && styles.modeTabActive]}
                  onPress={() => setDueMode('DATE')}
                >
                  <Text
                    style={[
                      styles.modeTabText,
                      dueMode === 'DATE' && styles.modeTabTextActive,
                    ]}
                  >
                    Por fecha
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {dueMode === 'DAYS' ? (
              <View style={styles.dueSection}>
                <View style={styles.daysRow}>
                  <View style={styles.quickDaysContainer}>
                    {QUICK_DAYS.map((d) => {
                      const active = daysCount === String(d);
                      return (
                        <TouchableOpacity
                          key={d}
                          style={[styles.dayChip, active && styles.dayChipActive]}
                          onPress={() => handleSelectQuickDays(d)}
                        >
                          <Text
                            style={[
                              styles.dayChipText,
                              active && styles.dayChipTextActive,
                            ]}
                          >
                            {d}d
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View style={styles.customDaysBox}>
                    <TextInput
                      style={styles.daysInput}
                      value={daysCount}
                      onChangeText={handleDaysChange}
                      keyboardType="numeric"
                      placeholder="30"
                      placeholderTextColor={COLORS.textMuted}
                    />
                    <Text style={styles.daysSuffix}>días</Text>
                  </View>
                </View>

                <Text style={styles.calculatedDateHint}>
                  Próximo cobro: <Text style={styles.calculatedDateValue}>{formatDateSpanish(nextDueDate)}</Text> ({nextDueDate})
                </Text>
              </View>
            ) : (
              <View style={[styles.row, { marginTop: 6 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { marginTop: 0 }]}>Fecha inicio</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor={COLORS.textMuted}
                    value={startDate}
                    onChangeText={handleStartDateChange}
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { marginTop: 0 }]}>Fecha vencimiento</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor={COLORS.textMuted}
                    value={nextDueDate}
                    onChangeText={handleNextDueDateChange}
                  />
                </View>
              </View>
            )}

            <Text style={styles.label}>Notas (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Horario, objetivos, observaciones..."
              placeholderTextColor={COLORS.textMuted}
              value={notes}
              onChangeText={setNotes}
            />

            {clientToEdit && onPreviewMessage ? (
              <TouchableOpacity
                style={styles.secondaryActionBtn}
                onPress={() => {
                  const numAmount = parseFloat(amount);
                  const parsedDays = parseInt(daysCount, 10);
                  const updatedPreviewClient: Client = {
                    ...clientToEdit,
                    fullName: fullName.trim() || clientToEdit.fullName,
                    phone: phone.trim() || clientToEdit.phone,
                    countryCode: countryCode.trim() || '58',
                    planName: planName.trim() || clientToEdit.planName,
                    amount: !isNaN(numAmount) && numAmount > 0 ? numAmount : clientToEdit.amount,
                    currency,
                    startDate: startDate.trim() || clientToEdit.startDate,
                    nextDueDate: /^\d{4}-\d{2}-\d{2}$/.test(nextDueDate.trim())
                      ? nextDueDate.trim()
                      : clientToEdit.nextDueDate,
                    durationDays: !isNaN(parsedDays) && parsedDays > 0 ? parsedDays : 30,
                    notes: notes.trim(),
                  };
                  onSave(
                    {
                      fullName: updatedPreviewClient.fullName,
                      phone: updatedPreviewClient.phone,
                      countryCode: updatedPreviewClient.countryCode,
                      planName: updatedPreviewClient.planName,
                      amount: updatedPreviewClient.amount,
                      paidAmount: updatedPreviewClient.paidAmount,
                      currency: updatedPreviewClient.currency,
                      startDate: updatedPreviewClient.startDate,
                      nextDueDate: updatedPreviewClient.nextDueDate,
                      durationDays: updatedPreviewClient.durationDays,
                      notes: updatedPreviewClient.notes,
                      active: true,
                    },
                    clientToEdit.id
                  );
                  onClose();
                  onPreviewMessage(updatedPreviewClient);
                }}
              >
                <Ionicons name="chatbubble-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.secondaryActionText}>Ver / Enviar mensaje de WhatsApp</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
              <Text style={styles.saveBtnText}>Guardar</Text>
            </TouchableOpacity>

            {clientToEdit && onDelete ? (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={handleDelete}
                activeOpacity={0.8}
              >
                <Text style={styles.deleteBtnText}>Eliminar entrenado</Text>
              </TouchableOpacity>
            ) : null}
          </ScrollView>
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
  closeBtn: {
    padding: 4,
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
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
  phoneRow: {
    flexDirection: 'row',
    gap: 6,
  },
  countryCodeInput: {
    width: 50,
    textAlign: 'center',
  },
  plansContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  planChip: {
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  planChipActive: {
    backgroundColor: COLORS.surfaceElevated,
    borderColor: COLORS.textSecondary,
  },
  planChipText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  planChipTextActive: {
    color: COLORS.text,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
  },
  modeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 8,
  },
  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  modeTab: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  modeTabActive: {
    backgroundColor: COLORS.surfaceElevated,
  },
  modeTabText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  modeTabTextActive: {
    color: COLORS.text,
    fontWeight: '600',
  },
  dueSection: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  daysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  quickDaysContainer: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
  },
  dayChip: {
    paddingHorizontal: 10,
    height: 36,
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
    fontWeight: '500',
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
    paddingHorizontal: 10,
    height: 36,
  },
  daysInput: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    width: 38,
    textAlign: 'center',
  },
  daysSuffix: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginLeft: 2,
  },
  calculatedDateHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 10,
  },
  calculatedDateValue: {
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginTop: 18,
    gap: 6,
  },
  secondaryActionText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  saveBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    height: 44,
    borderRadius: 10,
    marginTop: 16,
  },
  saveBtnText: {
    color: COLORS.primaryText,
    fontSize: 14,
    fontWeight: '600',
  },
  deleteBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  deleteBtnText: {
    color: COLORS.dangerLight,
    fontSize: 13,
    fontWeight: '500',
  },
});
