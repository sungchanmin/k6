import http from "k6/http";
import { check } from "k6";
import encoding from "k6/encoding";

const properties = JSON.parse(open("./properties.json"));

export const options = {
  vus: 1,
  iterations: 1,
};

/**
 * setup()은 테스트 수행 전 필요한 요청을 미리 수행합니다. (세션 및 유저 정보 쿠키 추출)
 */
export function setup() {
  let FORM_DATA = {
    "loginSearchBean.userId": properties.USER_ID,
    "loginSearchBean.password": encoding.b64encode(properties.PASSWORD),
    "loginSearchBean.loginType": "S",
    "loginSearchBean.loginKind": "",
    "loginSearchBean.loginKindSub": "",
  };

  /**
   * 로그인 요청시 'loginAction.ez'(302) 응답 후 'main.ez?pc'(200)으로 리다이렉션 됩니다.
   * 'res'에는 기본적으로 최종 응답인 'main.ez?pc(200)'이 담기며, 'loginAction.ez'(302) 응답이 필요한 경우 옵션으로 '{redirects: 0}'을 명시하여 받을 수 있습니다.
   * 최초 응답 헤더에 담겨있는 쿠키를 얻기 위해 아래와 같이 처리하였습니다.
   */
  let res = http.post(properties.LOGIN_ACTION_API, FORM_DATA, { redirects: 0 });

  return {
    SESSION_COOKIE_VALUE: res.cookies.__KSMSID_USER__[0].value,
    EZWEL_USER_KEY: res.cookies.EZWEL_USER_KEY[0].value,
    EZWEL_CLIENT_CD: res.cookies.EZWEL_CLIENT_CD[0].vcdalue,
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
