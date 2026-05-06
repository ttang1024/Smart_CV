import type { Metadata } from 'next'

export const SITE_URL = 'https://smart-cv-app.victoriousstone-84bd9455.eastus.azurecontainerapps.io'
export const SHARE_IMAGE_PATH = '/share.jpg'
export const SHARE_IMAGE_URL = `${SITE_URL}${SHARE_IMAGE_PATH}`
export const SHARE_IMAGE_WIDTH = 512
export const SHARE_IMAGE_HEIGHT = 512

export const LANGUAGE_ALTERNATES = {
	en: '/',
	es: '/es',
	'zh-CN': '/zh-cn',
	'zh-TW': '/zh-tw',
} as const

export const ROUTE_LOCALES = {
	'zh-cn': 'zh-CN',
	'zh-tw': 'zh-TW',
	es: 'es',
} as const

export type AppLocale = keyof typeof LANGUAGE_ALTERNATES
export type RouteLocale = keyof typeof ROUTE_LOCALES

const OG_LOCALES: Record<AppLocale, string> = {
	en: 'en_US',
	es: 'es_ES',
	'zh-CN': 'zh_CN',
	'zh-TW': 'zh_TW',
}

type LocaleMetadata = {
	title: string
	description: string
	ogDescription: string
	keywords: string[]
}

export function buildWechatMetadata({
	title,
	description,
	path,
}: {
	title: string
	description: string
	path: string
}): NonNullable<Metadata['other']> {
	return {
		'wechat:title': title,
		'wechat:description': description,
		'wechat:image': SHARE_IMAGE_URL,
		'wechat:url': `${SITE_URL}${path}`,
		'itemprop:name': title,
		'itemprop:description': description,
		'itemprop:image': SHARE_IMAGE_URL,
	}
}

const METADATA_BY_LOCALE: Record<AppLocale, LocaleMetadata> = {
	en: {
		title: 'SmartCV - Free AI Resume Builder',
		description:
			'Build polished, ATS-friendly resumes with SmartCV, an open-source AI resume builder with local storage, multiple templates, and export tools.',
		ogDescription:
			'Create ATS-friendly resumes with AI optimization, professional templates, local-first privacy, and export-ready formatting.',
		keywords: [
			'AI resume builder',
			'free resume builder',
			'ATS resume',
			'CV maker',
			'open source resume builder',
			'SmartCV',
		],
	},
	es: {
		title: 'SmartCV - Creador de CV gratis con IA',
		description:
			'Crea CVs pulidos y compatibles con ATS con SmartCV, un creador de CVs con IA de código abierto, almacenamiento local, múltiples plantillas y herramientas de exportación.',
		ogDescription:
			'Crea CVs compatibles con ATS con optimización de IA, plantillas profesionales, privacidad local y formato listo para exportar.',
		keywords: [
			'creador de CV con IA',
			'creador de CV gratis',
			'CV compatible con ATS',
			'hacer CV',
			'creador de CV open source',
			'SmartCV',
		],
	},
	'zh-CN': {
		title: 'SmartCV - 免费 AI 简历生成器',
		description:
			'使用 SmartCV 打造专业且 ATS 友好的简历。SmartCV 是一款开源 AI 简历生成器，支持本地存储、多种模板和导出工具。',
		ogDescription: '使用 AI 优化、专业模板、本地优先隐私和可导出格式，创建 ATS 友好的简历。',
		keywords: [
			'AI 简历生成器',
			'免费简历生成器',
			'ATS 简历',
			'简历制作',
			'开源简历生成器',
			'SmartCV',
		],
	},
	'zh-TW': {
		title: 'SmartCV - 免費 AI 履歷產生器',
		description:
			'使用 SmartCV 打造專業且 ATS 友善的履歷。SmartCV 是一款開源 AI 履歷產生器，支援本地儲存、多種模板與匯出工具。',
		ogDescription: '使用 AI 優化、專業模板、本地優先隱私與可匯出格式，建立 ATS 友善的履歷。',
		keywords: [
			'AI 履歷產生器',
			'免費履歷產生器',
			'ATS 履歷',
			'履歷製作',
			'開源履歷產生器',
			'SmartCV',
		],
	},
}

export function buildLandingMetadata(locale: AppLocale): Metadata {
	const localeMetadata = METADATA_BY_LOCALE[locale]
	const path = LANGUAGE_ALTERNATES[locale]

	return {
		title: {
			absolute: localeMetadata.title,
		},
		description: localeMetadata.description,
		keywords: localeMetadata.keywords,
		alternates: {
			canonical: path,
			languages: LANGUAGE_ALTERNATES,
		},
		openGraph: {
			type: 'website',
			url: path,
			siteName: 'SmartCV',
			locale: OG_LOCALES[locale],
			alternateLocale: Object.keys(LANGUAGE_ALTERNATES)
				.filter(candidate => candidate !== locale)
				.map(candidate => OG_LOCALES[candidate as AppLocale]),
			title: localeMetadata.title,
			description: localeMetadata.ogDescription,
			images: [
				{
					url: SHARE_IMAGE_URL,
					width: SHARE_IMAGE_WIDTH,
					height: SHARE_IMAGE_HEIGHT,
					alt: 'SmartCV',
				},
			],
		},
		twitter: {
			card: 'summary',
			title: localeMetadata.title,
			description: localeMetadata.ogDescription,
			images: [SHARE_IMAGE_URL],
		},
		other: buildWechatMetadata({
			title: localeMetadata.title,
			description: localeMetadata.ogDescription,
			path,
		}),
	}
}
