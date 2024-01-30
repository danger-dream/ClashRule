const DOH = require('./doh')
const Geo = require('./geo')
const geo = new Geo()

async function matchDomain(domain, rules) {
	let ip = ''
	for (const item of rules) {
		let [type, value, strategy] = item.split(',')
		value = value.toLowerCase()
		let match = false
		if (type === 'GEOSITE') {
			match = geo.containsGeoSite(domain, value)
		} else if (type === 'GEOIP') {
			if (!ip) {
				ip = await DOH.resolve(DOH.provider.alidns, domain, 'A')
				console.log(`在匹配${ strategy }策略时进行DNS查询：${ip}`)
			}
			match = geo.containsGeoIp(ip, value)
		}
		if (match) {
			console.log(`匹配规则：${item}`)
			return strategy
		}
	}
	console.log(`匹配规则：未匹配`)
	return '未匹配'
}

async function start() {
	await geo.loadGeoIp('./geoip.dat')
	await geo.loadGeoSite('./geosite.dat')
	
	const domian = 'www.okx.com'
	let st = Date.now()
	await matchDomain(domian, [
		'GEOSITE,cn,CN',
		'GEOSITE,ai,ai',
		'GEOSITE,youtube,youtube',
		'GEOSITE,google,google',
		'GEOSITE,telegram,telegram',
		'GEOSITE,github,github',
		'GEOSITE,netflix,netflix',
		'GEOSITE,microsoft,microsoft',
		'GEOSITE,chinagames,ChinaGames',
		'GEOSITE,games,games',
		'GEOSITE,discord,discord',
		'GEOSITE,media,media',
		'GEOIP,youtube,youtube',
		'GEOIP,google,google',
		'GEOIP,telegram,telegram',
		'GEOIP,media,media',
		'GEOIP,cn,CN'
	])
	console.log('耗时：' + (Date.now() - st))
	
	
	const ip = '119.8.2.121'
	st = Date.now()
	console.log('匹配IP', geo.containsGeoIp(ip) || '未匹配')
	console.log('耗时：' + (Date.now() - st))
}

start().then(() => {
	console.log('done')
	process.exit(0)
}).catch(console.error)