/** A signed-in user, as loaded from the session on each request. */
export type SessionUser = {
  id: string;
  email: string;
  username: string;
  name: string;
  isAdmin: boolean;
};

export type AppEnv = {
  Variables: {
    requestId: string;
    user: SessionUser | null;
  };
};
