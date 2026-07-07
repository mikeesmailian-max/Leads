// imapflow ships without a resolvable "types" entry in some installs.
// Minimal ambient declaration covering only what src/lib/email/imapClient.ts
// actually uses — see https://imapflow.com/ for the full API surface.
declare module "imapflow" {
  export interface ImapFlowOptions {
    host: string;
    port: number;
    secure: boolean;
    auth: { user: string; pass: string };
    logger?: boolean | Record<string, unknown>;
  }

  export interface FetchMessageObject {
    uid: number;
    source?: Buffer;
    [key: string]: unknown;
  }

  export interface MailboxLockObject {
    release(): void;
  }

  export class ImapFlow {
    constructor(options: ImapFlowOptions);
    connect(): Promise<void>;
    logout(): Promise<void>;
    getMailboxLock(mailbox: string): Promise<MailboxLockObject>;
    search(query: Record<string, unknown>, options?: Record<string, unknown>): Promise<number[]>;
    fetchOne(range: string, query: Record<string, unknown>, options?: Record<string, unknown>): Promise<FetchMessageObject | false>;
    messageFlagsAdd(range: { uid: number } | string, flags: string[], options?: Record<string, unknown>): Promise<boolean>;
  }
}
