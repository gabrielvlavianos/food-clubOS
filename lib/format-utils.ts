export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return 'Não cadastrado';

  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 13) {
    const countryCode = cleaned.slice(0, 2);
    const areaCode = cleaned.slice(2, 4);
    const firstPart = cleaned.slice(4, 9);
    const secondPart = cleaned.slice(9, 13);
    return `+${countryCode} (${areaCode}) ${firstPart}-${secondPart}`;
  }

  if (cleaned.length === 12) {
    const countryCode = cleaned.slice(0, 2);
    const areaCode = cleaned.slice(2, 4);
    const firstPart = cleaned.slice(4, 8);
    const secondPart = cleaned.slice(8, 12);
    return `+${countryCode} (${areaCode}) ${firstPart}-${secondPart}`;
  }

  if (cleaned.length === 11) {
    const areaCode = cleaned.slice(0, 2);
    const firstPart = cleaned.slice(2, 7);
    const secondPart = cleaned.slice(7, 11);
    return `+55 (${areaCode}) ${firstPart}-${secondPart}`;
  }

  if (cleaned.length === 10) {
    const areaCode = cleaned.slice(0, 2);
    const firstPart = cleaned.slice(2, 6);
    const secondPart = cleaned.slice(6, 10);
    return `+55 (${areaCode}) ${firstPart}-${secondPart}`;
  }

  return phone;
}

export function formatTime(time: string | null | undefined): string {
  if (!time) return '';

  if (time.length === 8 && time.includes(':')) {
    return time.substring(0, 5);
  }

  return time;
}
