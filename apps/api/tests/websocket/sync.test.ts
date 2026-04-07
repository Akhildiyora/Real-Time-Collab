import WebSocket from 'ws';

describe('WebSocket Sync', () => {
  const WS_URL = 'ws://localhost:3000';

  test('should connect to WebSocket server', (done) => {
    const ws = new WebSocket(WS_URL);

    ws.on('open', () => {
      expect(ws.readyState).toBe(WebSocket.OPEN);
      ws.close();
      done();
    });

    ws.on('error', (err) => {
      done(err);
    });
  }, 10000);

  test('should handle invalid messages gracefully', (done) => {
      const ws = new WebSocket(WS_URL);
  
      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'INVALID' }));
        setTimeout(() => {
            expect(ws.readyState).toBe(WebSocket.OPEN);
            ws.close();
            done();
        }, 500);
      });
  
      ws.on('error', (err) => {
        done(err);
      });
    }, 10000);
});
