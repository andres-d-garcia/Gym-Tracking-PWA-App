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
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { TrainerSettings } from '../types';
import {
  exportAllData,
  importAllData,
  clearClientsAndPayments,
  DEFAULT_SETTINGS,
} from '../services/storage';
import { sendTestNotification } from '../services/notifications';
import { ResponsiveModal } from './ResponsiveModal';

interface SettingsModalProps {
  visible: boolean;
  settings: TrainerSettings;
  onClose: () => void;
  onSaveSettings: (settings: TrainerSettings) => void;
  onDataImported: () => void;
}

type TemplateKey = 'generalReminder' | 'dueSoon' | 'dueToday' | 'overdue';

const SMART_TAGS: { label: string; tag: string }[] = [
  { label: '+ Nombre del alumno', tag: '{nombre}' },
  { label: '+ Monto a pagar', tag: '{monto}' },
  { label: '+ Fecha de cobro', tag: '{fecha}' },
  { label: '+ Mis datos de pago', tag: '\n{datos_pago}\n' },
  { label: '+ Plan', tag: '{plan}' },
  { label: '+ Días para vencer', tag: '{dias}' },
  { label: '+ Días de atraso', tag: '{dias_vencido}' },
  { label: '+ Mi nombre', tag: '{entrenador}' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  settings,
  onClose,
  onSaveSettings,
  onDataImported,
}) => {
  const [trainerName, setTrainerName] = useState(settings.trainerName);
  const [gymName, setGymName] = useState(settings.gymName);
  const [currency, setCurrency] = useState(settings.currency);
  const [defaultCountryCode, setDefaultCountryCode] = useState(settings.defaultCountryCode);

  const [pagoMovilBank, setPagoMovilBank] = useState(settings.paymentDetails.pagoMovilBank);
  const [pagoMovilPhone, setPagoMovilPhone] = useState(settings.paymentDetails.pagoMovilPhone);
  const [pagoMovilId, setPagoMovilId] = useState(settings.paymentDetails.pagoMovilId);
  const [zelleEmail, setZelleEmail] = useState(settings.paymentDetails.zelleEmail);
  const [transferBank, setTransferBank] = useState(settings.paymentDetails.transferBank);
  const [transferAccount, setTransferAccount] = useState(settings.paymentDetails.transferAccount);
  const [cashInstructions, setCashInstructions] = useState(settings.paymentDetails.cashInstructions);

  const [activeTemplateTab, setActiveTemplateTab] = useState<TemplateKey>('generalReminder');
  const [generalReminderTemplate, setGeneralReminderTemplate] = useState(
    settings.templates.generalReminder
  );
  const [dueSoonTemplate, setDueSoonTemplate] = useState(settings.templates.dueSoon);
  const [dueTodayTemplate, setDueTodayTemplate] = useState(settings.templates.dueToday);
  const [overdueTemplate, setOverdueTemplate] = useState(settings.templates.overdue);
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);

  const [notifEnabled, setNotifEnabled] = useState(settings.notifications?.enabled ?? true);
  const [notifDaysBefore, setNotifDaysBefore] = useState(
    String(settings.notifications?.daysBefore ?? 3)
  );
  const [notifOnDueDate, setNotifOnDueDate] = useState(
    settings.notifications?.notifyOnDueDate ?? true
  );
  const [notifHour, setNotifHour] = useState(settings.notifications?.hour ?? 9);

  const [importJsonText, setImportJsonText] = useState('');
  const [showImportBox, setShowImportBox] = useState(false);

  useEffect(() => {
    if (visible) {
      setTrainerName(settings.trainerName);
      setGymName(settings.gymName);
      setCurrency(settings.currency);
      setDefaultCountryCode(settings.defaultCountryCode);
      setPagoMovilBank(settings.paymentDetails.pagoMovilBank);
      setPagoMovilPhone(settings.paymentDetails.pagoMovilPhone);
      setPagoMovilId(settings.paymentDetails.pagoMovilId);
      setZelleEmail(settings.paymentDetails.zelleEmail);
      setTransferBank(settings.paymentDetails.transferBank);
      setTransferAccount(settings.paymentDetails.transferAccount);
      setCashInstructions(settings.paymentDetails.cashInstructions);
      setGeneralReminderTemplate(settings.templates.generalReminder);
      setDueSoonTemplate(settings.templates.dueSoon);
      setDueTodayTemplate(settings.templates.dueToday);
      setOverdueTemplate(settings.templates.overdue);
      setNotifEnabled(settings.notifications?.enabled ?? true);
      setNotifDaysBefore(String(settings.notifications?.daysBefore ?? 3));
      setNotifOnDueDate(settings.notifications?.notifyOnDueDate ?? true);
      setNotifHour(settings.notifications?.hour ?? 9);
      setSelection(null);
      setShowImportBox(false);
      setImportJsonText('');
    }
  }, [visible, settings]);

  const getCurrentTemplateValue = (): string => {
    if (activeTemplateTab === 'generalReminder') return generalReminderTemplate;
    if (activeTemplateTab === 'dueSoon') return dueSoonTemplate;
    if (activeTemplateTab === 'dueToday') return dueTodayTemplate;
    return overdueTemplate;
  };

  const setCurrentTemplateValue = (val: string) => {
    if (activeTemplateTab === 'generalReminder') setGeneralReminderTemplate(val);
    else if (activeTemplateTab === 'dueSoon') setDueSoonTemplate(val);
    else if (activeTemplateTab === 'dueToday') setDueTodayTemplate(val);
    else setOverdueTemplate(val);
  };

  const handleInsertTag = (tag: string) => {
    const current = getCurrentTemplateValue();
    if (selection && selection.start >= 0 && selection.start <= current.length) {
      const before = current.slice(0, selection.start);
      const after = current.slice(selection.end);
      const nextText = `${before}${tag}${after}`;
      setCurrentTemplateValue(nextText);
      const nextCursor = selection.start + tag.length;
      setSelection({ start: nextCursor, end: nextCursor });
    } else {
      const separator = current.endsWith(' ') || current.endsWith('\n') || !current ? '' : ' ';
      setCurrentTemplateValue(`${current}${separator}${tag}`);
    }
  };

  const handleResetCurrentTemplate = () => {
    setCurrentTemplateValue(DEFAULT_SETTINGS.templates[activeTemplateTab]);
  };

  const buildLivePreview = (): string => {
    const raw = getCurrentTemplateValue();
    const parts: string[] = [];
    if (pagoMovilPhone && pagoMovilBank) {
      parts.push(
        `📲 *Pago Móvil:*\n• Banco: ${pagoMovilBank}\n• Teléfono: ${pagoMovilPhone}${
          pagoMovilId ? `\n• C.I.: ${pagoMovilId}` : ''
        }`
      );
    }
    if (zelleEmail) parts.push(`💵 *Zelle:* ${zelleEmail}`);
    if (transferBank && transferAccount) {
      parts.push(`🏦 *Transferencia:* ${transferBank} - ${transferAccount}`);
    }
    if (cashInstructions) parts.push(`💵 *Efectivo:* ${cashInstructions}`);
    const paymentPreview = parts.join('\n') || '(Sin datos de pago configurados)';

    const sampleDays =
      activeTemplateTab === 'generalReminder'
        ? '18'
        : activeTemplateTab === 'dueToday'
        ? '0'
        : '2';

    return raw
      .replace(/{nombre}/g, 'Carlos Mendoza')
      .replace(/{monto}/g, `${currency || '$'} 30`)
      .replace(/{fecha}/g, '28 Oct 2026')
      .replace(/{dias}/g, sampleDays)
      .replace(/{dias_vencido}/g, '3')
      .replace(/{plan}/g, 'Personalizado')
      .replace(/{entrenador}/g, trainerName || 'Derwin')
      .replace(/{gimnasio}/g, gymName || 'Gym Tracking')
      .replace(/{datos_pago}/g, paymentPreview);
  };

  const handleSave = () => {
    const parsedDays = Math.max(1, Math.min(30, parseInt(notifDaysBefore, 10) || 3));
    const updated: TrainerSettings = {
      ...settings,
      trainerName: trainerName.trim() || 'Derwin',
      gymName: gymName.trim() || 'Gym Tracking',
      currency: currency.trim() || '$',
      defaultCountryCode: defaultCountryCode.trim() || '58',
      paymentDetails: {
        pagoMovilBank: pagoMovilBank.trim(),
        pagoMovilPhone: pagoMovilPhone.trim(),
        pagoMovilId: pagoMovilId.trim(),
        zelleEmail: zelleEmail.trim(),
        transferBank: transferBank.trim(),
        transferAccount: transferAccount.trim(),
        cashInstructions: cashInstructions.trim(),
      },
      templates: {
        ...settings.templates,
        generalReminder: generalReminderTemplate,
        dueSoon: dueSoonTemplate,
        dueToday: dueTodayTemplate,
        overdue: overdueTemplate,
      },
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

  const handleTestNotification = async () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Modo Web',
        'Las notificaciones nativas funcionan directamente en el teléfono al instalar la APK.'
      );
      return;
    }
    const parsedDays = Math.max(1, Math.min(30, parseInt(notifDaysBefore, 10) || 3));
    const ok = await sendTestNotification(parsedDays);
    if (!ok) {
      Alert.alert(
        'Permiso requerido',
        'Activa el permiso de notificaciones para Gym Tracking en los ajustes de tu teléfono.'
      );
    }
  };

  const handleExportBackup = async () => {
    try {
      const dataStr = await exportAllData();
      await Share.share({
        message: dataStr,
        title: `Respaldo_Derwin_Gym_${new Date().toISOString().slice(0, 10)}.json`,
      });
    } catch (e) {
      Alert.alert('Error', 'No se pudo generar la copia de seguridad.');
    }
  };

  const handleImportBackup = async () => {
    if (!importJsonText.trim()) {
      Alert.alert('Error', 'Pega el texto JSON del respaldo.');
      return;
    }
    const success = await importAllData(importJsonText.trim());
    if (success) {
      Alert.alert('Listo', 'Datos restaurados correctamente.');
      onDataImported();
      onClose();
    } else {
      Alert.alert('Error', 'Formato JSON inválido.');
    }
  };

  const handleClearData = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('¿Vaciar todos los entrenados y pagos para empezar desde cero?')) {
        clearClientsAndPayments().then(() => {
          onDataImported();
          onClose();
        });
      }
      return;
    }
    Alert.alert(
      'Vaciar lista',
      '¿Deseas borrar todos los entrenados y pagos actuales para empezar desde cero?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Vaciar todo',
          style: 'destructive',
          onPress: async () => {
            await clearClientsAndPayments();
            onDataImported();
            onClose();
          },
        },
      ]
    );
  };

  const handleSelectionChange = (e: {
    nativeEvent: { selection: { start: number; end: number } };
  }) => {
    setSelection(e.nativeEvent.selection);
  };

  return (
    <ResponsiveModal visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Configuración</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
            <Text style={styles.sectionTitle}>General</Text>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Entrenador</Text>
                <TextInput
                  style={styles.input}
                  value={trainerName}
                  onChangeText={setTrainerName}
                  placeholder="Derwin"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1.4 }}>
                <Text style={styles.label}>Nombre en cabecera</Text>
                <TextInput
                  style={styles.input}
                  value={gymName}
                  onChangeText={setGymName}
                  placeholder="Derwin Fitness"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Moneda</Text>
                <TextInput
                  style={styles.input}
                  value={currency}
                  onChangeText={setCurrency}
                  placeholder="$"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Código de país</Text>
                <TextInput
                  style={styles.input}
                  value={defaultCountryCode}
                  onChangeText={setDefaultCountryCode}
                  placeholder="58"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Text style={styles.sectionTitle}>Avisos en el teléfono (Notificaciones)</Text>
            <View style={styles.notifCard}>
              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setNotifEnabled(!notifEnabled)}
                activeOpacity={0.75}
              >
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.toggleTitle}>Activar notificaciones de vencimiento</Text>
                  <Text style={styles.toggleSubtitle}>
                    El teléfono te avisará automáticamente cuando un alumno esté por vencer
                  </Text>
                </View>
                <View style={[styles.switchPill, notifEnabled && styles.switchPillActive]}>
                  <View style={[styles.switchThumb, notifEnabled && styles.switchThumbActive]} />
                </View>
              </TouchableOpacity>

              {notifEnabled ? (
                <View style={styles.notifBody}>
                  <Text style={styles.label}>
                    ¿Cuántos días antes del vencimiento quieres el aviso?
                  </Text>
                  <View style={styles.daysRow}>
                    {[1, 2, 3, 5, 7].map((d) => {
                      const selected = Number(notifDaysBefore) === d;
                      return (
                        <TouchableOpacity
                          key={d}
                          style={[styles.dayChip, selected && styles.dayChipActive]}
                          onPress={() => setNotifDaysBefore(String(d))}
                        >
                          <Text
                            style={[styles.dayChipText, selected && styles.dayChipTextActive]}
                          >
                            {d} {d === 1 ? 'día' : 'días'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                    <TextInput
                      style={[styles.input, styles.dayCustomInput]}
                      value={notifDaysBefore}
                      onChangeText={setNotifDaysBefore}
                      keyboardType="numeric"
                      placeholder="3"
                      placeholderTextColor={COLORS.textMuted}
                      maxLength={2}
                    />
                  </View>

                  <Text style={styles.label}>Hora del aviso en tu teléfono</Text>
                  <View style={styles.daysRow}>
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
                          style={[styles.dayChip, selected && styles.dayChipActive]}
                          onPress={() => setNotifHour(item.h)}
                        >
                          <Text
                            style={[styles.dayChipText, selected && styles.dayChipTextActive]}
                          >
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <TouchableOpacity
                    style={[styles.toggleRow, { marginTop: 12 }]}
                    onPress={() => setNotifOnDueDate(!notifOnDueDate)}
                    activeOpacity={0.75}
                  >
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={styles.toggleTitle}>Avisar también el mismo día de cobro</Text>
                      <Text style={styles.toggleSubtitle}>
                        Envía una alerta adicional el día exacto en que vence el plan
                      </Text>
                    </View>
                    <Ionicons
                      name={notifOnDueDate ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={notifOnDueDate ? COLORS.primary : COLORS.textMuted}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.testNotifBtn}
                    onPress={handleTestNotification}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="notifications-outline" size={15} color={COLORS.text} />
                    <Text style={styles.testNotifBtnText}>
                      Probar notificación ahora ({Number(notifDaysBefore) || 3}{' '}
                      {(Number(notifDaysBefore) || 3) === 1 ? 'día' : 'días'} antes)
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>

            <Text style={styles.sectionTitle}>Mis datos de pago (para WhatsApp)</Text>

            <Text style={styles.label}>Banco Pago Móvil</Text>
            <TextInput
              style={styles.input}
              value={pagoMovilBank}
              onChangeText={setPagoMovilBank}
              placeholder="Ej. Banesco (0134)"
              placeholderTextColor={COLORS.textMuted}
            />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Teléfono</Text>
                <TextInput
                  style={styles.input}
                  value={pagoMovilPhone}
                  onChangeText={setPagoMovilPhone}
                  placeholder="0412-1234567"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="phone-pad"
                />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Cédula / RIF</Text>
                <TextInput
                  style={styles.input}
                  value={pagoMovilId}
                  onChangeText={setPagoMovilId}
                  placeholder="V-20123456"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
            </View>

            <Text style={styles.label}>Zelle (opcional)</Text>
            <TextInput
              style={styles.input}
              value={zelleEmail}
              onChangeText={setZelleEmail}
              placeholder="correo@ejemplo.com"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="email-address"
            />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Banco Transferencia (opc.)</Text>
                <TextInput
                  style={styles.input}
                  value={transferBank}
                  onChangeText={setTransferBank}
                  placeholder="Ej. Mercantil"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1.3 }}>
                <Text style={styles.label}>Nro. de Cuenta (opc.)</Text>
                <TextInput
                  style={styles.input}
                  value={transferAccount}
                  onChangeText={setTransferAccount}
                  placeholder="0105-..."
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>
            </View>

            <Text style={styles.label}>Notas de efectivo (opcional)</Text>
            <TextInput
              style={styles.input}
              value={cashInstructions}
              onChangeText={setCashInstructions}
              placeholder="Entregar al iniciar"
              placeholderTextColor={COLORS.textMuted}
            />

            {/* Didactic Message Editor */}
            <Text style={styles.sectionTitle}>Mensajes automáticos de WhatsApp</Text>

            {/* 4 Tabs for the 4 situations */}
            <View style={styles.templateTabs}>
              {(
                [
                  { key: 'generalReminder', label: 'Al día' },
                  { key: 'dueSoon', label: 'Por vencer' },
                  { key: 'dueToday', label: 'Vence hoy' },
                  { key: 'overdue', label: 'Vencido' },
                ] as { key: TemplateKey; label: string }[]
              ).map((t) => {
                const active = activeTemplateTab === t.key;
                return (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.templateTab, active && styles.templateTabActive]}
                    onPress={() => {
                      setActiveTemplateTab(t.key);
                      setSelection(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.templateTabText,
                        active && styles.templateTabTextActive,
                      ]}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Didactic Smart Tag Buttons */}
            <View style={styles.editorBox}>
              <Text style={styles.tabStatusNote}>
                {activeTemplateTab === 'generalReminder'
                  ? '🟢 Al día: Se usa cuando al entrenado aún le quedan más días para su corte.'
                  : activeTemplateTab === 'dueSoon'
                  ? `🟡 Por vencer: Se usa cuando faltan ${
                      Number(notifDaysBefore) || 3
                    } días o menos para el corte.`
                  : activeTemplateTab === 'dueToday'
                  ? '🟠 Vence hoy: Se usa el día exacto en que vence su mensualidad.'
                  : '🔴 Vencido: Se usa cuando la fecha de cobro ya pasó.'}
              </Text>

              <Text style={styles.helperText}>
                Toca un botón para insertar ese dato automáticamente en tu mensaje:
              </Text>

              <View style={styles.tagsWrap}>
                {SMART_TAGS.map((item) => (
                  <TouchableOpacity
                    key={item.tag}
                    style={styles.tagBtn}
                    onPress={() => handleInsertTag(item.tag)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.tagBtnText}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={[styles.input, styles.templateInput]}
                value={getCurrentTemplateValue()}
                onChangeText={setCurrentTemplateValue}
                onSelectionChange={handleSelectionChange}
                multiline
                textAlignVertical="top"
                placeholder="Escribe aquí el mensaje..."
                placeholderTextColor={COLORS.textMuted}
              />

              <View style={styles.editorFooter}>
                <TouchableOpacity onPress={handleResetCurrentTemplate}>
                  <Text style={styles.resetLink}>Restaurar texto por defecto</Text>
                </TouchableOpacity>
              </View>

              {/* Live Example Preview */}
              <View style={styles.previewCard}>
                <Text style={styles.previewLabel}>
                  Vista previa de ejemplo (así le llegará al alumno):
                </Text>
                <Text style={styles.previewBody}>{buildLivePreview()}</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Respaldo y datos locales</Text>
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.backupBtn, { flex: 1 }]}
                onPress={handleExportBackup}
              >
                <Text style={styles.backupBtnText}>Exportar JSON</Text>
              </TouchableOpacity>
              <View style={{ width: 8 }} />
              <TouchableOpacity
                style={[styles.backupBtn, { flex: 1 }]}
                onPress={() => setShowImportBox(!showImportBox)}
              >
                <Text style={styles.backupBtnText}>Importar JSON</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.backupBtn, { marginTop: 8 }]}
              onPress={handleClearData}
            >
              <Text style={[styles.backupBtnText, { color: COLORS.dangerLight }]}>
                Vaciar entrenados de ejemplo (empezar de cero)
              </Text>
            </TouchableOpacity>

            {showImportBox ? (
              <View style={{ marginTop: 10 }}>
                <TextInput
                  style={[styles.input, { height: 90, paddingVertical: 8 }]}
                  placeholder="Pega aquí el respaldo JSON..."
                  placeholderTextColor={COLORS.textMuted}
                  value={importJsonText}
                  onChangeText={setImportJsonText}
                  multiline
                  textAlignVertical="top"
                />
                <TouchableOpacity
                  style={[styles.backupBtn, { marginTop: 8 }]}
                  onPress={handleImportBackup}
                >
                  <Text style={styles.backupBtnText}>Confirmar restauración</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
              <Text style={styles.saveBtnText}>Guardar cambios</Text>
            </TouchableOpacity>
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
    paddingBottom: 50,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 18,
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: 5,
    marginTop: 8,
  },
  input: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 38,
    color: COLORS.text,
    fontSize: 13,
  },
  templateTabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    padding: 3,
    marginTop: 4,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  templateTab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
  },
  templateTabActive: {
    backgroundColor: COLORS.surfaceElevated,
  },
  templateTabText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  templateTabTextActive: {
    color: COLORS.text,
    fontWeight: '600',
  },
  editorBox: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  tabStatusNote: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  tagBtn: {
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  tagBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
  },
  templateInput: {
    height: 105,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
  },
  editorFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 6,
  },
  resetLink: {
    fontSize: 11,
    color: COLORS.textMuted,
    textDecorationLine: 'underline',
  },
  previewCard: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceBorder,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  previewBody: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
  },
  backupBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceLight,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginTop: 6,
  },
  backupBtnText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  saveBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    height: 44,
    borderRadius: 10,
    marginTop: 22,
  },
  saveBtnText: {
    color: COLORS.primaryText,
    fontSize: 14,
    fontWeight: '600',
  },
  notifCard: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginTop: 4,
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
  notifBody: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceBorder,
  },
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
    marginTop: 4,
  },
  dayChip: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    paddingHorizontal: 10,
    height: 34,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dayChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  dayChipTextActive: {
    color: COLORS.primaryText,
    fontWeight: '600',
  },
  dayCustomInput: {
    width: 48,
    height: 34,
    textAlign: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 6,
  },
  testNotifBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.surfaceElevated,
    height: 36,
    borderRadius: 8,
    marginTop: 14,
  },
  testNotifBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
});
