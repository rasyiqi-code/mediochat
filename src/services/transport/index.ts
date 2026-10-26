import type { ITransportService } from './types';
import { LanTransportService } from './lan';
import { CloudflareWebRtcTransportService } from './cloudflare';
import { EnterpriseServerTransportService } from './enterprise';

export * from './types';
export * from './lan';
export * from './cloudflare';
export * from './enterprise';

const lanInstance = new LanTransportService();
const cfInstance = new CloudflareWebRtcTransportService();
const enterpriseInstance = new EnterpriseServerTransportService();

export function getTransportService(
  mode: 'lan_p2p' | 'cloudflare_hybrid' | 'enterprise_server'
): ITransportService {
  switch (mode) {
    case 'cloudflare_hybrid':
      return cfInstance;
    case 'enterprise_server':
      return enterpriseInstance;
    case 'lan_p2p':
    default:
      return lanInstance;
  }
}
