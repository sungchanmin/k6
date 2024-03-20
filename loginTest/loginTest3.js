import http from "k6/http";
import { browser } from 'k6/experimental/browser';
import { check } from "k6";
import encoding from 'k6/encoding';

const properties = JSON.parse(open('./properties.json'));

export const options = {
  scenarios: {
    load: {
      exec: 'checkAPI',
      executor: 'ramping-vus',
      stages: [
        { duration: '5s', target: 1 },
        { duration: '10s', target: 2 },
        { duration: '5s', target: 0 },
      ],
      startTime: '20s',
    },
    browser: {
      exec: 'checkBrowser',
      executor: 'constant-vus',
      vus: 2,
      duration: '20s',
      options: {
        browser: {
          type: 'chromium',
        },
      },
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<4000', 'p(99)<5000'],
    browser_web_vital_fcp: ['p(95) < 30000'],
    browser_web_vital_lcp: ['p(95) < 50000'],
  },
};

export function checkAPI() {
  // 로그인 페이지 요청 - Response body length is 42952 and Doc title is '로그인 | 임직원을 위한 복리후생관'(euc-kr)
  let loginPageResponse = http.get(properties.LOGIN_PAGE_URL);
  check(loginPageResponse, { 'HTTP status code check - Login page response status is 200': (loginPageResponse) => loginPageResponse.status == 200, });

  let loginPageBodyCheck = loginPageResponse.body != null && loginPageResponse.body.length > 40000 && loginPageResponse.html().find('title').html() == '�α��� | �������� ���� �����Ļ���';
  check(loginPageBodyCheck, { 'Response body check - Login page loaded successfully': () => loginPageBodyCheck, });

  console.log((loginPageBodyCheck ? 'Login page load success!' : 'Login page load fail...') + ' -------- user' + `${__VU}`);

  if (loginPageResponse.status == 200 && loginPageBodyCheck) {
    let FORM_DATA = {
      'loginSearchBean.userId': properties.USER_ID,
      'loginSearchBean.password': encoding.b64encode(properties.PASSWORD),
      'loginSearchBean.loginType': 'S',
      'loginSearchBean.loginKind': '',
      'loginSearchBean.loginKindSub': ''
    };

    // 로그인 및 메인 페이지 요청 - Response body length is 4292777 and Doc title is '▒▒ 임직원을 위한 복리후생관 ▒▒'(euc-kr)
    let loginResponse = http.post(properties.LOGIN_ACTION_API, FORM_DATA);
    check(loginResponse, { 'HTTP status code check - Login API response status is 200': (loginResponse) => loginResponse.status == 200, });

    let mainPageBodyCheck = loginResponse.body != null && loginResponse.body.length > 400000 && loginResponse.html().find('title').html() == '�Ƣ� �������� ���� �����Ļ��� �Ƣ�';
    check(mainPageBodyCheck, { 'Response body check - Main page loaded successfully': () => mainPageBodyCheck, });

    console.log((mainPageBodyCheck ? 'Main  page load success!' : 'Main  page load fail...') + ' -------- user' + `${__VU}`);
  }
}

export async function checkBrowser() {
  const page = browser.newPage();

  try {
    // 로그인 페이지 요청
    await page.goto(properties.LOGIN_PAGE_URL);

    page.locator('input[name="loginSearchBean.userId1"]').type(properties.USER_ID);
    page.locator('input[name="loginSearchBean.password1"]').type(properties.PASSWORD);

    check(page, { 'Login page title check --- 로그인 | 임직원을 위한 복리후생관': (page) => page.locator('title').textContent() == '로그인 | 임직원을 위한 복리후생관', });
    page.screenshot({ path: `screenshots/LoginPage_${getTimeStamp()}_${__VU}.png` });

    await Promise.all([
      // 로그인 및 메인 페이지 요청
      page.keyboard.press('Enter'),
      // page.evaluate(() => { jsLogin(); }),
      page.waitForNavigation({ waitUntil: 'domcontentloaded' })
    ]);

    check(page, { 'Main page title check --- ▒▒ 임직원을 위한 복리후생관 ▒▒': (page) => page.locator('title').textContent() == '▒▒ 임직원을 위한 복리후생관 ▒▒', });
    page.screenshot({ path: `screenshots/MainPage_${getTimeStamp()}_${__VU}.png` });

  } finally {
    page.close();
  }
}

function getTimeStamp() {
  let serverDate = new Date();
  let localDate = new Date(serverDate.getTime() + (9 * 60 * 60 * 1000));
  return localDate.toISOString().replace(/:/g, "-");
}
