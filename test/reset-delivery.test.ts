import assert from "node:assert/strict";
import test from "node:test";
import {
  APP_BASE_URL_LOG,
  resetDeliveryMode,
  resetLink,
  resetUnavailableLog,
  sendPasswordResetEmail,
} from "../src/lib/mailer.ts";
import {
  processForgotPassword,
  redactSecrets,
  RESET_REQUEST_MESSAGE,
  SMTP_UNAVAILABLE_LOG,
  issueReset,
} from "../src/lib/password-reset.ts";

const TOKEN = "reset-token-secret-value-0123456789abcdef";
const LINK = resetLink(TOKEN, { APP_BASE_URL: "http://localhost:3000" });

function captureConsole() {
  const lines: string[] = [];
  const original = { log: console.log, error: console.error };
  console.log = (...args: unknown[]) => {
    lines.push(args.map(String).join(" "));
  };
  console.error = (...args: unknown[]) => {
    lines.push(args.map(String).join(" "));
  };
  return {
    lines,
    restore() {
      console.log = original.log;
      console.error = original.error;
    },
  };
}

test("delivery mode fails closed in production even if the dev flag is set", () => {
  assert.equal(resetDeliveryMode({ NODE_ENV: "production" }), "unavailable");
  assert.equal(
    resetDeliveryMode({ NODE_ENV: "production", PASSWORD_RESET_LOG_LINK: "1" }),
    "unavailable",
  );
  assert.equal(resetDeliveryMode({ NODE_ENV: "development" }), "unavailable");
  assert.equal(
    resetDeliveryMode({ NODE_ENV: "development", PASSWORD_RESET_LOG_LINK: "1" }),
    "dev-log",
  );
  assert.equal(
    resetDeliveryMode({
      NODE_ENV: "production",
      SMTP_HOST: "smtp.example",
      MAIL_FROM: "a@b.c",
      APP_BASE_URL: "https://clinic.example",
    }),
    "smtp",
  );
  assert.equal(
    resetDeliveryMode({ NODE_ENV: "production", SMTP_HOST: "smtp.example", MAIL_FROM: "a@b.c" }),
    "unavailable",
  );
  assert.equal(
    resetDeliveryMode({
      NODE_ENV: "production",
      SMTP_HOST: "smtp.example",
      MAIL_FROM: "a@b.c",
      APP_BASE_URL: "http://localhost:3000",
    }),
    "unavailable",
  );
});

