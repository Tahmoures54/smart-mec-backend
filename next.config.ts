import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // اعمال به تمام مسیرهای API و فایل‌ها
        source: "/:path*",
        headers: [
          // ⚠️ دامنه دقیق فرانت‌اند شما (نباید ستاره * باشد وقتی کوکی داریم)
          { key: "Access-Control-Allow-Origin", value: "https://smart-mec.ir" },
          
          // متدهای مجاز
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, PATCH, DELETE, OPTIONS" },
          
          // هدرهای مجاز
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" },
          
          // ⚠️ اجازه عبور کوکی‌ها و توکن‌های احراز هویت (بسیار مهم برای لاگین)
          { key: "Access-Control-Allow-Credentials", value: "true" },
          
          // کش کردن preflight به مدت ۱ روز
          { key: "Access-Control-Max-Age", value: "86400" },
        ],
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**", 
      },
    ],
  },
};

export default nextConfig;