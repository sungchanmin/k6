import http from "k6/http";
import { check } from "k6";
import encoding from "k6/encoding";
import { parseHTML } from 'k6/html';
import { Trend } from 'k6/metrics';

const properties = JSON.parse(open("./properties.json"));
const serverWaitingTime = new Trend('waiting_time');

export const options = {
  vus: 10,
  iterations: 10,
};

// 테스트 수행 전 필요한 쿠키 정보 보관(복지관, 복지샵)
export function setup() {
  const COOKIES = {};
  const HEADER = { cookies: COOKIES, };
  const CUSER_FORM_DATA = {
    "loginSearchBean.userId": properties.USER_ID,
    "loginSearchBean.password": encoding.b64encode(properties.PASSWORD),
    "loginSearchBean.loginType": "S",
    "loginSearchBean.loginKind": "",
    "loginSearchBean.loginKindSub": "",
  };
  const SHOP_FORM_DATA = {};

  // 복지관 로그인 및 쿠키 보관
  let cuserLoginRes = http.post(properties.CUSER_LOGIN_ACTION_API, CUSER_FORM_DATA, { redirects: 0 });
  for (let key in cuserLoginRes.cookies) { COOKIES[key] = cuserLoginRes.cookies[key][0].value; }
  
  // 복지샵 ASP 요청 및 Form 태그에 포함된 34개 input 태그 값 추출
  let shopAspRes = http.get(properties.SHOP_ASP_URL, HEADER);
  let formTag = parseHTML(shopAspRes.body).find('#divLink');
  
  for (let i = 0; i < formTag.children().size(); i++) {
      let key = properties.SHOP_ASP_INPUT_NAME[i];
      let value = formTag.children().get(i).value();
      SHOP_FORM_DATA[key] = value;
  }

  // 복지샵 로그인 및 쿠키 보관
  let shopLoginRes = http.post(properties.SHOP_LOGIN_ACTION_API, SHOP_FORM_DATA, { redirects: 0 });
  for (let key in shopLoginRes.cookies) { COOKIES[key] = shopLoginRes.cookies[key][0].value; }

  return COOKIES;
}

export default function (COOKIES) {
  const HEADERS = { cookies: COOKIES, };
  const CUSER_POINT_CALL_FORM_DATA = {
    clientCd: COOKIES.EZWEL_CLIENT_CD,
    userKey: COOKIES.EZWEL_USER_KEY,
    pageType: "BS",
    jsonType: "jsonp",
  };

  // 간편포인트조회 (form 데이터 및 세션 쿠키 포함 POST 요청) 및 검증
  let cuserPointCallRes = http.post(properties.CUSER_POINT_CALL_AJAX, CUSER_POINT_CALL_FORM_DATA, HEADERS);
  check(cuserPointCallRes, { 
    'HTTP status code check - 간편포인트조회 AJAX status is 200': (r) => r.status == 200, 
    'Response body JSON data check - userName is 테크부문': (r) => r.status == 200 && JSON.parse(r.body.substring(1, cuserPointCallRes.body.length - 1)).userName == '테크부문',
  });

  // 커스텀 측정 항목 - 서버 응답 시간
  serverWaitingTime.add(cuserPointCallRes.timings.waiting);

  // 복지샵 메인페이지 요청 및 검증 - Response body length is 81822 and Doc title is '복지SHOP'(euc-kr)
  let shopMainPageRes = http.get(properties.SHOP_MAIN_PAGE_URL, HEADERS);
  check(shopMainPageRes, { 
    'HTTP status code check - SHOP main page response status is 200': (r) => r.status == 200,
    'Response body check - SHOP Main page loaded successfully': (r) => r.status == 200 && r.body.length > 80000 && r.html().find('title').html() == '����SHOP',
  });
}