import http from 'http';

const PORT = parseInt(process.env.WORKER_HEALTH_PORT || '3001');

export function startHealthCheck(deps: { emailQueue: any; chargeQueue: any }): void {
  const server = http.createServer(async (req, res) => {
    if (req.url === '/health' || req.url === '/') {
      try {
        const [emailCounts, chargeCounts] = await Promise.all([
          deps.emailQueue.getJobCounts('waiting', 'active', 'completed', 'failed'),
          deps.chargeQueue.getJobCounts('waiting', 'active', 'completed', 'failed'),
        ]);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'healthy',
          uptime: Math.floor(process.uptime()),
          queues: { email: emailCounts, charge: chargeCounts },
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
