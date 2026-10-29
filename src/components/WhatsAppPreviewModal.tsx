import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { Client, TrainerSettings } from '../types';
import {
  buildWhatsAppMessage,
  cleanPhoneNumber,
  openWhatsApp,
  getTemplateKeyForClient,
  WhatsAppTemplateKey,
} from '../utils/whatsapp';
import { ResponsiveModal } from './ResponsiveModal';

interface WhatsAppPreviewModalProps {
  visible: boolean;
  client: Client | null;
  settings: TrainerSettings;
  onClose: () => void;
  onSaveSettings?: (settings: TrainerSettings) => void;
}

const TEMPLATE_OPTIONS: { key: WhatsAppTemplateKey; label: string }[] = [
  { key: 'generalReminder', label: 'Al día' },
  { key: 'dueSoon', label: 'Por vencer' },
  { key: 'dueToday', label: 'Vence hoy' },
  { key: 'overdue', label: 'Vencido' },
];

const SMART_TAGS: { label: string; tag: string }[] = [
  { label: '+ Nombre', tag: '{nombre}' },
  { label: '+ Monto', tag: '{monto}' },
  { label: '+ Fecha', tag: '{fecha}' },
  { label: '+ Datos de pago', tag: '\n{datos_pago}\n' },
  { label: '+ Plan', tag: '{plan}' },
  { label: '+ Días restantes', tag: '{dias}' },
  { label: '+ Días vencido', tag: '{dias_vencido}' },
  { label: '+ Entrenador', tag: '{entrenador}' },
];

