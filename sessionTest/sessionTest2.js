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
 * setup()은 테스트 수행 전 필요한 요청을 미리 수행합니다.
 * 응답으로 받은 쿠키 정보를 COOKIES 객체에 보관합니다.
 */
export function setup() {
  let COOKIES = {};

  let CUSER_FORM_DATA = {
    "loginSearchBean.userId": properties.USER_ID,
    "loginSearchBean.password": encoding.b64encode(properties.PASSWORD),
    "loginSearchBean.loginType": "S",
    "loginSearchBean.loginKind": "",
    "loginSearchBean.loginKindSub": "",
  };

  // 복지관 로그인
  let cuserLoginRes = http.post(properties.LOGIN_ACTION_API, CUSER_FORM_DATA, { redirects: 0 });
  // 응답 쿠키 추출
  for (let key in cuserLoginRes.cookies) {
    COOKIES[key] = cuserLoginRes.cookies[key][0].value;
  }

  
  let options = {
    cookies: {
      __KSMSID_USER__: COOKIES.__KSMSID_USER__,
    },
  };
  // 복지샵 ASP 요청
  let shopAspRes = http.get(properties.SHOP_ASP_URL, options);
  let formTag = parseHTML(shopAspRes.body).find('#divLink');
  
  /**
   * shopAspRes 페이지의 Form 태그에 포함된 34개 input 태그 값을 추출합니다.
   * 추출된 form-data를 이용하여 복지샵에 loginForm.ez 요청합니다.
   * (개선 필요 : Doc의 form을 직접 submit하는 방식으로 보다 유연한 테스트 구성)
   */
  let SHOP_FORM_DATA = {};

  for (let i = 0; i < formTag.children().size(); i++) {
      let key = properties.SHOP_ASP_INPUT_NAME[i];
      let value = formTag.children().get(i).value();
      SHOP_FORM_DATA[key] = value;
  }

  let shopLoginRes = http.post(properties.SHOP_LOGIN_ACTION_API, SHOP_FORM_DATA, { redirects: 0 });
  // 응답 쿠키 추출
  for (let key in shopLoginRes.cookies) {
    COOKIES[key] = shopLoginRes.cookies[key][0].value;
  }
  
  // for (let key in COOKIES) {
  //   console.log(`${key}  -  ${COOKIES[key]}`) 
  // }
  
  return COOKIES;
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
      __KSMSID_USER__: COOKIES.__KSMSID_USER__,
    },
  };

  let res = http.post(properties.POINT_CALL_AJAX, FORM_DATA, options);
  console.log(res.body);
  

  check(res, { 
    'HTTP status code check - 간편포인트조회 AJAX status is 200': (r) => r.status == 200, 
    'Response body JSON data check - userName is 테크부문': (r) => JSON.parse(r.body.substring(1, res.body.length - 1)).userName == '테크부문',
  });
}
