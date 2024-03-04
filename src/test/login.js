document.addEventListener('DOMContentLoaded', function() {
  var loginButton = document.getElementById('login-button');

  loginButton.addEventListener('click', function() {
      // 중계 서버의 로그인 URL로 리다이렉트
      // 'client-id'를 고객사 서비스에 맞게 변경해야 합니다.
      window.location.href = 'https://okrbiz.com:8100/auth/login/client-id';
  });
});