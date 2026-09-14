# Nexus Recon

Create a dark-themed, military-grade Cyber Threat Intelligence & IP Forensics Laboratory named "NEXUS-IP Recon Lab". The interface must feature a Web3 / Cyberpunk Dark Mode (Deep Black #090A0F, Neon Green #00FF66, Cyber Cyan #00E5FF, Alert Red #FF0055, Muted Slate #1E2230) with monospace typography for logs and telemetry metrics.

### System Architecture & Functional Requirements

1. **Top Bar / Operational Controls:**
   - Input field for target IP address (default pre-filled with `189.38.41.40`).
   - Action buttons: `[START REAL-TIME RECON]`, `[LOAD MOCK DATASET]`, `[EXPORT FORENSIC PDF DOSSIER]`.
   - Real-time status indicators: API Health Check (bgp.tools, Shodan/InternetDB, IPinfo, Censys), Target Risk Score Meter (0-100), and Passive Listener Status.

2. **Module 1: Passive Recon & ASN/BGP Route Tracking (Free Real-World API + Mock Fallback)**
   - Integrate public APIs: `https://ipapi.co/{ip}/json/` and `https://internetdb.shodan.io/{ip}` (both free, no key required).
   - **BGP & ASN Analytics Card:** Display Autonomous System (AS28309), ISP Name, CIDR Block, Country/Region/City.
   - **BGP Route Leak & Peering Topology:** Interactive visual route graph displaying source packet trajectory through Tier-1 Upstreams (e.g., Telia -> Lumen -> WGO Telecom IXP -> Target Edge).

3. **Module 2: Port Banner Grabbing & Active Fingerprinting (Shodan InternetDB API)**
   - Query exposed ports, hostnames, and vulnerabilities dynamically.
   - **Banner Inspector Terminal:** Render realistic terminal logs showing raw banner grabs:
     - Port 8291: RouterOS / MikroTik Winbox banner.
     - Port 80/443: Webserver headers, Server OS identification, and Firmware versioning (e.g., `Server: WGO-ONT-GW/2.4.1`).
     - Port 22/SSH: OpenSSH version strings and RSA/ED25519 public key fingerprints.
   - **SSL/TLS Certificate Analyzer:** Parse auto-signed certs showing Subject Alternative Names (SANs), Common Name (CN), Issuer, Expiration, and embedded user/hostname leaks (e.g., `admin@wgo-internal.net`).

4. **Module 3: Passive SIGINT & Traffic Side-Channel Analysis (Simulated Lab)**
   - **Traffic Pattern Graph:** Real-time canvas/recharts showing packet size distributions and inter-arrival times.
   - **Protocol Classifier Widget:** AI/Heuristic tagger identifying likelihood of encrypted streams:
     - `C2 Beaconing (94.2% match - 60s heartbeats)`
     - `VoIP/Media Stream (UDP Burst Pattern)`
     - `Encrypted VPN Tunneling (WireGuard/OpenVPN)`

5. **Module 4: OSINT & Ad-Tech Correlation Matrix**
   - **Historical Port Changes:** Timeline table showing active ports over the last 12 months (Censys/Sonar historical style).
   - **Ad-Tech (MAID/GPS) Triangulation Simulation:** Correlation panel matching IP subnets with synthetic Mobile Advertising IDs (MAIDs) and estimated GPS cluster points.

6. **Module 5: Forensic Dossier & Legal Chain of Custody**
   - Panel generating structured evidentiary report formatted for law enforcement submission (Marco Civil da Internet Art. 10/15 compliance).
   - Timestamping (UTC), IP + Port Mapping table, and automated draft for ISP Data Preservation Order.

### Layout Instructions
- Use a multi-tab dashboard layout: 
  - Tab 1: `Overview & Risk Score`
  - Tab 2: `BGP & Network SIGINT`
  - Tab 3: `Port Banners & SSL SANs`
  - Tab 4: `OSINT & Ad-Tech Correlation`
  - Tab 5: `Legal Forensic Dossier`
- Include a toggle between `Live API Mode` and `Simulated Heavy-Attack Mock Mode`.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/250befe9-fce9-49ce-91a8-f7aa6f0478e2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
