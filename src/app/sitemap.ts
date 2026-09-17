import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: SITE.url, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE.url}/diagnose`, lastModified, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE.url}/buy`, lastModified, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE.url}/garage`, lastModified, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE.url}/privacy`, lastModified, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${SITE.url}/terms`, lastModified, changeFrequency: 'yearly', priority: 0.4 },
  ];
}
