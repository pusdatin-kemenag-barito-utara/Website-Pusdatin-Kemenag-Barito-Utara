import { NextResponse } from 'next/server';
import si from 'systeminformation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const [cpu, mem, network, fs, time] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.networkStats(),
      si.fsSize(),
      si.time()
    ]);

    // Aggregate network stats across all interfaces
    let rxSec = 0;
    let txSec = 0;
    for (const net of network) {
      if (net.rx_sec > 0 || net.tx_sec > 0) {
        rxSec += net.rx_sec;
        txSec += net.tx_sec;
      }
    }

    // Calculate total storage
    let totalStorage = 0;
    let usedStorage = 0;
    if (fs && Array.isArray(fs)) {
      for (const disk of fs) {
        totalStorage += disk.size || 0;
        usedStorage += disk.used || 0;
      }
    }

    const data = {
      cpu: {
        load: cpu?.currentLoad ?? 0,
        avgLoad: cpu?.avgLoad ?? 0,
        cores: cpu?.cpus?.length ?? 0,
      },
      ram: {
        total: mem?.total ?? 0,
        used: mem?.active ?? 0,
        free: mem?.available ?? 0,
      },
      storage: {
        total: totalStorage,
        used: usedStorage,
      },
      network: {
        rxSec,
        txSec,
      },
      uptime: time?.uptime ?? 0,
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error('Realtime system metric error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch realtime metrics' },
      { status: 500 }
    );
  }
}
