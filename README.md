* 合并多个geoip、geosite、clash-classic

```bash
root@proxy:~# node testGeo.js
geoip: cn cidr size: 7739
geoip: youtube cidr size: 2 
geoip: google cidr size: 430
geoip: telegram cidr size: 8
geoip: media cidr size: 893 
geosite: cn domain size: 71052
geosite: ai domain size: 44         
geosite: youtube domain size: 179   
geosite: google domain size: 904    
geosite: telegram domain size: 19   
geosite: github domain size: 26     
geosite: netflix domain size: 27    
geosite: microsoft domain size: 559 
geosite: games domain size: 531     
geosite: chinagames domain size: 151
geosite: discord domain size: 28    
geosite: media domain size: 1090    
geosite: gfw domain size: 22225
```
> **gfw**包含除**cn**、**chinagames**外所有类别的域名

**Config.yaml**
```yaml
....

geodata-mode: true
geox-url:
  geoip: https://cdn.jsdelivr.net/gh/danger-dream/ClashRule@release/geoip.dat
  geosite: https://cdn.jsdelivr.net/gh/danger-dream/ClashRule@release/geosite.dat
geodata-loader: standard
tcp-concurrent: true
unified-delay: true

dns:
  enable: true
  ipv6: false
  enhanced-mode: redir-host
  listen: 0.0.0.0:53
  # 自行更换doh...
  nameserver: [223.6.6.6]
  fallback: [8.8.8.8, 1.1.1.1]
  fallback-filter: { geoip: true, geoip-code: CN, geosite: [gfw], ipcidr: [240.0.0.0/4] }
  proxy-server-nameserver: [223.6.6.6]
  nameserver-policy: { geosite:cn: [223.6.6.6], geosite:gfw: [8.8.8.8, 1.1.1.1] }

tun:
  enable: true
  stack: system #gvisor
  device: utun
  auto-route: true
  auto-detect-interface: true
  dns-hijack: [any:53, tcp://any:53]

sniffer:
  enable: true
  force-dns-mapping: true
  parse-pure-ip: true
  override-destination: false
  skip-domain: ['Mijia Cloud']
  sniff: { HTTP: { ports: [80, 8080-8880], override-destination: true }, TLS: { ports: [443, 8443] } }

proxies:
 - { name: xxx, type: ss, server: ..., port: 2222, cipher: 2022-blake3-aes-128-gcm, password:'' }

proxy-groups:
  - { name: 国外流量, type: select, proxies: [xxx, 最快美国, 美国, 香港, 日本, 新加坡, 自动选择, 故障转移, 手动选择] }
  - { name: 故障转移, type: fallback, url: http://www.gstatic.com/generate_204, interval: 300, tolerance: 50, proxies: [xxx], use: [jssr, byg, nexitally] }
  - { name: 自动选择, type: url-test, url: http://www.gstatic.com/generate_204, interval: 300, tolerance: 50, use: [jssr, byg, nexitally] }
  - { name: 香港, type: select, use: [jssr, byg, nexitally], filter: 香港 }
  - { name: 美国, type: select, proxies: [xxx], use: [jssr, byg, nexitally], filter: 美国 }
  - { name: 最快美国, type: url-test, url: http://www.gstatic.com/generate_204, interval: 300, tolerance: 50, proxies: [xxx], use: [jssr, byg, nexitally], filter: 美国 }
  - { name: 日本, type: select, use: [jssr, byg, nexitally], filter: 日本 }
  - { name: 新加坡, type: select, use: [jssr, byg, nexitally], filter: 新加坡 }
  - { name: 手动选择, type: select, proxies: [xxx], use: [jssr, byg, nexitally] }
  - { name: 国内流量, type: select, proxies: [DIRECT, 手动选择] }
  - { name: AI, type: select, proxies: [xxx, 最快美国, 美国, 日本, 新加坡, 手动选择] }
  - { name: GitHub, type: select, proxies: [国外流量, 最快美国, 美国, 日本, 香港, 新加坡, 自动选择, 手动选择] }
  - { name: 谷歌, type: select, proxies: [国外流量, 最快美国, 美国, 日本, 香港, 新加坡, 自动选择, 手动选择] }
  - { name: 微软服务, type: select, proxies: [国外流量, 最快美国, 美国, 日本, 香港, 新加坡, 自动选择, 手动选择] }
  - { name: YouTube, type: select, proxies: [国外流量, 最快美国, 美国, 日本, 香港, 新加坡, 自动选择, 手动选择] }
  - { name: Telegram, type: select, proxies: [国外流量, 最快美国, 美国, 日本, 香港, 新加坡, 自动选择, 手动选择] }
  - { name: Discord, type: select, proxies: [国外流量, 最快美国, 美国, 日本, 香港, 新加坡, 自动选择, 手动选择] }
  - { name: Netflix, type: select, proxies: [国外流量, 最快美国, 美国, 日本, 香港, 新加坡, 自动选择, 手动选择] }
  - { name: 国外媒体, type: select, proxies: [国外流量, 最快美国, 美国, 日本, 香港, 新加坡, 自动选择, 手动选择] }
  - { name: 游戏平台, type: select, proxies: [国外流量, 国内流量, 最快美国, 美国, 日本, 香港, 新加坡, 自动选择, 手动选择] }
  - { name: 漏网之鱼, type: select, proxies: [国外流量, 国内流量, 手动选择] }
rules:
  - DOMAIN-SUFFIX,okex.com,国内流量
  - DOMAIN-SUFFIX,oklink.com,国内流量
  - DOMAIN-SUFFIX,okx.com,国内流量
#  - GEOSITE,ads,REJECT
  - GEOSITE,cn,国内流量
  - GEOSITE,chinagames,国内流量
  - GEOSITE,ai,AI
  - GEOSITE,youtube,YouTube
  - GEOSITE,google,谷歌
  - GEOSITE,telegram,Telegram
  - GEOSITE,github,GitHub
  - GEOSITE,netflix,Netflix
  - GEOSITE,microsoft,微软服务
  - GEOSITE,games,游戏平台
  - GEOSITE,discord,Discord
  - GEOSITE,media,国外媒体
  - GEOIP,youtube,YouTube
  - GEOIP,google,谷歌
  - GEOIP,telegram,Telegram
  - GEOIP,media,国外媒体
  - GEOIP,cn,国内流量
  - MATCH,漏网之鱼

proxy-providers:
  jssr:
    type: http
    url: ""
    interval: 3600
    path: ./proxies/jssr.yaml
    exclude-filter: vip1
    health-check: { enable: true, interval: 600, url: https://www.gstatic.com/generate_204 }
  byg:
    type: http
    url: ""
    interval: 3600
    path: ./proxies/byg.yaml
    health-check: { enable: true, interval: 600, url: https://www.gstatic.com/generate_204 }
  nexitally:
    type: http
    url: ""
    interval: 3600
    path: ./proxies/nexitally.yaml
    health-check: { enable: true, interval: 600, url: https://www.gstatic.com/generate_204 }
```
