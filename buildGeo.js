const protobuf = require('protobufjs')
const Cidr = require('./cidr')
const { join } = require('path')
const yaml = require('js-yaml')
const fs = require('fs')
const v2ray = protobuf.loadSync(join(__dirname, 'v2ray.proto'))

const baseGeoIp = 'https://cdn.jsdelivr.net/gh/Loyalsoldier/v2ray-rules-dat@release/geoip.dat'
const baseGeoSite = 'https://cdn.jsdelivr.net/gh/Loyalsoldier/v2ray-rules-dat@release/geosite.dat'
const metaGeoSite = 'https://cdn.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geosite.dat'

const cfg = {
	geoip: { private: baseGeoIp, cn: baseGeoIp, lan: baseGeoIp, google: baseGeoIp, netflix: baseGeoIp, telegram: baseGeoIp },
	geosite: {
		private: [baseGeoSite, metaGeoSite],
		cn: [baseGeoSite, metaGeoSite],
		apple: [baseGeoSite, metaGeoSite],
		google: [baseGeoSite, metaGeoSite],
		telegram: [baseGeoSite, metaGeoSite],
		github: [baseGeoSite, metaGeoSite],
		netflix: [baseGeoSite, metaGeoSite],
		microsoft: [baseGeoSite, metaGeoSite],
		'category-ads-all': [baseGeoSite, metaGeoSite],
		'geolocation-cn': [baseGeoSite, metaGeoSite],
		'category-games': [baseGeoSite, metaGeoSite],
		'category-games@cn': [baseGeoSite, metaGeoSite],
		gfw: [baseGeoSite, metaGeoSite],
		'geolocation-!cn': [baseGeoSite, metaGeoSite],
	},
	ruleSet: {
		paypal: 'https://cdn.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/PayPal/PayPal.yaml',
		ai: 'https://cdn.jsdelivr.net/gh/danger-dream/ClashRule@main/Rule/AI.yaml',
		youtube: 'https://cdn.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/YouTube/YouTube.yaml',
		discord: 'https://cdn.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/Discord/Discord.yaml',
		国内媒体: 'https://cdn.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/ChinaMedia/ChinaMedia.yaml',
		国外媒体: 'https://cdn.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/Clash/GlobalMedia/GlobalMedia_Classical.yaml'
	}
}

const cacheMap = {}

function uniq(arr) {
	const seen = new Map()
	const result = []
	for (const item of arr) {
		if (seen.has(JSON.stringify(item))) {
			continue
		}
		seen.set(JSON.stringify(item), true)
		result.push(item)
	}
	return result
}

async function loadGeoIp(url) {
	if (cacheMap[url]) {
		return cacheMap[url]
	}
	const res = await fetch(url)
	const site = Buffer.from(await res.arrayBuffer())
	const GeoSiteList = v2ray.lookupType('v2ray.GeoIPList')
	const message = GeoSiteList.decode(site)
	const map = {}
	for (const item of message['entry']) {
		const code = item['countryCode'].toLowerCase()
		map[code] = new Cidr()
		item['cidr'].filter(x => x['ip'].length <= 4 && x['prefix'] <= 32).forEach(x => {
			try {
				map[code].add(Buffer.isBuffer(x['ip']) ? x['ip'] : Buffer.from(x['ip'], 'base64'), x['prefix'])
			} catch {}
		})
	}
	cacheMap[url] = map
	return map
}

async function loadGeoSite(url) {
	if (cacheMap[url]) {
		return cacheMap[url]
	}
	const res = await fetch(url)
	const site = Buffer.from(await res.arrayBuffer())
	const GeoSiteList = v2ray.lookupType('v2ray.GeoSiteList')
	const message = GeoSiteList.decode(site)
	const map = {}
	for (const item of message['entry']) {
		const code = item['countryCode'].toLowerCase()
		const domains = []
		const attributes = {}
		for (const domain of item['domain']) {
			if (domain['attribute']?.length > 0) {
				for (const attribute of domain['attribute']) {
					const k = attribute['key']
					if (!attributes[k]) {
						attributes[k] = []
					}
					attributes[k].push(domain)
				}
			}
			domains.push({ type: domain['type'], value: domain['value'] })
		}
		map[code] = uniq(domains)
		
		for (const k of Object.keys(attributes)) {
			const attributeDomains = []
			for (const domain of attributes[k]) {
				attributeDomains.push({ type: domain['type'], value: domain['value'] })
			}
			map[code + '@' + k] = uniq(attributeDomains)
		}
	}
	cacheMap[url] = map
	return map

}

