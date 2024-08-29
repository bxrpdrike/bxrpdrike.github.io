import { ServerWebSocket } from 'bun';
import fs from 'fs/promises';
import path from 'path';

async function serveIndexFile() {
  const index_file_path = path.join(__dirname, 'pages', 'index.html');
  const html_context = await fs.readFile(index_file_path, 'utf-8');
  return new Response(html_context, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}

let ws_all: ServerWebSocket<{ uuid: string }>[] = [];

Bun.serve<{ uuid: string }>({
  development: true,
  port: 8080,
  async fetch(req, server) {
    if (
      server.upgrade(req, {
        data: {
          uuid: crypto.randomUUID(),
        },
      })
    ) {
      return;
    }

    const url = new URL(req.url);

    if (url.pathname === '/') {
      return await serveIndexFile();
    }

    return new Response(
      JSON.stringify({
        msg: 'Idk what you are looking for',
      }),
      {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  },
  websocket: {
    message(ws, message) {
      for (let i = 0; i < ws_all.length; i++) {
        let c_ws = ws_all[i];
        if (c_ws.data.uuid !== ws.data.uuid) {
          c_ws.send(message);
        }
      }
    },
    open(ws) {
      ws_all.push(ws);
      console.log(`New connection made`);
    },
    close(ws) {
      ws_all = ws_all.filter((k) => k.data.uuid !== ws.data.uuid);
      console.log(`Connection closed made`);
    },
  },
});

console.log('server started on port ');
