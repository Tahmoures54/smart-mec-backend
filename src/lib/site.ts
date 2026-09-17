export const SITE = {
  nameFa: 'مکانیک هوشمند',
  nameEn: 'Smart Mechanic',
  /** زیر نام برند در هدر و صفحه اصلی */
  tagline: 'گنجینه دانش خودرویی ایران',
  /** خط دوم کوتاه زیر تگ‌لاین */
  subtitle: 'عیب را دقیق بشناس، هزینه را کنترل کن',
  description:
    'عیب‌یابی خودرو با هوش مصنوعی در نسخه وب یا اپ اندروید؛ از روی شرح مشکل یا صدای موتور — تا عیب را بهتر بشناسی و هزینه را کنترل کنی.',
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
  // Never advertise a local APK URL unless an actual APK has been configured.
  const apk = envUrl('NEXT_PUBLIC_APK_URL') || null;
  const bazaar = envUrl('NEXT_PUBLIC_CAFEBAZAAR_URL');
  const play = envUrl('NEXT_PUBLIC_PLAY_STORE_URL');

  return [
    {
      id: 'apk',
      title: 'نسخه اندروید',
      subtitle: apk ? 'فایل APK اندروید — نصب سریع' : 'به‌زودی برای دانلود مستقیم',
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

export function primaryDownloadHref(): string | null {
  return getDownloadLinks()[0]?.href || null;
}
