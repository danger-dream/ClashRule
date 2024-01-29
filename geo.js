const fs = require('fs')
const { join } = require('path')
const protobuf = require('protobufjs')
const Cidr = require('./cidr')
const v2ray = protobuf.loadSync(join(__dirname, 'v2ray.proto'))
const URL = require('url').URL

const GeositeType = {
	Plain: 0,
	Regex: 1,
	RootDomain: 2,
	Full: 3
}

class Geo {
	domainMap = {}
	ipMap = {}
	
	async loadGeoIp(filename) {
		const GeoSiteList = v2ray.lookupType('v2ray.GeoIPList')
		const message = GeoSiteList.decode(fs.readFileSync(filename))
		for (const item of message['entry']) {
			const code = item['countryCode'].toLowerCase()
			const cidr = new Cidr()
			for (const { ip, prefix } of item['cidr']) {
				try {
					cidr.add(Buffer.isBuffer(ip) ? ip : Buffer.from(ip, 'base64'), prefix)
				} catch {}
			}
			if (cidr.size() > 0) {
				this.ipMap[code] = cidr
			}
		}
	}
	
	containsGeoIp(ip, code) {
		if (code) {
			const cidr = this.ipMap[code]
			if (cidr && cidr.contains(ip)) {
				return code
			}
		} else {
			for (const k in this.ipMap) {
				const cidr = this.ipMap[k]
				if (cidr.contains(ip)) {
					return k
				}
			}
		}
		return ''
	}
	
	async loadGeoSite(filename) {
		const GeoSiteList = v2ray.lookupType('v2ray.GeoSiteList')
		const message = GeoSiteList.decode(fs.readFileSync(filename))
		for (const item of message['entry']) {
			const code = item['countryCode'].toLowerCase()
			const domains = []
			for (const domain of item['domain']) {
				domains.push({ type: domain['type'], value: domain['value'] })
			}
			this.domainMap[code] = domains
		}
	}
	
	containsGeoSite(domain, countryCode) {
		const hostname = new URL('https://' + domain).hostname
		const parts = hostname.split('.')
		let rootDomain = hostname
		if (parts.length >= 2){
			rootDomain = parts.slice(-2).join('.')
		}
		for (const k in this.domainMap) {
			if (countryCode && k !== countryCode) {
				continue
			}
			const domains = this.domainMap[k]
			if (!domains) {
				continue
			}
			
			for (const { type, value } of domains) {
				switch (type) {
					case GeositeType.Plain:
						if (value.includes(domain)) {
							return k
						}
						break
					case GeositeType.Regex:
						if (new RegExp(value).test(domain)) {
							return k
						}
						break
					case GeositeType.RootDomain:
						if (rootDomain === value) {
							return k
						}
						break
					case GeositeType.Full:
						if (value === domain) {
							return k
						}
						break
				}
			}
		}
		return ''
	}
}

module.exports = Geo