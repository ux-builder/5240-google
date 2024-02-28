const express = require('express');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');

dotenv.config();

const app = express();

// 개발 환경에서만 테스트 라우트 설정
if (process.env.NODE_ENV === 'development') {
  // 테스트용 정적 파일 서빙
  app.use('/test', express.static(path.join(__dirname, 'test')));

  // 테스트용 로그인 페이지 라우트
  app.get('/test/login', (req, res) => {
      res.sendFile(path.join(__dirname, 'test', 'login.html'));
  });

  // 테스트용 콜백 페이지 라우트
  app.get('/test/callback', (req, res) => {
      res.sendFile(path.join(__dirname, 'test', 'callback.html'));
  });
}

// 라우트 설정
app.use('/auth', authRoutes);

const PORT = process.env.PORT || 8100;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});