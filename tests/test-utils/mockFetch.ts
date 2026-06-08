import { jest } from '@jest/globals';

type FetchResponseOptions = {
  ok?: boolean;
  status?: number;
  statusText?: string;
  json?: any;
  text?: string;
};

export function mockFetchOnce(options: FetchResponseOptions | Error) {
  if (options instanceof Error) {
    (global as any).fetch = jest.fn(() => {
      return Promise.reject(options);
    });
    return;
  }

  const {
    ok = true,
    status = 200,
    statusText = "OK",
    json,
    text,
  } = options;

  (global as any).fetch = jest.fn(() =>
    Promise.resolve({
      ok,
      status,
      statusText,
      json: () =>
        json !== undefined ? Promise.resolve(json) : Promise.reject(new Error("No JSON")),
      text: () =>
        text !== undefined ? Promise.resolve(text) : Promise.resolve(""),
    })
  );
}
