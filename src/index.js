/// <reference types="@fastly/js-compute" />
import { Router } from "@fastly/expressly";
import queryString from "query-string";
import processView from "./views";
import loginView from "./views/login.html";

const router = new Router();
const BACKEND = "api_docs";

function getConfig() {
  const configStore = new ConfigStore("config");

  return {
    clientId: configStore.get("client_id"),
    clientSecret: configStore.get("client_secret"),
  };
}

// Routing
router.use("/", async (req, res) => {
  if (!req.path.startsWith("/github/")) {
    // If user isn't authorized, redirect them to the login page
    if (!req.cookies.get("auth")) {
      res.redirect("/github/login");
    } else {
      // If they are authorized, serve the backend
      res.send(await fetch("http://localhost:7676/", { backend: BACKEND }));
    }
  }
});

router.get("/github/login", async (req, res) => {
  let config = getConfig();

  const params = queryString.stringify({
    client_id: config.clientId,
    redirect_uri: req.urlObj.origin + "/github/callback",
    scope: ["read:user", "user:email"].join(" "), // space seperated string
    allow_signup: true,
  });

  // Generate login link and show login page
  const githubLoginUrl = `https://github.com/login/oauth/authorize?${params}`;
  return res.html(
    processView(loginView, {
      githubLoginUrl,
    })
  );
});

// After the user has signed in, set a cookie and redirect them to the homepage
router.get("/github/callback", async (req, res) => {
  let accessToken = await fetchAccessTokenFromCode(
    req.query.get("code"),
    req.urlObj.origin
  );
  let userData = await fetchGitHubUserData(accessToken);
  if (userData.login) {
    res.cookie("auth", accessToken, { path: "/" });
    res.redirect("/");
  }
});

async function fetchAccessTokenFromCode(code, origin) {
  let config = getConfig();
  const resp = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    backend: "github",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "Fastly",
    },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: origin + "/github/callback",
      code,
    }),
  });
  const parsedData = await resp.json();
  if (parsedData.error) throw new Error(parsedData.error_description);
  return parsedData.access_token;
}

async function fetchGitHubUserData(access_token) {
  const resp = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `token ${access_token}`,
      Accept: "application/json",
      "User-Agent": "Fastly",
    },
    backend: "github_api",
  });
  const data = await resp.json();
  return data;
}

router.listen();
