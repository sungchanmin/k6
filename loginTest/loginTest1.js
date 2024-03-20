import http from "k6/http";
import { check } from "k6";
import encoding from 'k6/encoding';

const properties = JSON.parse(open('./properties.json'));

export const options = {
  stages: [
    { duration: '5s', target: 1 },
    { duration: '5s', target: 2 },
    { duratino: '5s', target: 0 },
  ]
};

export default function () {
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
