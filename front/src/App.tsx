import React, { useEffect, useState } from "react";
import { Provider } from "react-redux";

import {
  Chat,
  StoreUsers,
  WSProvider
} from "./components/Demo";
import { socket, WSMessage } from "./ws";
import { store } from "./store";

import "./App.css";

enum AppStatus {
  Online,
  Offline,
  Maintenance,
}

const resolveMessageByAppStatus = (appStatus: AppStatus) => ({
  [AppStatus.Online]: () => <></>,
  [AppStatus.Offline]: () => <span>Not connected to server</span>,
  [AppStatus.Maintenance]: () => <span>Server undergoing maintenance</span>,
}[appStatus]());

function App () {
  const [usersEnabled, setUsersEnabled] = useState(true);

  const [appStatus, setAppStatus] = useState(socket.readyState === 1 ? AppStatus.Online : AppStatus.Offline);

  useEffect(() => {
    socket.addEventListener("close", () => setAppStatus(AppStatus.Offline));
    socket.addEventListener("open", () => setAppStatus(AppStatus.Online))
    socket.addEventListener("message", (message: WSMessage) => {
      if (message.type === "maintenance") {
        setAppStatus(AppStatus.Maintenance);
      }
    });
  }, [socket]);

  return (
    <div className="App">
      <header className="App-header">
        <Provider store={store}>
          <WSProvider>
            {resolveMessageByAppStatus(appStatus)}
            <div className="structure">
              <div className="container-chat">
                <h2>Chat</h2>
                <Chat />
              </div>
              <div className="container-users">
                <button onClick={() => setUsersEnabled(!usersEnabled)}>Toggle users</button>
                {usersEnabled && <div>
                  <h2>Active Users</h2>
                  <StoreUsers filters={{ online: true }} />

                  <h2>Inactive Users</h2>
                  <StoreUsers filters={{ online: false }} />
                </div>}
              </div>
            </div>
          </WSProvider>
        </Provider>
      </header>
    </div>
  );
}

export default App;
