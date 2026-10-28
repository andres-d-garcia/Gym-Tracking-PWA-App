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
import { buildWhatsAppMessage, cleanPhoneNumber, openWhatsApp } from '../utils/whatsapp';
import { ResponsiveModal } from './ResponsiveModal';

interface WhatsAppPreviewModalProps {
  visible: boolean;
  client: Client | null;
  settings: TrainerSettings;
  onClose: () => void;
}

export const WhatsAppPreviewModal: React.FC<WhatsAppPreviewModalProps> = ({
  visible,
  client,
  settings,
  onClose,
}) => {
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (client && visible) {
      setMessage(buildWhatsAppMessage(client, settings));
    }
  }, [client, settings, visible]);

  if (!client) return null;

  const phoneToSend = cleanPhoneNumber(
    client.phone,
    client.countryCode || settings.defaultCountryCode
  );

  const handleSend = async () => {
    await openWhatsApp(phoneToSend, message);
    onClose();
  };

  return (
    <ResponsiveModal visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Mensaje de WhatsApp</Text>
          <Text style={styles.headerSub}>
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
        <TextInput
          style={styles.messageInput}
          value={message}
          onChangeText={setMessage}
          multiline
          textAlignVertical="top"
          placeholderTextColor={COLORS.textMuted}
        />

        <TouchableOpacity style={styles.sendBtn} onPress={handleSend} activeOpacity={0.8}>
          <FontAwesome name="whatsapp" size={18} color="#FFFFFF" />
          <Text style={styles.sendBtnText}>Abrir WhatsApp</Text>
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
  messageInput: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    borderRadius: 10,
    padding: 14,
    color: COLORS.text,
    fontSize: 14,
    minHeight: 160,
    lineHeight: 20,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.whatsapp,
    height: 44,
    borderRadius: 10,
    marginTop: 16,
    gap: 8,
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
