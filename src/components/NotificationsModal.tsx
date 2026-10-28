import React, { useState, useEffect, useMemo } from 'react';
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
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { Client, TrainerSettings } from '../types';
import { getDaysDifference, formatDateSpanish } from '../utils/date';
import { sendTestNotification } from '../services/notifications';
import { ResponsiveModal } from './ResponsiveModal';

interface NotificationsModalProps {
  visible: boolean;
  settings: TrainerSettings;
  clients: Client[];
  onClose: () => void;
  onSaveSettings: (settings: TrainerSettings) => void;
  onDirectWhatsApp: (client: Client) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  visible,
  settings,
  clients,
  onClose,
  onSaveSettings,
  onDirectWhatsApp,
}) => {
  const [notifEnabled, setNotifEnabled] = useState(settings.notifications?.enabled ?? true);
  const [notifDaysBefore, setNotifDaysBefore] = useState(
    String(settings.notifications?.daysBefore ?? 3)
  );
  const [notifOnDueDate, setNotifOnDueDate] = useState(
    settings.notifications?.notifyOnDueDate ?? true
  );
  const [notifHour, setNotifHour] = useState(settings.notifications?.hour ?? 9);

  useEffect(() => {
    if (visible) {
      setNotifEnabled(settings.notifications?.enabled ?? true);
      setNotifDaysBefore(String(settings.notifications?.daysBefore ?? 3));
      setNotifOnDueDate(settings.notifications?.notifyOnDueDate ?? true);
      setNotifHour(settings.notifications?.hour ?? 9);
    }
  }, [visible, settings]);

  const parsedDays = Math.max(1, Math.min(30, parseInt(notifDaysBefore, 10) || 3));

  const upcomingClients = useMemo(() => {
    return clients
      .filter((c) => {
        if (!c.active) return false;
        const days = getDaysDifference(c.nextDueDate);
        return days <= parsedDays;
      })
      .sort((a, b) => getDaysDifference(a.nextDueDate) - getDaysDifference(b.nextDueDate));
  }, [clients, parsedDays]);

  const handleTest = async () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Modo Web',
        'Las notificaciones nativas suenan directamente en tu teléfono al instalar la APK.'
      );
      return;
    }
    const ok = await sendTestNotification(parsedDays);
    if (!ok) {
      Alert.alert(
        'Permiso requerido',
        'Activa el permiso de notificaciones para Gym Tracking en los ajustes de tu teléfono.'
      );
    }
  };

  const handleSave = () => {
    const updated: TrainerSettings = {
      ...settings,
      notifications: {
        enabled: notifEnabled,
        daysBefore: parsedDays,
        notifyOnDueDate: notifOnDueDate,
        hour: notifHour,
      },
    };
    onSaveSettings(updated);
    onClose();
  };

  return (
    <ResponsiveModal visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Ionicons name="notifications-outline" size={18} color={COLORS.text} />
          <Text style={styles.headerTitle}>Avisos en el teléfono</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setNotifEnabled(!notifEnabled)}
            activeOpacity={0.75}
          >
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.toggleTitle}>Notificaciones del teléfono</Text>
              <Text style={styles.toggleSubtitle}>
                Recibe una alerta en tu celular cuando a un alumno le falten pocos días para vencer
              </Text>
            </View>
            <View style={[styles.switchPill, notifEnabled && styles.switchPillActive]}>
              <View style={[styles.switchThumb, notifEnabled && styles.switchThumbActive]} />
            </View>
          </TouchableOpacity>

          {notifEnabled ? (
            <View style={styles.configBody}>
              <Text style={styles.label}>
                ¿Cuántos días antes del vencimiento quieres el aviso?
              </Text>
              <View style={styles.chipsRow}>
                {[1, 2, 3, 5, 7].map((d) => {
                  const selected = Number(notifDaysBefore) === d;
                  return (
                    <TouchableOpacity
                      key={d}
                      style={[styles.chip, selected && styles.chipActive]}
                      onPress={() => setNotifDaysBefore(String(d))}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                        {d} {d === 1 ? 'día' : 'días'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TextInput
                  style={styles.customInput}
                  value={notifDaysBefore}
                  onChangeText={setNotifDaysBefore}
                  keyboardType="numeric"
                  placeholder="3"
                  placeholderTextColor={COLORS.textMuted}
                  maxLength={2}
                />
              </View>

              <Text style={styles.label}>Hora en la que sonará el aviso</Text>
              <View style={styles.chipsRow}>
                {[
                  { h: 8, label: '8:00 AM' },
                  { h: 9, label: '9:00 AM' },
                  { h: 12, label: '12:00 PM' },
                  { h: 18, label: '6:00 PM' },
                ].map((item) => {
                  const selected = notifHour === item.h;
                  return (
                    <TouchableOpacity
                      key={item.h}
                      style={[styles.chip, selected && styles.chipActive]}
                      onPress={() => setNotifHour(item.h)}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={[styles.toggleRow, { marginTop: 14 }]}
                onPress={() => setNotifOnDueDate(!notifOnDueDate)}
                activeOpacity={0.75}
              >
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.toggleTitle}>Avisar también el mismo día que vence</Text>
                  <Text style={styles.toggleSubtitle}>
                    Envía una alerta adicional el día exacto de cobro
                  </Text>
                </View>
                <Ionicons
                  name={notifOnDueDate ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={notifOnDueDate ? COLORS.primary : COLORS.textMuted}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.testBtn}
                onPress={handleTest}
                activeOpacity={0.75}
              >
                <Ionicons name="notifications" size={15} color={COLORS.text} />
                <Text style={styles.testBtnText}>
                  Probar notificación ahora ({parsedDays} {parsedDays === 1 ? 'día' : 'días'} antes)
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>
          Alumnos en rango de aviso (≤ {parsedDays} {parsedDays === 1 ? 'día' : 'días'} o vencidos)
        </Text>

        {upcomingClients.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              Ningún alumno vence en los próximos {parsedDays} {parsedDays === 1 ? 'día' : 'días'}.
            </Text>
          </View>
        ) : (
          <View style={styles.listBox}>
            {upcomingClients.map((client) => {
              const days = getDaysDifference(client.nextDueDate);
              const isOverdue = days < 0;
              const isToday = days === 0;
              const statusText = isOverdue
                ? `Venció hace ${Math.abs(days)}d (${formatDateSpanish(client.nextDueDate)})`
                : isToday
                ? `Vence HOY (${formatDateSpanish(client.nextDueDate)})`
                : `Vence en ${days}d (${formatDateSpanish(client.nextDueDate)})`;

              return (
                <View key={client.id} style={styles.clientItem}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={styles.clientName} numberOfLines={1}>
                      {client.fullName}
                    </Text>
                    <Text
                      style={[
                        styles.clientStatus,
                        { color: isOverdue ? COLORS.dangerLight : COLORS.warningLight },
                      ]}
                    >
                      {statusText}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.waBtn}
                    onPress={() => onDirectWhatsApp(client)}
                  >
                    <FontAwesome name="whatsapp" size={14} color={COLORS.whatsapp} />
                    <Text style={styles.waBtnText}>Avisar</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
          <Text style={styles.saveBtnText}>Guardar configuración de avisos</Text>
        </TouchableOpacity>
      </ScrollView>
    </ResponsiveModal>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    paddingBottom: 36,
  },
  card: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: 14,
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
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  switchPill: {
    width: 42,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceElevated,
    padding: 2,
    justifyContent: 'center',
  },
  switchPillActive: {
    backgroundColor: COLORS.success,
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.textMuted,
  },
  switchThumbActive: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-end',
  },
  configBody: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceBorder,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginTop: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  chip: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    paddingHorizontal: 10,
    height: 34,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: COLORS.primaryText,
    fontWeight: '600',
  },
  customInput: {
    width: 48,
    height: 34,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 6,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.surfaceElevated,
    height: 38,
    borderRadius: 8,
    marginTop: 14,
  },
  testBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 18,
    marginBottom: 8,
  },
  emptyBox: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  emptyText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  listBox: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    overflow: 'hidden',
  },
  clientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
  },
  clientName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  clientStatus: {
    fontSize: 11,
    marginTop: 2,
  },
  waBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.whatsappBg,
    paddingHorizontal: 10,
    height: 30,
    borderRadius: 15,
  },
  waBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.whatsapp,
  },
  saveBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    height: 44,
    borderRadius: 10,
    marginTop: 20,
  },
  saveBtnText: {
    color: COLORS.primaryText,
    fontSize: 14,
    fontWeight: '600',
  },
});
