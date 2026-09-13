import { DiagnoseApp } from './diagnose-app';
import { SiteShell } from '../_components/site-shell';

export const metadata = {
  title: 'عیب‌یابی آنلاین',
  description: 'نسخه وب مکانیک هوشمند: عیب‌یابی خودرو با هوش مصنوعی از روی شرح مشکل یا صدای موتور.',
};

export default function DiagnosePage() {
  return (
    <SiteShell>
      <DiagnoseApp />
    </SiteShell>
  );
}
