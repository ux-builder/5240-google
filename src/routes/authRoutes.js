const express = require("express");
const router = express.Router();
const fs = require("fs");
const axios = require("axios"); // axios library
const Keycloak = require("keycloak-connect");
const path = require('path');
const jwtDecode = require('jwt-decode');

const redirectUri = process.env.REDIRECT_URI;
const mainDomain = process.env.MAIN_DOMAIN;

// Keycloak configuration load function
function loadKeycloakConfig(clientId) {
  try {
    console.log(`Loading Keycloak config for client: ${clientId}`); // Log client ID

    const configPath = path.join(__dirname, '..', 'config', `${clientId}-keycloak.json`);
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    
    console.log(`Keycloak config loaded successfully for client: ${clientId}`); // Log success
    return new Keycloak({}, config);
  } catch (error) {
    console.error(
      `Error loading Keycloak config for client ${clientId}:`,
      error
    );
    return null;
  }
}

// randomString 함수 정의
function randomString(length = 32) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

router.get("/login/:clientId", (req, res) => {
  console.log(`redirectUri: ${redirectUri}`);
  const clientId = req.params.clientId;
  console.log(`Login request received for client: ${clientId}`); // Log client ID
  const keycloak = loadKeycloakConfig(clientId);

  if (keycloak) {
    // Keycloak login URL creation
    const baseUrl = keycloak.config["auth-server-url"];
    const realmUrl = keycloak.config.realmUrl;
    const responseType = 'code';
    const state = randomString();

    console.log(`Keycloak config realm: ${keycloak.config.realmUrl}`);

    // URL 매개변수를 각 줄로 분리하여 가독성 향상
    const loginUrl = `${realmUrl}/protocol/openid-connect/auth` +
                     `?client_id=${encodeURIComponent(clientId)}` +
                     `&redirect_uri=${encodeURIComponent(`${redirectUri}/callback?client_id=${clientId}`)}` +
                     `&response_type=${responseType}`;
    console.log(`Redirecting to Keycloak login URL for client: ${loginUrl}`); // Log redirection

    // Redirect to the created URL
    res.redirect(loginUrl);
  } else {
    console.log(`Keycloak configuration not found for client: ${clientId}`); // Log failure
    res.status(404).send("Client configuration not found");
  }
});

// Keycloak redirect callback processing
router.get("/callback", async (req, res) => {
  const code = req.query.code;
  const clientId = req.query.client_id;
  console.log(`Callback request received for client: ${clientId}, code: ${code}`); // Log callback details

  if (!code) {
    return res.status(400).send("Authorization code is missing");
  }

  const keycloakConfig = loadKeycloakConfig(clientId);
//  console.log(`keycloakConfig : ----------------------------`);
//  console.log(keycloakConfig);

  if (!keycloakConfig) {
    return res.status(404).send("Client configuration not found");
  }

  try {
    console.log(`Requesting token from Keycloak for client: ${clientId}`); // Log token request
    const tokenRequestRedirectUri = `${redirectUri}/callback?client_id=${clientId}`;
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('client_id', keycloakConfig.config.clientId);
    params.append('client_secret', keycloakConfig.config.secret);
    params.append('redirect_uri', tokenRequestRedirectUri);
    params.append('code', code);
    
    const response = await axios({
      method: 'post',
      url: `${keycloakConfig.config["authServerUrl"]}/realms/${keycloakConfig.config.realm}/protocol/openid-connect/token`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: params
    });

    console.log(`data : -----------------------------------`);
    console.log(response.data);



    const { access_token, refresh_token, id_token } = response.data;
    console.log(`Token received successfully for client: ${clientId}`); // Log success

    //const { id_token } = response.data;
    //const decodedToken = jwtDecode(id_token);
    //console.log(decodedToken); // 이 객체에서 필요한 정보를 찾습니다.
    console.log(`id_token : ${id_token}`);
    
    const redirectUrl = `https://${clientId}.${mainDomain}/googleSsologinUser.do#access_token=${access_token}&refresh_token=${refresh_token}&userMailId=${id_token}`;
    console.log(`redirectUrl : ${redirectUrl}`);
    res.redirect(redirectUrl);
  } catch (error) {
    console.error("Error requesting token from Keycloak:", error);
    res.status(500).send("Error requesting token from Keycloak");
  }
});

module.exports = router;