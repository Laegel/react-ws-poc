const { graphql, buildSchema } = require("graphql");
const { encode, decode } = require("@msgpack/msgpack");
const { faker } = require("@faker-js/faker");
const WebSocket = require("ws");
const { randomInt } = require("crypto");

const schema = buildSchema(`
  type Query {
    hello: String
    getPosts: [Post]!
    getUsers: [User]!
    getLastMessage: Message!
  }

  type User {
    name: String!
    email: String!
    avatar: String!
    online: Boolean!
  }

  type Post {
    title: String!
    user: User!
  }

  type Message {
    content: String!
    user: User!
  }
`);


const randomOrFirst = (items) => items.length === 1 ? items[0] : items[randomInt(items.length - 1)];

const wss = new WebSocket.Server({ port: 8080 });

const createUser = () => ({ id: faker.datatype.uuid(), name: faker.internet.userName(), email: faker.internet.email(), avatar: faker.internet.avatar(), online: !!randomInt(0, 1) });

const db = {
  users: [createUser()],
  posts: [],
  messages: [],
};


const actions = [
  {
    effect() {
      const user = createUser();
      db.users.push(user);
      return true;
    },
    range: [0, 4],
    name: "getUsers",
  },
  {
    effect() {
      const index = db.users.length === 1 ? 0 : randomInt(db.users.length - 1);
      db.users[index] = { ...db.users[index], online: !db.users[index].online };
      return true;
    },
    range: [5, 14],
    name: "getUsers",
  },
  {
    effect() {
      const onlineUsers = db.users.filter(user => user.online);
      if (onlineUsers.length < 2) {
        return false;
      }
      const message = { content: faker.lorem.lines(), user: randomOrFirst(onlineUsers) };
      db.messages.push(message);
      return true;
    },
    range: [15, 69],
    name: "getLastMessage",
  }
];

const rootValue = {
  getPosts: () => {
    return db.posts;
  },
  getUsers: () => {
    return db.users;
  },
  getLastMessage: () => {
    return db.messages.length ? db.messages[db.messages.length - 1] : [];
  }
};

wss.on("connection", async function connection(ws) {
  console.log('connected');
  ws.subscriptions = {};

  const fetch = (key, source) => graphql({
    schema,
    rootValue,
    source,
  }).then((response) => {
    sendData(response, key);
  });

  const sendData = (payload, name) => {
    ws.send(encode({
      payload,
      name,
      type: "data",
    }));
  }
  ws.on("message", async function incoming(event) {
    const message = decode(event);

    const types = message.type.split("+");

    if (types.includes("subscription")) {
      console.log("new subscription", message.name);
      ws.subscriptions[message.name] = { ...message, payload: Buffer.from(message.payload, "base64").toString("ascii") };
    }
    if (types.includes("fetch")) {
      console.log("prefetching", message.name);
      fetch(message.name, Buffer.from(message.payload, "base64").toString("ascii"));
    }
    if (types.includes("unsubscription")) {
      console.log("removing subscription", message.name);
      delete ws.subscriptions[message.name];
    }
  });

  ws.on("close", () => {
    console.log('disconnected, clearing subscriptions');
    ws.subscriptions = {};
  });

  setInterval(() => {
    const actionValue = randomInt(0, 99);

    for (const action of actions) {
      const key = action.name;
      if (ws.subscriptions[key] && action.range[0] <= actionValue && actionValue <= action.range[1] && action.effect()) {
        fetch(key, ws.subscriptions[key].payload);
        return;
      }
    }
  }, 2000);
});
