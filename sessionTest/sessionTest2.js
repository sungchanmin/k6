import http from "k6/http";
import { check } from "k6";
import encoding from "k6/encoding";
import { parseHTML } from 'k6/html';

const properties = JSON.parse(open("./properties.json"));

export const options = {
  vus: 1,
  iterations: 1,
};

// 테스트 수행 전 필요한 쿠키 정보 보관(복지관, 복지샵)
export function setup() {
  let COOKIES = {};
  let options = { cookies: COOKIES, };
  let CUSER_FORM_DATA = {
    "loginSearchBean.userId": properties.USER_ID,
    "loginSearchBean.password": encoding.b64encode(properties.PASSWORD),
    "loginSearchBean.loginType": "S",
    "loginSearchBean.loginKind": "",
    "loginSearchBean.loginKindSub": "",
  };

  // 복지관 로그인 및 쿠키 보관
  let cuserLoginRes = http.post(properties.CUSER_LOGIN_ACTION_API, CUSER_FORM_DATA, { redirects: 0 });
  for (let key in cuserLoginRes.cookies) { COOKIES[key] = cuserLoginRes.cookies[key][0].value; }
  
  // 복지샵 ASP 요청 및 Form 태그에 포함된 34개 input 태그 값 추출
  let shopAspRes = http.get(properties.SHOP_ASP_URL, options);
  let formTag = parseHTML(shopAspRes.body).find('#divLink');
  let SHOP_FORM_DATA = {};
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
  let options = { cookies: COOKIES, };
  let CUSER_POINT_CALL_FORM_DATA = {
    clientCd: COOKIES.EZWEL_CLIENT_CD,
    userKey: COOKIES.EZWEL_USER_KEY,
    pageType: "BS",
    jsonType: "jsonp",
  };

  // 간편포인트조회 (form 데이터 및 세션 쿠키 포함 POST 요청) 및 검증
  let cuserPointCallRes = http.post(properties.CUSER_POINT_CALL_AJAX, CUSER_POINT_CALL_FORM_DATA, options);
  check(cuserPointCallRes, { 
    'HTTP status code check - 간편포인트조회 AJAX status is 200': (r) => r.status == 200, 
    'Response body JSON data check - userName is 테크부문': (r) => JSON.parse(r.body.substring(1, cuserPointCallRes.body.length - 1)).userName == '테크부문',
  });

  // 복지샵 메인페이지 요청 및 검증 - Response body length is 81822 and Doc title is '복지SHOP'(euc-kr)
  let shopMainPageRes = http.get(properties.SHOP_MAIN_PAGE_URL, options);
  check(shopMainPageRes, { 
    'HTTP status code check - SHOP main page response status is 200': (r) => r.status == 200,
    'Response body check - SHOP Main page loaded successfully': (r) => r.body.length > 80000 && r.html().find('title').html() == '����SHOP',
  });
}