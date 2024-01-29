function getIpRange(ip, maskStr) {
	if (ip.includes('/')) {
		const [ipStr, mask] = ip.split('/')
		maskStr = mask
		ip = ipStr
	}
	let ips = []
	if (typeof ip === 'string' && ip.indexOf('.') > -1) {
		ips = ip.split('.').map(x => parseInt(x, 10))
	} else if (ip instanceof Buffer) {
		ips = [...ip]
	} else if (Array.isArray(ip)) {
		ips = ip
	} else {
		throw new Error('Invalid ip address: ' + ip)
	}
	
	let bitmask = maskStr ? parseInt(maskStr, 10) : 32
	if (!(bitmask <= 32)) {
		throw new Error('Invalid mask for ip4: ' + maskStr)
	}
	const ipLong = (ips[0] << 24 | ips[1] << 16 | ips[2] << 8 | ips[3]) >>> 0
	let maskLong = 0
	if (bitmask > 0) {
		maskLong = (0xffffffff << (32 - bitmask)) >>> 0
	}
	let netLong = 0
	try {
		netLong = (ipLong & maskLong) >>> 0
	} catch (error1) {
		throw new Error('Invalid net address: ' + ip + '/' + bitmask)
	}
	const size = Math.pow(2, 32 - bitmask)
	return { start: netLong, end: netLong + size - 1, ip: Buffer.from(ips), mask: bitmask }
}

class Cidr {
	list = []
	
	add(ip, prefix) {
		this.list.push(getIpRange(ip, prefix))
	}
	
	addCidr(cidr) {
		this.list.push(cidr)
	}
	
	contains(ip) {
		const { start, end } = getIpRange(ip)
		for (const { start: s, end: e } of this.list) {
			if (start >= s && end <= e) {
				return true
			}
		}
		return false
	}
	
	containsCidr(cidr) {
		const { start, end } = cidr
		for (const { start: s, end: e } of this.list) {
			if (start >= s && end <= e) {
				return true
			}
		}
		return false
	}
	
	size() {
		return this.list.length
	}
	
	static compare(ip1, ip2){
		const range1 = getIpRange(ip1)
		const range2 = getIpRange(ip2)
		return range2.start >= range1.start && range2.end <= range1.end
	}
	
	removeCidr(cidr) {
		const { start, end } = cidr
		for (let i = 0; i < this.list.length; i++) {
			const { start: s, end: e } = this.list[i]
			if (start === s && end === e) {
				this.list.splice(i, 1)
				return
			}
		}
	}
	
	toList(){
		const list = []
		for (const item of this.list) {
			list.push({ ip: item.ip, prefix: item.mask })
		}
		return list
	}
}

module.exports = Cidr