test("production without an https APP_BASE_URL does not issue a reset token", async () => {
  let issued = 0;
  const logs: string[] = [];
  const env = {
    NODE_ENV: "production" as const,
    SMTP_HOST: "smtp.example",
    MAIL_FROM: "a@b.c",
    APP_BASE_URL: "http://localhost:3000",
  };
  const result = await processForgotPassword({
    mode: resetDeliveryMode(env),
    unavailableLog: resetUnavailableLog(env),
    lookup: async () => ({ id: "prac-1", email: "ivanirt@gmail.com" }),
    issue: () => {
      issued += 1;
      return issueReset();
    },
    save: () => {
      throw new Error("save should not run");
    },
    deliver: async () => {
      throw new Error("deliver should not run");
    },
    linkFor: () => LINK,
    log: (line) => logs.push(line),
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.message, RESET_REQUEST_MESSAGE);
  assert.equal(issued, 0);
  assert.equal(logs.join("\n").includes(TOKEN), false);
  assert.match(logs.join("\n"), /APP_BASE_URL/);
});

test("production without SMTP does not log the token and answers the same for every mailbox", async () => {
  const logs: string[] = [];
  let issued = 0;
  const known = await processForgotPassword({
    mode: "unavailable",
    lookup: async () => {
      throw new Error("lookup should not run");
    },
    issue: () => {
      issued += 1;
      return issueReset();
    },
    save: () => {
      throw new Error("save should not run");
    },
    deliver: async () => {
      throw new Error(LINK);
    },
    linkFor: () => LINK,
    log: (line) => logs.push(line),
  });
  const unknown = await processForgotPassword({
    mode: "unavailable",
    lookup: async () => null,
    issue: () => issueReset(),
    save: () => undefined,
    deliver: async () => undefined,
    linkFor: () => LINK,
    log: (line) => logs.push(line),
  });

  assert.equal(known.status, 200);
  assert.deepEqual(known.body, unknown.body);
  assert.equal(known.body.message, RESET_REQUEST_MESSAGE);
  assert.equal(issued, 0);
  const text = logs.join("\n");
  assert.match(text, /SMTP no está configurado/);
  assert.equal(text.includes(TOKEN), false);
  assert.equal(text.includes(LINK), false);
  assert.equal(text.includes("restablecer?token="), false);
});

test("sendPasswordResetEmail never logs the token when SMTP is missing or the send fails", async () => {
  const prod = captureConsole();
  try {
    const result = await sendPasswordResetEmail("ivanirt@gmail.com", LINK, undefined, {
      NODE_ENV: "production",
      PASSWORD_RESET_LOG_LINK: "1",
      APP_BASE_URL: "http://localhost:3000",
    });
    assert.equal(result, "unavailable");
  } finally {
    prod.restore();
  }
  const prodText = prod.lines.join("\n");
  assert.equal(prodText, APP_BASE_URL_LOG);
  assert.equal(prodText.includes(TOKEN), false);
  assert.equal(prodText.includes(LINK), false);

  const noSmtp = captureConsole();
  try {
    const result = await sendPasswordResetEmail("ivanirt@gmail.com", LINK, undefined, {
      NODE_ENV: "production",
      APP_BASE_URL: "https://clinic.example",
    });
    assert.equal(result, "unavailable");
  } finally {
    noSmtp.restore();
  }
  assert.equal(noSmtp.lines.join("\n"), SMTP_UNAVAILABLE_LOG);

  const failed = captureConsole();
  try {
    const result = await sendPasswordResetEmail(
      "ivanirt@gmail.com",
      LINK,
      {
        async sendMail() {
          throw new Error(`SMTP down ${LINK} token=${TOKEN}`);
        },
      },
      {
        NODE_ENV: "production",
        SMTP_HOST: "smtp.example",
        MAIL_FROM: "a@b.c",
        APP_BASE_URL: "https://clinic.example",
      },
    );
    assert.equal(result, "unavailable");
  } finally {
    failed.restore();
  }
  const failedText = failed.lines.join("\n");
  assert.match(failedText, /No se pudo enviar/);
  assert.equal(failedText.includes(TOKEN), false);
  assert.equal(failedText.includes(LINK), false);
  assert.match(failedText, /\[redacted\]/);

  const dev = captureConsole();
  try {
    const result = await sendPasswordResetEmail("ivanirt@gmail.com", LINK, undefined, {
      NODE_ENV: "development",
      PASSWORD_RESET_LOG_LINK: "1",
      APP_BASE_URL: "http://localhost:3000",
    });
    assert.equal(result, "logged");
  } finally {
    dev.restore();
  }
  assert.equal(dev.lines.join("\n").includes(TOKEN), true);
});

test("a failed delivery still returns the uniform message and does not log the token", async () => {
  const logs: string[] = [];
  const token = issueReset().token;
  const link = resetLink(token, { APP_BASE_URL: "https://clinic.example" });
  const result = await processForgotPassword({
    mode: "smtp",
    lookup: async () => ({ id: "prac-1", email: "ivanirt@gmail.com" }),
    issue: () => ({ token, record: { tokenHash: "abc", expiresAt: 1 } }),
    save: () => undefined,
    deliver: async () => {
      throw new Error(`bounce ${link}`);
    },
    linkFor: () => link,
    log: (line) => logs.push(line),
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.message, RESET_REQUEST_MESSAGE);
  const text = logs.join("\n");
  assert.equal(text.includes(token), false);
  assert.equal(text.includes(link), false);
  assert.equal(redactSecrets(link, [token]).includes(token), false);
});

test("known and unknown mailboxes get the same body when delivery is possible", async () => {
  async function run(user: { id: string; email: string } | null) {
    return processForgotPassword({
      mode: "smtp",
      lookup: async () => user,
      issue: () => issueReset(1_000),
      save: () => undefined,
      deliver: async () => undefined,
      linkFor: (token) => resetLink(token),
      log: () => undefined,
    });
  }
  const known = await run({ id: "prac-1", email: "ivanirt@gmail.com" });
  const unknown = await run(null);
  assert.deepEqual(known, unknown);
  assert.equal(known.body.message, RESET_REQUEST_MESSAGE);
});
