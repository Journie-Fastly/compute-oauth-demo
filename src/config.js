import { Dictionary } from "fastly:dictionary";

function fetchConfig() {
  let dict = new Dictionary("config");

  return {
    clientId: dict.get("client_id"),
    clientSecret: dict.get("client_secret"),
  };
}

export default fetchConfig;