export const WhatsAppPreviewModal: React.FC<WhatsAppPreviewModalProps> = ({
  visible,
  client,
  settings,
  onClose,
  onSaveSettings,
}) => {
  const [selectedKey, setSelectedKey] = useState<WhatsAppTemplateKey>('generalReminder');
  const [message, setMessage] = useState('');
  const [editingTemplate, setEditingTemplate] = useState(false);
  const [rawTemplate, setRawTemplate] = useState('');
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);

  useEffect(() => {
    if (client && visible) {
      const autoKey = getTemplateKeyForClient(client, settings);
      setSelectedKey(autoKey);
      setEditingTemplate(false);
      setRawTemplate(settings.templates[autoKey] || '');
      setMessage(buildWhatsAppMessage(client, settings, autoKey));
    }
  }, [client, settings, visible]);

  if (!client) return null;

  const phoneToSend = cleanPhoneNumber(
    client.phone,
    client.countryCode || settings.defaultCountryCode
  );

  const handleSelectFormat = (key: WhatsAppTemplateKey) => {
    setSelectedKey(key);
    const tpl = settings.templates[key] || '';
    setRawTemplate(tpl);
    setMessage(buildWhatsAppMessage(client, settings, key, tpl));
  };

  const handleChangeRawTemplate = (nextRaw: string) => {
    setRawTemplate(nextRaw);
    setMessage(buildWhatsAppMessage(client, settings, selectedKey, nextRaw));
  };

  const handleInsertTag = (tag: string) => {
    if (selection && selection.start >= 0 && selection.start <= rawTemplate.length) {
      const before = rawTemplate.slice(0, selection.start);
      const after = rawTemplate.slice(selection.end);
      const nextText = `${before}${tag}${after}`;
      handleChangeRawTemplate(nextText);
      const nextCursor = selection.start + tag.length;
      setSelection({ start: nextCursor, end: nextCursor });
    } else {
      const sep = rawTemplate.endsWith(' ') || rawTemplate.endsWith('\n') || !rawTemplate ? '' : ' ';
      handleChangeRawTemplate(`${rawTemplate}${sep}${tag}`);
    }
  };

  const handleSaveTemplateChanges = () => {
    if (!onSaveSettings) return;
    const updated: TrainerSettings = {
      ...settings,
      templates: {
        ...settings.templates,
        [selectedKey]: rawTemplate,
      },
    };
    onSaveSettings(updated);
    setEditingTemplate(false);
  };

  const handleSend = async () => {
    // If user was editing the base template, persist it automatically so format and sent message always match
    if (editingTemplate && onSaveSettings) {
      const updated: TrainerSettings = {
        ...settings,
        templates: {
          ...settings.templates,
          [selectedKey]: rawTemplate,
        },
      };
      onSaveSettings(updated);
    }
    await openWhatsApp(phoneToSend, message);
    onClose();
  };

  const currentTabLabel =
    TEMPLATE_OPTIONS.find((t) => t.key === selectedKey)?.label || 'Al día';

  return (
    <ResponsiveModal visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={styles.headerTitle}>Enviar mensaje de WhatsApp</Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {client.fullName} · +{phoneToSend}
          </Text>
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
        <Text style={styles.sectionLabel}>Elegir formato de mensaje:</Text>
        <View style={styles.tabsRow}>
          {TEMPLATE_OPTIONS.map((item) => {
            const active = selectedKey === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.tabBtn, active && styles.tabBtnActive]}
                onPress={() => handleSelectFormat(item.key)}
                activeOpacity={0.75}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.modeHeader}>
          <Text style={styles.sectionLabel}>
            {editingTemplate
              ? `Plantilla general para "${currentTabLabel}":`
              : 'Mensaje exacto que se enviará:'}
          </Text>
          <TouchableOpacity
            onPress={() => setEditingTemplate(!editingTemplate)}
            style={styles.toggleEditBtn}
          >
            <Ionicons
              name={editingTemplate ? 'eye-outline' : 'create-outline'}
              size={14}
              color={COLORS.text}
            />
            <Text style={styles.toggleEditText}>
              {editingTemplate ? 'Ver mensaje final' : `Editar plantilla "${currentTabLabel}"`}
            </Text>
          </TouchableOpacity>
        </View>

        {editingTemplate ? (
          <View style={styles.templateEditorCard}>
            <Text style={styles.helperText}>
              Toca para insertar datos automáticos en la plantilla &ldquo;{currentTabLabel}&rdquo;:
            </Text>
            <View style={styles.tagsWrap}>
              {SMART_TAGS.map((item) => (
                <TouchableOpacity
                  key={item.tag}
                  style={styles.tagBtn}
                  onPress={() => handleInsertTag(item.tag)}
                >
                  <Text style={styles.tagBtnText}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.messageInput}
              value={rawTemplate}
              onChangeText={handleChangeRawTemplate}
              onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
              multiline
              textAlignVertical="top"
              placeholder="Escribe la plantilla..."
              placeholderTextColor={COLORS.textMuted}
            />

            <TouchableOpacity
              style={styles.saveTemplateBtn}
              onPress={handleSaveTemplateChanges}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.primaryText} />
              <Text style={styles.saveTemplateText}>
                Guardar plantilla &ldquo;{currentTabLabel}&rdquo;
              </Text>
            </TouchableOpacity>

            <View style={styles.previewBox}>
              <Text style={styles.previewTitle}>
                Así quedará para {client.fullName}:
              </Text>
              <Text style={styles.previewText}>{message}</Text>
            </View>
          </View>
        ) : (
          <TextInput
            style={styles.messageInput}
            value={message}
            onChangeText={setMessage}
            multiline
            textAlignVertical="top"
            placeholderTextColor={COLORS.textMuted}
          />
        )}

        <TouchableOpacity style={styles.sendBtn} onPress={handleSend} activeOpacity={0.8}>
          <FontAwesome name="whatsapp" size={18} color="#FFFFFF" />
          <Text style={styles.sendBtnText}>Enviar por WhatsApp</Text>
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
    paddingBottom: 32,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    padding: 3,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabBtnActive: {
    backgroundColor: COLORS.surfaceElevated,
  },
  tabText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  tabTextActive: {
    color: COLORS.text,
    fontWeight: '600',
  },
  modeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  toggleEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  toggleEditText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
  },
  templateEditorCard: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  helperText: {
    fontSize: 11,
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
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
  },
  tagBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
  },
  messageInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    borderRadius: 10,
    padding: 12,
    color: COLORS.text,
    fontSize: 13,
    minHeight: 135,
    lineHeight: 19,
  },
  saveTemplateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  saveTemplateText: {
    fontSize: 12,
    color: COLORS.primaryText,
    fontWeight: '600',
  },
  previewBox: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceBorder,
  },
  previewTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  previewText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.whatsapp,
    height: 44,
    borderRadius: 10,
    marginTop: 14,
    gap: 8,
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
