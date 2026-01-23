---
description: Complete checklist for sitemap, robots, manifest, and JSON-LD
---

1. **Metadata Base (Crucial)**:
   - In `src/app/layout.tsx`, define `metadataBase` to resolve relative URLs.
   ```tsx
   export const metadata: Metadata = {
     metadataBase: new URL('https://acme.com'),
     title: 'Acme Corp',
     // ...
   };
   ```

2. **Dynamic Sitemap (`sitemap.ts`)**:
   - Create `src/app/sitemap.ts`.
   ```tsx
   import { MetadataRoute } from 'next';

   export default function sitemap(): MetadataRoute.Sitemap {
     return [
       {
         url: 'https://acme.com',
         lastModified: new Date(),
         changeFrequency: 'yearly',
         priority: 1,
       },
       // Add dynamic routes here
     ];
   }
   ```

3. **Robots.txt (`robots.ts`)**:
   - Create `src/app/robots.ts`.
   ```tsx
   import { MetadataRoute } from 'next';

   export default function robots(): MetadataRoute.Robots {
     return {
       rules: {
         userAgent: '*',
         allow: '/',
         disallow: '/private/',
       },
       sitemap: 'https://acme.com/sitemap.xml',
     };
   }
   ```

4. **JSON-LD Structured Data**:
   - Add structured data to your `layout.tsx`.
   ```tsx
   <script
     type="application/ld+json"
     dangerouslySetInnerHTML={{
       __html: JSON.stringify({
         '@context': 'https://schema.org',
         '@type': 'Organization',
         name: 'Acme Corp',
         url: 'https://acme.com',
         logo: 'https://acme.com/logo.png',
       }),
     }}
   />
   ```

5. **Pro Tips**:
   - Use **Open Graph** image generation (`opengraph-image.tsx`).
   - Verify with **Google Search Console**.