import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "مکانیک هوشمند — Backend",
  description: "API عیب‌یابی خودرو، تعمیرگاه‌های نزدیک، پرداخت و پنل مدیریت Smart-MEC",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className="bg-slate-950 text-slate-100 antialiased">{children}</body>
    </html>
  );
}
