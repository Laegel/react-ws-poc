# React Websocket Driven + GraphQL + MessagePack

Front and back open a WS tunnel.
Front components (or Redux store) subscribe to events.

When punctual data is needed, the front sends a query that the back will handle and emit => this is *a contract*.

## Standard Flow

Front:

First, we have subscribers' initialization.

Then, we prepare a GQL query to send:

{
    getPosts(title="bla") {
        title, content, tags { name }
    }
}

Back:

Process the query, MessagePackify the response, send it through WS.

Front:

Decode the response, dispatch it to subscribers.