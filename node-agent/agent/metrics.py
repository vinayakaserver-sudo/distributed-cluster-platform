import time
import httpx
import psutil
from datetime import datetime
from agent.schemas import NodeMetrics

class MetricsCollector:
    def collect(self) -> NodeMetrics:
        cpu_percent = psutil.cpu_percent(interval=0.5)
        ram = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        net = psutil.net_io_counters()

        return NodeMetrics(
            cpu_percent=cpu_percent,
            ram_percent=ram.percent,
            ram_used_mb=ram.used / (1024 * 1024),
            ram_total_mb=ram.total / (1024 * 1024),
            disk_percent=disk.percent,
            disk_used_gb=disk.used / (1024 * 1024 * 1024),
            disk_total_gb=disk.total / (1024 * 1024 * 1024),
            net_bytes_sent=net.bytes_sent,
            net_bytes_recv=net.bytes_recv,
            latency_ms=0.0,
            timestamp=datetime.utcnow()
        )

    def measure_latency(self, url: str) -> float:
        try:
            start_time = time.perf_counter()
            response = httpx.get(url, timeout=2.0)
            end_time = time.perf_counter()
            if response.status_code == 200:
                return (end_time - start_time) * 1000
        except Exception:
            pass
        return -1.0
