const Packet = require("native-dns-packet");

function getDomainType(domainType) {
	switch (domainType.toUpperCase()) {
		case 'A': return 1;
		case 'AAAA': return 28;
		case 'CAA': return 257;
		case 'CNAME': return 5;
		case 'DS': return 43;
		case 'DNSKEY': return 48;
		case 'MX': return 15;
		case 'NS': return 2;
		case 'NSEC': return 47;
		case 'NSEC3': return 50;
		case 'RRSIG': return 46;
		case 'SOA': return 6;
		case 'TXT': return 16;
		default: return 1;
	}
}

class Doh {
	static provider = {
		alidns: 'https://223.6.6.6/dns-query',
		google: 'https://dns.google/dns-query',
		cloudflare: 'https://cloudflare-dns.com/dns-query'
	}
	
	static async resolve(provider, domian, domainType) {
		try {
			const type = getDomainType(domainType)
			const dnsPacket = new Packet();
			const dnsBuf = Buffer.alloc(128)
			dnsPacket.question.push({ name: domian, type, class: 1 })
			Packet.write(dnsBuf, dnsPacket)
			const query = `${provider}?dns=${dnsBuf.toString('base64').replace(/=+/, '')}`
			const res = await fetch(query, {
				method: 'GET',
				headers: {
					'Accept': 'application/dns-message',
					'Content-type': 'application/dns-message'
				}
			})
			const dnsResult = Buffer.from(await res.arrayBuffer())
			const result = Packet.parse(dnsResult)
			return result.answer.find(x => x.type === type)?.address
		} catch (e) {
			return ''
		}
	}
}
module.exports = Doh