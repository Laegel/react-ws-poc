import { configureStore } from "@reduxjs/toolkit";
import { createReducer, createAction } from "@reduxjs/toolkit";


export const setUsers = createAction<Users>("users/set");

const usersReducer = createReducer<Users>([], (builder) => {
  builder.addCase(setUsers, (_, action) => action.payload);
});

export const store = configureStore(
  {
    reducer: {
      users: usersReducer,
    },
  },
);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