async function loadRuleSet(url) {
	if (cacheMap[url]) {
		return cacheMap[url]
	}
	const res = await fetch(url)
	const text = await res.text()
	const list = yaml.load(text).payload
	cacheMap[url] = list
	return list
}

async function start() {
	for (const k of Object.keys(cfg.geoip)) {
		cfg.geoip[k] = (await loadGeoIp(cfg.geoip[k]))[k]
	}
	for (const k of Object.keys(cfg.geosite)) {
		const list = []
		for (const item of cfg.geosite[k]) {
			list.push((await loadGeoSite(item))[k])
		}
		cfg.geosite[k] = list
	}
	for (const k of Object.keys(cfg.ruleSet)) {
		cfg.ruleSet[k] = await loadRuleSet(cfg.ruleSet[k])
	}
	const ruleConfig = [
		{ name: 'ads', geosite: [cfg.geosite['category-ads-all']], weight: 1, cn: true },
		{
			name: 'cn', weight: 10, cn: true,
			geosite: [cfg.geosite.private, cfg.geosite.cn, cfg.geosite.apple, cfg.geosite['geolocation-cn']],
			ruleSet: [cfg.ruleSet['国内媒体'], cfg.ruleSet.paypal],
			geoip: [cfg.geoip.private, cfg.geoip.lan, cfg.geoip.cn]
		},
		{ name: 'ai', ruleSet: [cfg.ruleSet.ai], weight: 99 },
		{ name: 'youtube', ruleSet: [cfg.ruleSet.youtube], weight: 99 },
		{ name: 'google', geosite: [cfg.geosite.google], geoip: [cfg.geoip.google], weight: 40 },
		{ name: 'telegram', geosite: [cfg.geosite.telegram], geoip: [cfg.geoip.telegram], weight: 99 },
		{ name: 'github', geosite: [cfg.geosite.github], weight: 99 },
		{ name: 'netflix', geosite: [cfg.geosite.netflix], weight: 99 },
		{ name: 'microsoft', geosite: [cfg.geosite.microsoft], weight: 49 },
		{ name: 'games', geosite: [cfg.geosite['category-games']], weight: 50 },
		{ name: 'chinagames', geosite: [cfg.geosite['category-games@cn']], weight: 99, cn: true },
		{ name: 'discord', ruleSet: [cfg.ruleSet.discord], weight: 99 },
		{ name: 'media', ruleSet: [cfg.ruleSet.国外媒体], weight: 9 },
		{ name: 'gfw', geosite: [cfg.geosite.gfw, cfg.geosite['geolocation-!cn']] },
	]
	const geoip = { entry: [] }
	const geosite = { entry: [] }
	for (const item of ruleConfig) {
		if (item.name === 'gfw') {
			continue
		}
		let curGeoIP = geoip.entry.find(x => x.countryCode.toLowerCase() === item.name)
		if (!curGeoIP) {
			curGeoIP = { countryCode: item.name, cidr: new Cidr(), weight: item.weight }
			geoip.entry.push(curGeoIP)
		}
		let curGeoSite = geosite.entry.find(x => x.countryCode.toLowerCase() === item.name)
		if (!curGeoSite) {
			curGeoSite = { countryCode: item.name, domain: [], weight: item.weight }
			geosite.entry.push(curGeoSite)
		}
		if (item.geosite) {
			const geoSiteRuleMap = {}
			for (const arr of item.geosite) {
				for (const geosite of arr) {
					for (const d of geosite) {
						geoSiteRuleMap[d.value + '|' + d.type] = d
					}
				}
			}
			for (const k of Object.keys(geoSiteRuleMap)) {
				curGeoSite.domain.push(geoSiteRuleMap[k])
			}
		}
		
		if (item.ruleSet) {
			for (const ruleSet of item.ruleSet) {
				for (const rule of ruleSet) {
					const [type, value] = rule.split(',')
					if (['DOMAIN', 'DOMAIN-SUFFIX', 'DOMAIN-KEYWORD'].includes(type)) {
						if (!curGeoSite.domain.find(x => x.value === value)) {
							switch (type) {
								case 'DOMAIN': // Full domain
									curGeoSite.domain.push({ type: 3, value: value, attribute: [] })
									break
								case 'DOMAIN-SUFFIX': // RootDomain
									curGeoSite.domain.push({ type: 2, value: value, attribute: [] })
									break
								case 'DOMAIN-KEYWORD': // Plain
									curGeoSite.domain.push({ type: 0, value: value, attribute: [] })
									break
							}
						}
					} else if (type === 'IP-CIDR') {
						if (curGeoIP.cidr.contains(value)) {
							continue
						}
						curGeoIP.cidr.add(value)
					}
				}
			}
		}
		
		if (item.geoip) {
			for (const ipCidr of item.geoip) {
				if (!ipCidr) {
					continue
				}
				for (const cidr of ipCidr.list) {
					if (curGeoIP.cidr.containsCidr(cidr)) {
						continue
					}
					curGeoIP.cidr.addCidr(cidr)
				}
			}
		}
	}
	for (const item of geoip.entry) {
		for (const ip of item.cidr.list) {
			let list = [item]
			for (const other of geoip.entry.filter(x => x.countryCode !== item.countryCode)) {
				if (other.cidr.containsCidr(ip)) {
					list.push(other)
				}
			}
			if (list.length > 1) {
				list = list.sort((a, b) => b.weight - a.weight)
				for (let i = 1; i < list.length; i++) {
					list[i].cidr.removeCidr(ip)
				}
				console.log('重复IP-CIDR', ip.ip.join('.') + '/' + ip.mask, '保留权重最高的:' + list[0].countryCode, '删除:' + list.slice(1).map(x => x.countryCode).join(','))
			}
		}
	}
	for (const item of geosite.entry) {
		for (const domain of item.domain) {
			let list = [item]
			for (const other of geosite.entry.filter(x => x.countryCode !== item.countryCode)) {
				if (other.domain.find(x => x.value === domain.value && x.type === domain.type)) {
					list.push(other)
				}
			}
			if (list.length > 1) {
				list = list.sort((a, b) => b.weight - a.weight)
				for (let i = 1; i < list.length; i++) {
					list[i].domain = list[i].domain.filter(x => !(x.value === domain.value && x.type === domain.type))
				}
				console.log('重复域名', domain.value, '保留权重最高的:' + list[0].countryCode, '删除:' + list.slice(1).map(x => x.countryCode).join(','))
			}
		}
	}
	geosite.entry = geosite.entry.filter(x => x.domain.length > 0)
	for (const item of geosite.entry) {
		item.domain = item.domain.filter(x => x.value.length > 0)
		for (const domain of item.domain) {
			delete domain.attribute
		}
		delete item.weight
	}
	
	const gfwRuleConfig = ruleConfig.find(x => x.name === 'gfw')
	if (gfwRuleConfig) {
		const geoSiteRuleMap = {}
		for (const arr of gfwRuleConfig.geosite) {
			for (const geosite of arr) {
				for (const d of geosite) {
					delete d.attribute
					geoSiteRuleMap[d.value + '|' + d.type] = d
				}
			}
		}
		for (const site of geosite.entry) {
			if (site.countryCode === 'cn') {
				continue
			}
			for (const d of site.domain) {
				geoSiteRuleMap[d.value + '|' + d.type] = d
			}
		}
		const domain = []
		for (const k of Object.keys(geoSiteRuleMap)) {
			domain.push(geoSiteRuleMap[k])
		}
		geosite.entry.push({ countryCode: 'gfw', domain: domain })
	}
	
	geoip.entry = geoip.entry.filter(x => x.cidr.size() > 0)
	for (const item of geoip.entry) {
		item.cidr = item.cidr.toList()
		delete item.weight
	}
	
	const arr = v2ray.lookupType('v2ray.GeoSiteList').encode(geosite).finish()
	fs.writeFileSync(join(__dirname, 'geosite.dat'), Buffer.from(arr))
	
	const arr2 = v2ray.lookupType('v2ray.GeoIPList').encode(geoip).finish()
	fs.writeFileSync(join(__dirname, 'geoip.dat'), Buffer.from(arr2))
}

start().then(() => console.log('done')).catch(console.error)