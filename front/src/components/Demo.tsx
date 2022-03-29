import React, { useState, useEffect, PropsWithChildren, useContext, createContext } from "react";
import { connect, useDispatch } from "react-redux";

import { socket, MessageTypeSend, ReconnectingWebSocket, WSMessage } from "../ws";
import { RootState, setUsers } from "../store";
import MessageList from "./MessageList";


let WSContext: any;
const { Provider } = (WSContext = createContext({}));

const WSProvider = ({ children }: PropsWithChildren<Props>) => {
  const dispatch = useDispatch();
  const subscriptions: Subscription<any>[] = [
    {
      name: "getUsers",
      query: `{ 
    getUsers {
      name
      email
      avatar
      online
    } 
  }
  `,
      shouldPrefetch: true,
      resolve: (previousPayload, response) => setUsers(response.getUsers)
    }
  ];

  const handleMessage = (message: WSMessage) => {
    try {
      if (message.payload.errors) {
        console.error(message.payload.errors);
        return;
      }

      const subscription = subscriptions.find(subscription => subscription.name === message.name);

      if (subscription) {
        console.log("dispatch to store", message);
        dispatch(subscription.resolve(null, message.payload.data));
      }
    } catch (error: unknown) {
      console.error("[WS] Malformed data received: ", error);
    }
  };

  const handleOpen = () => {
    console.log(socket.readyState);

    subscriptions.forEach(subscription => {
      socket.send(subscription.shouldPrefetch ? MessageTypeSend.PrefetchWithSubscription : MessageTypeSend.Subscription, subscription.name, btoa(subscription.query));
    });
  };

  const handleClose = () => {
    if (!socket.hasBeenKilled) {
      socket.reconnect();
    }
  };

  // useCallback

  useEffect(() => {
    socket.addEventListener("open", handleOpen);
    socket.addEventListener("message", handleMessage);
    socket.addEventListener("close", handleClose);
    return () => {
      socket.removeEventListener("open", handleOpen);
      socket.removeEventListener("message", handleMessage);
      socket.removeEventListener("close", handleClose);
    }
  }, [socket]);

  return (
    <Provider
      value={{
        socket
      }}
    >
      {children}
    </Provider>
  );
};


export { WSContext, WSProvider };

const withSocket = <P extends Props> (Component: React.ComponentType<P>, subscription: Subscription<P>) => {
  const SocketWrapper = (props: P) => {
    const [payload, setPayload] = useState(props);

    const { socket } = useContext<{ socket: ReconnectingWebSocket }>(WSContext);

    const handleMessage = (message: WSMessage) => {
      try {
        if (message.payload.errors) {
          console.error(message.payload.errors);
          return;
        }

        if (subscription.name === message.name) {
          console.log("dispatch", message);
          setPayload((previousPayload) => subscription.resolve(previousPayload, message.payload.data));
        }
      } catch (error: unknown) {
        console.error("[WS] Malformed data received: ", error);
      }
    };

    const handleOpen = () => {
      console.log("preparing subscriptions");
      socket.send(subscription.shouldPrefetch ? MessageTypeSend.PrefetchWithSubscription : MessageTypeSend.Subscription, subscription.name, btoa(subscription.query));
    };

    useEffect(() => {
      socket.addEventListener("open", handleOpen);
      socket.addEventListener("message", handleMessage);
      return () => {
        socket.removeEventListener("open", handleOpen);
        socket.removeEventListener("message", handleMessage);
        socket.send(MessageTypeSend.Unsubscribe, subscription.name);
      };
    }, [socket]);

    return <Component {...props} {...payload} />;
  };
  SocketWrapper.displayName = "SocketWrapper";
  return SocketWrapper;
};

interface PostListProps extends Props { posts: Posts }

const PostList = ({ posts = [] }: PostListProps) => <div style={{
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 10
}}>
  {posts.map(({ title }, index) => <span key={index}>{title}</span>)}
</div>;

export const SocketyPosts = withSocket(PostList, {
  name: "getPosts",
  query: `{ 
    getPosts {
      title
    } 
  }`,
  resolve: (previousPayload, response) => ({ posts: response.getPosts })
});

interface UserListProps extends Props { users: Users, filters?: { online?: boolean } }

const UserList = ({ users = [], filters }: UserListProps) => <div className="userList">
  {users.filter(user => typeof filters?.online === "boolean" ? user.online === filters.online : true).map(({ name, avatar, email, online }, index) => <div key={index}>
    <img src={avatar} alt={email} /> {name}
  </div>)}
</div>;

export const StoreUsers = connect((state: RootState) => ({
  users: state.users,
}))(UserList);

// export const SocketyUsers = withSocket(UserList, {
//   name: "getUsers",
//   query: `{ 
//     getUsers {
//       name
//       email
//       avatar
//       online
//     } 
//   }
//   `,
//   shouldPrefetch: true,
//   resolve: (previousPayload, response) => ({ users: response.getUsers })
// });


export const SocketyMessages = withSocket(MessageList, {
  name: "getLastMessage",
  query: `{ 
    getLastMessage {
      content
      user {
        name
        avatar
      }
    } 
  }`,
  resolve: (previousPayload, response) => ({ messages: [...(previousPayload.messages || []), response.getLastMessage] })
});

export const Chat = () => {
  return <div className="chat active-chat">
    <SocketyMessages />
  </div>
};
