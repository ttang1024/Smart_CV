import type { MetadataRoute } from 'next'
import { INDEXABLE_PATHS, SITE_URL } from './metadata'

export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
	const lastModified = new Date()

	return INDEXABLE_PATHS.map(path => ({
		url: `${SITE_URL}${path === '/' ? '' : path}`,
		lastModified,
		changeFrequency: 'weekly',
		priority: path === '/' ? 1 : 0.7,
	}))
}
