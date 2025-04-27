const os = require("os");
const disk = require("diskusage");
const osu = require("node-os-utils");
const { formatBytes } = require("./utils");
const si = require("systeminformation");

async function getDiskStats(path = "/") {
  try {
    const { available, free, total } = await disk.check(path);
    const used = total - free;
    const usedPercent = ((used / total) * 100).toFixed(2);
    return {
      path,
      total: formatBytes(total),
      used: formatBytes(used),
      available: formatBytes(available),
      usedPercent: `${usedPercent}%`,
    };
  } catch (err) {
    console.error(`Error getting disk stats for path "${path}":`, err);
    return null;
  }
}

async function getNetworkStats() {
  const platform = os.platform();
  if (platform === "win32") {
    try {
      const interfaces = await si.networkStats();

      return interfaces.map((iface) => ({
        interface: iface.iface,
        inputBytes: formatBytes(iface.rx_bytes),
        outputBytes: formatBytes(iface.tx_bytes),
        totalBytes: formatBytes(iface.rx_bytes + iface.tx_bytes),
      }));
    } catch (err) {
      console.error("Error getting network stats (Windows):", err);
      return [];
    }
  } else {
    try {
      const stats = await osu.netstat.stats();
      return stats.map((iface) => ({
        interface: iface.interface,
        inputBytes: formatBytes(iface.inputBytes),
        outputBytes: formatBytes(iface.outputBytes),
        totalBytes: formatBytes(
          Number.parseInt(iface.inputBytes) +
            Number.parseInt(iface.outputBytes),
        ),
      }));
    } catch (err) {
      console.error("Error getting network stats (Unix):", err);
      return [];
    }
  }
}

async function getLoadAverage() {
  const platform = os.platform();
  if (platform === "win32") {
    const cpuUsage = await osu.cpu.usage();
    return [cpuUsage, cpuUsage, cpuUsage];
  } else {
    return os.loadavg();
  }
}

exports.getStats = async function getStats() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const usedMemPercent = ((usedMem / totalMem) * 100).toFixed(2);
  const uptime = os.uptime();
  const cpuUsage = await osu.cpu.usage();
  const cpus = os.cpus();
  const diskStats = await getDiskStats(
    os.platform() === "win32" ? "C:\\" : "/",
  );
  const networkStats = await getNetworkStats();
  const load_average = await getLoadAverage();

  return {
    cpu: `${cpuUsage.toFixed(2)}%`,
    cpu_name: cpus[0]?.model || "Unknown",
    ram: `${usedMemPercent}%`,
    uptime,
    ram_text: `${formatBytes(usedMem)} / ${formatBytes(totalMem)} (${usedMemPercent}%)`,
    platform: os.platform(),
    architecture: os.arch(),
    cpu_cores: cpus.length,
    hostname: os.hostname(),
    load_average,
    disk: diskStats,
    network: networkStats,
  };
};
