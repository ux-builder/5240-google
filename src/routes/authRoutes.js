const express = require('express');
const router = express.Router();
const fs = require('fs');
const request = require('request'); // HTTP 요청을 위한 라이브러리
const Keycloak = require('keycloak-connect');

const redirectUri = process.env.REDIRECT_URI;

// Keycloak 설정 로드 함수
function loadKeycloakConfig(clientId) {
    try {
        const config = JSON.parse(fs.readFileSync(`./config/${clientId}-keycloak.json`, 'utf8'));
        return new Keycloak({}, config);
    } catch (error) {
        console.error(`Error loading Keycloak config for client ${clientId}:`, error);
        return null;
    }
}

router.get('/login/:clientId', (req, res) => {
    const clientId = req.params.clientId;
    const keycloak = loadKeycloakConfig(clientId);

    if (keycloak) {
        // Keycloak 로그인 URL 생성
        const loginUrl = keycloak.createLoginUrl({
            redirectUri: `${process.env.REDIRECT_URI}/callback?client_id=${clientId}`
        });

        // 생성된 URL로 리다이렉트
        res.redirect(loginUrl);
    } else {
        res.status(404).send('Client configuration not found');
    }
});


// Keycloak 리다이렉트 콜백 처리
router.get('/callback', (req, res) => {
  const code = req.query.code; // 인증 코드
  const clientId = req.query.client_id; // 클라이언트 ID

  if (!code) {
      return res.status(400).send('Authorization code is missing');
  }

  const keycloakConfig = loadKeycloakConfig(clientId);
  if (!keycloakConfig) {
      return res.status(404).send('Client configuration not found');
  }

  // Keycloak 토큰 엔드포인트로 토큰 교환 요청
  const tokenEndpoint = `${keycloakConfig['auth-server-url']}/realms/${keycloakConfig.realm}/protocol/openid-connect/token`;
  const tokenRequestOptions = {
      method: 'POST',
      url: tokenEndpoint,
      form: {
          grant_type: 'authorization_code',
          client_id: keycloakConfig.resource,
          client_secret: keycloakConfig.credentials.secret,
          redirect_uri: redirectUri,
          code: code
      }
  };

  request(tokenRequestOptions, (error, response, body) => {
      if (error) {
          console.error('Error requesting token from Keycloak:', error);
          return res.status(500).send('Error requesting token from Keycloak');
      }

      if (response.statusCode !== 200) {
          console.error('Invalid response from Keycloak:', body);
          return res.status(500).send('Invalid response from Keycloak');
      }

      const tokenResponse = JSON.parse(body);
      const accessToken = tokenResponse.access_token;
      const refreshToken = tokenResponse.refresh_token;
      const userInfo = tokenResponse.id_token; // 구글 프로필 정보가 포함된 ID 토큰

      // .env 파일에서 메인 도메인 읽기
      const mainDomain = process.env.MAIN_DOMAIN;

      // 클라이언트별 리디렉션 URL 구성
      const redirectUrl = `https://${clientId}.${mainDomain}/googleSsologinUser.do#access_token=${accessToken}&refresh_token=${refreshToken}&userMailId=${encodeURIComponent(userInfo)}`;

      res.redirect(redirectUrl);
  });
});

module.exports = router;