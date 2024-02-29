const express = require("express");
const router = express.Router();
const fs = require("fs");
const axios = require("axios"); // axios 라이브러리
const Keycloak = require("keycloak-connect");

const redirectUri = process.env.REDIRECT_URI;

// Keycloak 설정 로드 함수
function loadKeycloakConfig(clientId) {
  try {
    const config = JSON.parse(
      fs.readFileSync(`./config/${clientId}-keycloak.json`, "utf8")
    );
    return new Keycloak({}, config);
  } catch (error) {
    console.error(
      `Error loading Keycloak config for client ${clientId}:`,
      error
    );
    return null;
  }
}

router.get("/login/:clientId", (req, res) => {
  const clientId = req.params.clientId;
  const keycloak = loadKeycloakConfig(clientId);

  if (keycloak) {
    // Keycloak 로그인 URL 생성
    const loginUrl = keycloak.createLoginUrl({
      redirectUri: `${process.env.REDIRECT_URI}/callback?client_id=${clientId}`,
    });

    // 생성된 URL로 리다이렉트
    res.redirect(loginUrl);
  } else {
    res.status(404).send("Client configuration not found");
  }
});

// Keycloak 리다이렉트 콜백 처리
router.get("/callback", async (req, res) => {
  const code = req.query.code;
  const clientId = req.query.client_id;

  if (!code) {
    return res.status(400).send("Authorization code is missing");
  }

  const keycloakConfig = loadKeycloakConfig(clientId);
  if (!keycloakConfig) {
    return res.status(404).send("Client configuration not found");
  }

  try {
    const response = await axios({
      method: "post",
      url: `${keycloakConfig["auth-server-url"]}/realms/${keycloakConfig.realm}/protocol/openid-connect/token`,
      data: {
        grant_type: "authorization_code",
        client_id: keycloakConfig.resource,
        client_secret: keycloakConfig.credentials.secret,
        redirect_uri: redirectUri,
        code: code,
      },
    });

    const { access_token, refresh_token, id_token } = response.data;

    const redirectUrl = `https://${clientId}.${mainDomain}/googleSsologinUser.do#access_token=${access_token}&refresh_token=${refresh_token}&userMailId=${encodeURIComponent(
      id_token
    )}`;
    res.redirect(redirectUrl);
  } catch (error) {
    console.error("Error requesting token from Keycloak:", error);
    res.status(500).send("Error requesting token from Keycloak");
  }
});

module.exports = router;
