export const SITE = {
  nameFa: 'مکانیک هوشمند',
  nameEn: 'Smart Mechanic',
  tagline: 'گنجینه دانش خودرویی ایران',
  subtitle: 'عیب را دقیق بشناس، هزینه را کنترل کن',
  description:
    'عیب‌یابی خودرو با هوش مصنوعی در نسخه وب یا اپ اندروید؛ از روی شرح مشکل یا صدای موتور — تا عیب را بهتر بشناسی و هزینه را کنترل کنی.',
  supportEmail: 'support@smart-mec.ir',
  packageId: 'ir.smartmec.app',
  githubApp: 'https://github.com/Tahmoures54/smart-mechanic-flutter',
  domain: 'smart-mec.ir',
  url: 'https://smart-mec.ir',
  zibalTrustHref: 'https://gateway.zibal.ir/trustMe/smart-mec.ir',
  zibalTrustImg: 'https://zibal.ir/trust/assets/2.png',
} as const;

export type DownloadLink = {
  id: 'apk' | 'bazaar';
  title: string;
  subtitle: string;
  href: string | null;
};

function envUrl(name: string): string {
  return (process.env[name] || '').trim();
}

export function getDownloadLinks(): DownloadLink[] {
  const apk = envUrl('NEXT_PUBLIC_APK_URL') || null;
  const bazaar = envUrl('NEXT_PUBLIC_CAFEBAZAAR_URL');

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
  ];
}

export function primaryDownloadHref(): string | null {
  return getDownloadLinks().find((link) => link.href)?.href || null;
}
