export type Locale = "fr" | "en";

export const DEFAULT_LOCALE: Locale = "fr";

type DeepStringify<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepStringify<T[K]>;
};

export type Messages = DeepStringify<typeof import("./messages/fr").fr>;
