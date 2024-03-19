import http from "k6/http";
import { check } from "k6";
import encoding from "k6/encoding";
import { parseHTML } from 'k6/html';

const properties = JSON.parse(open("./properties.json"));

export const options = {
  vus: 1,
  iterations: 1,
};

/**
 * setup()은 테스트 수행 전 필요한 요청을 미리 수행합니다. (세션 및 유저 정보 쿠키 추출)
 * 1. 복지관 로그인 - loginAction.ez
 * 2. 복지샵 요청 - asp/asp_main.ez?cspCd=ezshop&goUrl=/shopNew/main/mainFstDepth.ez
 * 3. 복지샵 로그인 - web/login/loginForm.ez
 * 4. 복지샵 페이지 - shopNew/main/mainFstDepth.ez
 */
export function setup() {
  let CUSER_FORM_DATA = {
    "loginSearchBean.userId": properties.USER_ID,
    "loginSearchBean.password": encoding.b64encode(properties.PASSWORD),
    "loginSearchBean.loginType": "S",
    "loginSearchBean.loginKind": "",
    "loginSearchBean.loginKindSub": "",
  };

  // 복지관 로그인
  let cuserLoginRes = http.post(properties.LOGIN_ACTION_API, CUSER_FORM_DATA, { redirects: 0 });
  // 복지샵 ASP 요청
  let options = {
    cookies: {
      __KSMSID_USER__: cuserLoginRes.cookies.__KSMSID_USER__[0].value,
    },
  };

  let shopAspRes = http.get(properties.SHOP_ASP_URL, options);
  let formTag = parseHTML(shopAspRes.body).find('#divLink');
  
  /**
   * shopAspRes 페이지 Form 태그 내 34개의 input 태그 값을 추출합니다.
   * 추출된 값은 복지샵의 loginForm.ez 요청 시 Form
   */
  let SHOP_FORM_DATA = {};

  for (let i = 0; i < formTag.children().size(); i++) {
      let key = properties.SHOP_ASP_INPUT_NAME[i];
      let value = formTag.children().get(i).value();
      SHOP_FORM_DATA[key] = value;
  }

  for (let key in SHOP_FORM_DATA) { console.log(`${key} : ${SHOP_FORM_DATA[key]}`)}

  return {
    SESSION_COOKIE_VALUE: cuserLoginRes.cookies.__KSMSID_USER__[0].value,
    EZWEL_USER_KEY: cuserLoginRes.cookies.EZWEL_USER_KEY[0].value,
    EZWEL_CLIENT_CD: cuserLoginRes.cookies.EZWEL_CLIENT_CD[0].vcdalue,
  };
}

export default function (COOKIES) {

  // 간편포인트조회 (form 데이터 및 세션 쿠키 포함 POST 요청)
  let FORM_DATA = {
    clientCd: COOKIES.EZWEL_CLIENT_CD,
    userKey: COOKIES.EZWEL_USER_KEY,
    pageType: "BS",
    jsonType: "jsonp",
  };

  let options = {
    cookies: {
      __KSMSID_USER__: COOKIES.SESSION_COOKIE_VALUE,
    },
  };

  let res = http.post(properties.POINT_CALL_AJAX, FORM_DATA, options);
  console.log(res.body);
  

  check(res, { 
    'HTTP status code check - 간편포인트조회 AJAX status is 200': (r) => r.status == 200, 
    'Response body JSON data check - userName is 테크부문': (r) => JSON.parse(r.body.substring(1, res.body.length - 1)).userName == '테크부문',
  });
}
