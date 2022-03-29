import { encode, decode } from "@msgpack/msgpack";

type TriggerCallback = (e?: any) => void;

type Trigger = "message" | "open" | "close" | "error";

type Triggers = { [key in Trigger]: TriggerCallback[] };

export enum MessageTypeSend {
  Subscription = "subscription",
  PrefetchWithSubscription = "subscription+fetch",
  Unsubscribe = "unsubscription",
}

export class ReconnectingWebSocket {
  public url: string;
  public protocols?: string | string[] | undefined;
  private socket?: WebSocket;

  private triggers: Triggers = {
    message: [],
    open: [],
    close: [],
    error: [],
  };
  private preventReconnection = false;

  public constructor(url: string, protocols?: string | string[] | undefined) {
    this.url = url;
    this.protocols = protocols;
  }

  public get hasBeenKilled () {
    return this.preventReconnection;
  }

  public get readyState () {
    return this.socket ? this.socket.readyState : 0;
  }

  public addEventListener (event: Trigger, callback: TriggerCallback) {
    const messageCallback: (event: any) => void = (event) => event.data.arrayBuffer().then((result: any) => callback(decode(result)));
    const realCallback = event === "message" ? messageCallback : callback;
    this.bind(event, realCallback);
  }

  public removeEventListener (event: Trigger, callback: TriggerCallback) {
    this.unbind(event);
  }

  public send (type: MessageTypeSend, name: string, payload?: string | object) {
    this.socket!.send(
      encode({
        type,
        payload,
        name,
      })
    );
  }

  public reconnect () {
    setTimeout(() => {
      this.connect();
      this.rebind();
    }, 5e3);
  }

  public connect () {
    if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
      this.kill();
    } else {
      let url = this.url;
      this.socket = new WebSocket(url, this.protocols);
      this.preventReconnection = false;
    }
  }

  public kill () {
    this.preventReconnection = true;
    this.socket!.close();
  }

  private bind (type: Trigger, callback: TriggerCallback) {
    this.triggers[type].push(callback);
    this.socket!.addEventListener(type, callback);

  }

  private rebind () {
    for (const trigger in this.triggers) {
      if (this.triggers[trigger as Trigger].length) {
        this.triggers[trigger as Trigger].forEach(callback => {
          this.socket!.addEventListener(trigger, callback);
        });
      }
    }
  }

  private unbind (trigger: Trigger) {
    if (this.triggers[trigger].length) {
      this.triggers[trigger].forEach(callback => {
        this.socket!.removeEventListener(trigger, callback);
      });
      this.triggers[trigger] = [];
    }
  }
}

const socketConnectionString = `ws://localhost:8080`;

export const socket = new ReconnectingWebSocket(socketConnectionString);

socket.connect();

export enum MessageTypeReceive {
  Closed = "closed",
  Error = "error",
  Maintenance = "maintenance",
}

export type WSPayload = {
  data?: any;
  errors?: string[];
};

export interface WSMessage {
  type: MessageTypeReceive;
  payload: WSPayload;
  name: string;
}
