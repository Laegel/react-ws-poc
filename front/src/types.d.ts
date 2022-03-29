interface Post {
  title: string;
}

type Posts = Post[];

interface User {
  name: string;
  email: string;
  avatar: string;
  online: boolean;
}

type Users = User[];

interface Message {
  content: string;
  user: User;
}

type Messages = Message[];

type Props = {};

interface Subscription<T> {
  name: string;
  query: string;
  shouldPrefetch?: boolean;
  resolve: (previousPayload: T, response: any) => T;
}