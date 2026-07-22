import * as v from "valibot";

export const STORE_LOCALE = "mn-MN";
export const STORE_CURRENCY = "MNT";

export const storeConfigSchema = v.object({
  id: v.string(),
  name: v.string(),
  publicBaseUrl: v.pipe(v.string(), v.url()),
});

export type StoreConfig = v.InferOutput<typeof storeConfigSchema>;

export const parseStoreConfig = (input: unknown) => v.parse(storeConfigSchema, input);
