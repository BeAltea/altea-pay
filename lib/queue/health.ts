import http from 'http';
import type { Queue } from 'bullmq';

const PORT = parseInt(process.env.WORKER_HEALTH_PORT || '3001');

type QueueMap = Record<string, Queue>;

export function startHealthCheck(deps: QueueMap): void {
  const server = http.createServer(async (req, res) => {
    if (req.url === '/health' || req.url === '/') {
      try {
        const queueNames = Object.keys(deps);
        const countsPromises = queueNames.map((name) =>
          deps[name].getJobCounts('waiting', 'active', 'completed', 'failed')
        );
        const counts = await Promise.all(countsPromises);

        const queues: Record<string, any> = {};
        queueNames.forEach((name, i) => {
          queues[name] = counts[i];
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'healthy',
          uptime: Math.floor(process.uptime()),
          queues,
        }));
      } catch (err: any) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'unhealthy', error: err.message }));
      }
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[HEALTH] Listening on port ${PORT}`);
  });
}
