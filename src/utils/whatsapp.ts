import { Linking, Alert, Platform } from 'react-native';
import { Client, TrainerSettings } from '../types';
import { getDaysDifference, formatDateSpanish } from './date';

export function cleanPhoneNumber(phone: string, defaultCountryCode: string = '58'): string {
  if (!phone) return '';
  let clean = phone.replace(/[\s\-\(\)\+]/g, '');

  if (clean.startsWith('0')) {
    clean = defaultCountryCode + clean.substring(1);
  } else if (!clean.startsWith(defaultCountryCode) && clean.length <= 10) {
    clean = defaultCountryCode + clean;
  }

  return clean;
}

export function formatPaymentDetails(settings: TrainerSettings): string {
  const parts: string[] = [];
  const p = settings.paymentDetails;

  if (p.pagoMovilPhone && p.pagoMovilBank) {
    parts.push(`📲 *Pago Móvil:*`);
    parts.push(`• Banco: ${p.pagoMovilBank}`);
    parts.push(`• Teléfono: ${p.pagoMovilPhone}`);
    if (p.pagoMovilId) parts.push(`• C.I.: ${p.pagoMovilId}`);
  }

  if (p.zelleEmail) {
    parts.push(`💵 *Zelle:* ${p.zelleEmail}`);
  }

  if (p.transferBank && p.transferAccount) {
    parts.push(`🏦 *Transferencia:* ${p.transferBank} - ${p.transferAccount}`);
  }

  if (p.cashInstructions) {
    parts.push(`💵 *Efectivo:* ${p.cashInstructions}`);
  }

  return parts.join('\n');
}

export type WhatsAppTemplateKey = 'generalReminder' | 'dueSoon' | 'dueToday' | 'overdue';

export function getTemplateKeyForClient(
  client: Client,
  settings: TrainerSettings
): WhatsAppTemplateKey {
  const days = getDaysDifference(client.nextDueDate);
  const dueSoonDays = settings.notifications?.daysBefore ?? 3;

  if (days < 0) return 'overdue';
  if (days === 0) return 'dueToday';
  if (days <= dueSoonDays) return 'dueSoon';
  return 'generalReminder';
}

export function buildWhatsAppMessage(
  client: Client,
  settings: TrainerSettings,
  overrideKey?: WhatsAppTemplateKey,
  customTemplateText?: string
): string {
  const days = getDaysDifference(client.nextDueDate);
  const key = overrideKey ?? getTemplateKeyForClient(client, settings);
  const template =
    customTemplateText !== undefined
      ? customTemplateText
      : settings.templates[key] || settings.templates.generalReminder;

  const paymentText = formatPaymentDetails(settings) || '(Sin datos de pago configurados)';
  const formattedDueDate = formatDateSpanish(client.nextDueDate);
  const paid = client.paidAmount || 0;
  const remaining = Math.max(0, Math.round((client.amount - paid) * 100) / 100);
  const amountText =
    paid > 0 && remaining > 0
      ? `${client.currency} ${remaining} restantes (abonado ${client.currency} ${paid} de ${client.currency} ${client.amount})`
      : `${client.currency} ${client.amount}`;

  return template
    .replace(/{nombre}/g, client.fullName)
    .replace(/{monto}/g, amountText)
    .replace(/{fecha}/g, formattedDueDate)
    .replace(/{dias}/g, String(Math.max(0, days)))
    .replace(/{dias_vencido}/g, String(Math.abs(days)))
    .replace(/{plan}/g, client.planName)
    .replace(/{entrenador}/g, settings.trainerName)
    .replace(/{gimnasio}/g, settings.gymName)
    .replace(/{datos_pago}/g, paymentText);
}

export async function openWhatsApp(phone: string, message: string): Promise<boolean> {
  const encodedText = encodeURIComponent(message);
  const whatsappUrl = `whatsapp://send?phone=${phone}&text=${encodedText}`;
  const webUrl = `https://wa.me/${phone}?text=${encodedText}`;

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.open(webUrl, '_blank');
      return true;
    }
  }

  // On Android 11+ standalone APKs, calling openURL directly avoids canOpenURL package visibility issues
  try {
    await Linking.openURL(whatsappUrl);
    return true;
  } catch {
    try {
      await Linking.openURL(webUrl);
      return true;
    } catch {
      Alert.alert(
        'No se pudo abrir WhatsApp',
        'Verifica que tengas WhatsApp instalado en el teléfono.'
      );
      return false;
    }
  }
}
