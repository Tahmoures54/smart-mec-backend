export const SITE = {
  nameFa: 'مکانیک هوشمند',
  nameEn: 'Smart Mechanic',
  tagline: 'عیب‌یابی هوشمند خودرو',
  description:
    'مشکل ماشینت را با هوش مصنوعی بفهم؛ از روی شرح مشکل یا صدای موتور. بعد نزدیک‌ترین تعمیرگاه را روی نقشه پیدا کن.',
  supportEmail: 'support@smart-mec.ir',
  packageId: 'ir.smartmec.app',
  githubApp: 'https://github.com/Tahmoures54/smart-mechanic-flutter',
} as const;

export type DownloadLink = {
  id: 'apk' | 'bazaar' | 'play';
  title: string;
  subtitle: string;
  href: string | null;
};

function envUrl(name: string): string {
  return (process.env[name] || '').trim();
}

export function getDownloadLinks(): DownloadLink[] {
  const apk = envUrl('NEXT_PUBLIC_APK_URL') || '/downloads/smart-mec.apk';
  const bazaar = envUrl('NEXT_PUBLIC_CAFEBAZAAR_URL');
  const play = envUrl('NEXT_PUBLIC_PLAY_STORE_URL');

  return [
    {
      id: 'apk',
      title: 'دانلود مستقیم',
      subtitle: 'فایل APK اندروید — نصب سریع',
      href: apk,
    },
    {
      id: 'bazaar',
      title: 'کافه‌بازار',
      subtitle: bazaar ? 'نصب از فروشگاه ایرانی' : 'به‌زودی در کافه‌بازار',
      href: bazaar || null,
    },
    {
      id: 'play',
      title: 'گوگل‌پلی',
      subtitle: play ? 'نصب از Google Play' : 'به‌زودی در گوگل‌پلی',
      href: play || null,
    },
  ];
}

export function primaryDownloadHref(): string {
  return getDownloadLinks()[0]?.href || '/downloads/smart-mec.apk';
}
