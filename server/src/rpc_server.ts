import { MessageReader, MessageWriter } from "vscode-jsonrpc";
import * as ws from "ws";
import express from "express";
import { LanguageServer } from "./server";
import * as http from "http";
import * as url from "url";
import * as net from "net";
import { MessageConnection, NotificationType } from "vscode-jsonrpc";
import {
  listen,
  WebSocketMessageReader,
  WebSocketMessageWriter,
  IWebSocket,
} from "vscode-ws-jsonrpc";
// breaking changes
// https://github.com/TypeFox/monaco-languageclient/blob/main/packages/vscode-ws-jsonrpc/CHANGELOG.md#200---2022-09-08

function launch(socket: IWebSocket) {
  /*
  https://github.com/railsware/upterm/blob/1d04bcb6d5aec8f62e4025ddee4a77db8cc12c52/src/language-server/ShellLanguageServer.ts#L27
  */
  const reader = new WebSocketMessageReader(socket);
  const writer = new WebSocketMessageWriter(socket);
  const languageServer = new LanguageServer(reader, writer);
}
process.on("uncaughtException", function (err: any) {
  console.error("Uncaught Exception: ", err.toString());
  if (err.stack) {
    console.error(err.stack);
  }
});
//
// create the express application
const app = express();
// server the static content, i.e. index.html
app.use(express.static(__dirname));
// start the server
const server = app.listen(3000, "localhost");
// create the web socket
const wss = new ws.Server({
  noServer: true,
  perMessageDeflate: false,
});
//
server.on(
  "upgrade",
  (request: http.IncomingMessage, socket: net.Socket, head: Buffer) => {
    const pathname = request.url ? url.parse(request.url).pathname : undefined;
    if (pathname === "//sampleServer") {
      wss.handleUpgrade(request, socket, head, (webSocket) => {
        const socket: IWebSocket = {
          send: (content) =>
            webSocket.send(content, (error) => {
              if (error) {
                throw error;
              }
            }),
          onMessage: (cb) => webSocket.on("message", cb),
          onError: (cb) => webSocket.on("error", cb),
          onClose: (cb) => webSocket.on("close", cb),
          dispose: () => {
            console.log("disposing");
            webSocket.close();
          },
        };
        // launch the server when the web socket is opened
        if (webSocket.readyState === webSocket.OPEN) {
          launch(socket);
        } else {
          webSocket.on("open", () => launch(socket));
        }
      });
    }
  },
);
