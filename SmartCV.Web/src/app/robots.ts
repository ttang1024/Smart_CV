import type { MetadataRoute } from 'next'
import { SITE_URL } from './metadata'

export const dynamic = 'force-static'

export default function robots(): MetadataRoute.Robots {
	return {
		rules: {
			userAgent: '*',
			allow: '/',
			disallow: ['/editor', '/settings'],
		},
		sitemap: `${SITE_URL}/sitemap.xml`,
		host: SITE_URL,
	}
}
