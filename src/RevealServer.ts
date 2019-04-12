import * as http from 'http'
import * as fs from 'fs'
import * as path from 'path'

import { Logger } from './Logger';

export class RevealServer {
  private server: http.Server | null
  private rootFileDir: string | null

  public constructor(
    private readonly logger: Logger
  ) { }

  public get rootDir(): string {
    if (this.rootFileDir == null) {
      throw new Error("Can't get root path of server before server is started");
    }
    return this.rootFileDir
  }


  public get isListening() {
    return this.server ? this.server.listening : false
  }

  public stop() {
    if (this.isListening && this.server) {
      this.server.close()
    }
  }

  public get uri() {
    if (!this.isListening || this.server === null) {
      return null
    }

    const addr = this.server.address()
    return typeof addr === 'string' ? addr : `http://${addr.address}:${addr.port}/`
  }

  public start(serverRoot: string) {
    if (!this.isListening) {
      console.log("starting server")
      this.logger.log(`Starting server at ${serverRoot}/ ...`)
      this.rootFileDir = serverRoot
      this.server = this.runServer(serverRoot).listen(8126, '127.0.0.1')
      this.logger.log('Server started')
      this.server.on('listening', () => console.log('Server listening'))
      this.server.on('close', () => console.log('Server closed'))
      this.server.on('error', (err) => console.log("Got server error:", err))
    }
  }

  //ripped shamelessly from https://stackoverflow.com/questions/16333790/node-js-quick-file-server-static-files-over-http
  private runServer(basePath: string) {
    return http.createServer((request, response) => {
      if (request.url == undefined || request.url == '/') {
        request.url = 'index.html'
      }
      var filePath = path.join(basePath, request.url)

      var extname = path.extname(filePath);
      var contentType = 'text/html';
      switch (extname) {
        case '.js':
          contentType = 'text/javascript';
          break;
        case '.css':
          contentType = 'text/css';
          break;
        case '.json':
          contentType = 'application/json';
          break;
        case '.png':
          contentType = 'image/png';
          break;
        case '.jpg':
          contentType = 'image/jpg';
          break;
        case '.wav':
          contentType = 'audio/wav';
          break;
      }

      const logReq = (code: number) => this.logger.log(`serving request path=${request.url} response=${code}}`)

      fs.readFile(filePath, function (error, content) {
        if (error) {
          if (error.code == 'ENOENT') {
            logReq(404)
            response.writeHead(404)
            response.end('404 Not Found: ' + request.url, 'utf-8');
          } else {
            logReq(500)
            response.writeHead(500);
            response.end('500 internal error: ' + error.code + ' ..\n');
            response.end();
          }
        } else {
          logReq(200)
          response.writeHead(200, { 'Content-Type': contentType });
          response.end(content, 'utf-8');
        }
      });
    })
  }
}

