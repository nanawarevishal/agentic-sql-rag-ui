import { describe, expect, it } from "vitest";
import type { SessionPayload } from "./authSlice";
import { singleFlightRefresh } from "./singleFlightRefresh";

// The failure being prevented is a signed-out user mid-answer: four figures
// on one answer means four parallel 401s, and with refresh-token rotation the
// calls that land after the first are presenting a token that was just
// replaced. The second failure being prevented is subtler - a cached rejected
// promise, which would make one transient failure permanent for the session.

const session = { access_token: "new", user: { id: "u1" } } as unknown as SessionPayload;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("singleFlightRefresh", () => {
  it("runs one refresh for callers that arrive together", async () => {
    const pending = deferred<SessionPayload>();
    let calls = 0;
    const refresh = () => {
      calls += 1;
      return pending.promise;
    };

    const waiting = [1, 2, 3, 4].map(() => singleFlightRefresh(refresh));
    pending.resolve(session);

    expect(await Promise.all(waiting)).toEqual([session, session, session, session]);
    expect(calls).toBe(1);
  });

  it("starts a new refresh once the previous one has settled", async () => {
    let calls = 0;
    const refresh = () => {
      calls += 1;
      return Promise.resolve(session);
    };

    await singleFlightRefresh(refresh);
    await singleFlightRefresh(refresh);

    expect(calls).toBe(2);
  });

  it("does not cache a rejection", async () => {
    // If the rejected promise stayed cached, every later 401 in the session
    // would await a promise that can never succeed, and nothing would recover
    // short of a reload.
    let calls = 0;
    const refresh = () => {
      calls += 1;
      return calls === 1 ? Promise.reject(new Error("network")) : Promise.resolve(session);
    };

    await expect(singleFlightRefresh(refresh)).rejects.toThrow("network");
    await expect(singleFlightRefresh(refresh)).resolves.toEqual(session);
    expect(calls).toBe(2);
  });

  it("shares a rejection with everyone waiting on it", async () => {
    // A genuinely dead session should fail all of them, not have each caller
    // retry in turn against a server that will refuse every time.
    const pending = deferred<SessionPayload>();
    let calls = 0;
    const refresh = () => {
      calls += 1;
      return pending.promise;
    };

    const waiting = [singleFlightRefresh(refresh), singleFlightRefresh(refresh)];
    const settled = Promise.allSettled(waiting);
    pending.reject(new Error("expired"));

    expect((await settled).map((r) => r.status)).toEqual(["rejected", "rejected"]);
    expect(calls).toBe(1);
  });
});
