const fs = require('fs')
const protobuf = require('protobufjs')
const { join } = require('path')
const v2ray = protobuf.loadSync(join(__dirname, 'v2ray.proto'))

async function start(){
	const GeoSiteList = v2ray.lookupType('v2ray.GeoIPList')
	const geoip = GeoSiteList.decode(fs.readFileSync('./geoip.dat'))
	for (const item of geoip.entry) {
		console.log('geoip:', item.countryCode, 'cidr size:', item.cidr.length)
	}
	
	const GeoIPList = v2ray.lookupType('v2ray.GeoSiteList')
	const geosite = GeoIPList.decode(fs.readFileSync('./geosite.dat'))
	for (const item of geosite.entry) {
		console.log('geosite:', item.countryCode, 'domain size:', item.domain.length)
	}
	
}

start().then(() => {
	console.log('done')
}).catch(console.error)